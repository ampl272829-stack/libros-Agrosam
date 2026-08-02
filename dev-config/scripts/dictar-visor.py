#!/usr/bin/env python3
# Visor de dictado en vivo: mientras hablas, escribe por frases (detecta pausas).
# Graba con ffmpeg (PCM s16le), transcribe con whisper-server (modelo siempre cargado)
# y escribe con ydotool donde esté el cursor.

import os
import queue
import signal
import struct
import subprocess
import sys
import threading
import time
import wave

import gi
gi.require_version('Gtk', '3.0')
from gi.repository import Gtk, Gdk, GLib

DIR = "/tmp/dictar"
LOCK = DIR + "/grabando.pid"
VISOR_PID = DIR + "/visor.pid"
SOCKET = os.environ.get("YDOTOOL_SOCKET", "/tmp/.ydotool_socket")
SERVER = "http://127.0.0.1:4321/inference"
SOURCE = os.environ.get("DICTAR_SOURCE", "default")
TMP = DIR + "/frase_tmp.wav"
LOGF = DIR + "/visor.log"

RATE = 16000
UMBRAL = 400          # RMS por encima del cual hay voz
PAUSA_CIERRE = 0.7    # segundos de silencio para cerrar una frase
PAD_FINAL = 0.15      # segundos extra al final de la frase

FONDO = "#2b2b2b"
TEXTO = "#d4d4d4"
GRIS = "#9e9e9e"
DORADO = "#d4af37"
DORADO_CLARO = "#e6c55a"


def rms(bytes_audio):
    if len(bytes_audio) < 2:
        return 0.0
    n = len(bytes_audio) // 2
    s = 0
    for i in range(n):
        v = struct.unpack_from('<h', bytes_audio, i * 2)[0]
        s += v * v
    return (s / n) ** 0.5


def log(*args):
    try:
        with open(LOGF, "a") as f:
            f.write("[%s] %s\n" % (time.strftime("%H:%M:%S"), " ".join(map(str, args))))
    except Exception:
        pass


def transcribir(wav_path):
    try:
        out = subprocess.run(
            ["curl", "-s", "--max-time", "60", "-X", "POST", SERVER,
             "-F", "file=@%s;type=audio/wav" % wav_path, "-F", "language=es"],
            capture_output=True, text=True)
        import json
        texto = json.loads(out.stdout).get("text", "").strip()
        log("transcrito:", repr(texto), "| curl_rc:", out.returncode)
        return texto
    except Exception as e:
        log("ERROR transcribir:", e)
        return ""


def escribir(texto):
    if not texto:
        return
    # quitar saltos de línea (whisper los inserta entre segmentos);
    # ydotool los interpretaría como Enter y enviaría el texto en bloques
    texto_limpio = " ".join(texto.split())
    env = dict(os.environ)
    env["YDOTOOL_SOCKET"] = SOCKET
    r = subprocess.run(["ydotool", "type", texto_limpio], env=env)
    log("ydotool rc:", r.returncode)

class Visor(Gtk.Window):
    def __init__(self):
        Gtk.Window.__init__(self, title="Dictado")
        self.set_decorated(False)
        self.set_resizable(True)
        self.set_default_size(540, 300)
        self.set_keep_above(True)
        self.set_skip_taskbar_hint(True)
        self.set_skip_pager_hint(True)
        self.set_accept_focus(False)
        self.set_position(Gtk.WindowPosition.CENTER)
        self.set_type_hint(Gdk.WindowTypeHint.UTILITY)

        # estado de dictado
        self.pcm = bytearray()          # audio crudo acumulado (s16le)
        self.ini_frase = 0              # inicio (bytes) de la frase actual
        self.hay_voz = False
        self.ult_audio = 0              # último índice (bytes) con voz
        self.ult_voz_t = 0.0            # timestamp de la última voz detectada
        self.cola = queue.Queue()       # frases pendientes de transcribir
        self.thread_transcriptor = None
        self.texto = ""                 # texto transcrito acumulado (no se envía hasta cerrar)
        self.terminado = False
        self.ffmpeg = None
        self.pausado = False
        self.n_frases = 0
        self.inicio = time.time()
        self.n = 0

        log("VISOR INICIADO pid", os.getpid())

        self._estilo()
        self._construir()
        self._arrancar_ffmpeg()
        self._arrancar_transcriptor()
        GLib.timeout_add(100, self._vigilar)
        GLib.timeout_add(500, self._tick)

        try:
            with open(VISOR_PID, "w") as f:
                f.write(str(os.getpid()))
        except Exception:
            pass
        if self.ffmpeg:
            try:
                with open(LOCK, "w") as f:
                    f.write(str(self.ffmpeg.pid))
            except Exception:
                pass
        signal.signal(signal.SIGUSR1, lambda *_: GLib.idle_add(self.terminar, None))

    # ---------- interfaz ----------
    def _estilo(self):
        css = b"""
        window { background-color: #2b2b2b; }
        #titulo { color: #d4af37; font-size: 13px; font-weight: 600; }
        #estado { color: #9e9e9e; font-size: 12px; }
        #tiempo { color: #d4d4d4; font-family: 'DejaVu Sans Mono', monospace; font-size: 13px; }
        #punto { color: #e05555; font-size: 12px; }
        #visor-texto { background-color: #1a1a1a; color: #f0f0f0; }
        textview { background-color: #1a1a1a; }
        textview text { color: #f0f0f0; background-color: #1a1a1a;
                       font-size: 14px; font-family: 'DejaVu Sans', sans-serif;
                       padding: 10px; }
        textview.view { border: 1px solid #4a4a4a; border-radius: 6px; }
        button { background: #3a3a3a; color: #d4d4d4; border: 1px solid #4a4a4a; border-radius: 7px;
                 padding: 7px 13px; font-size: 12px; font-weight: 500; }
        button:hover { background: #444444; border-color: #5a5a5a; }
        button:active { background: #333333; }
        #btn-pausa.pausado { color: #d4af37; border-color: #5c4f2b; }
        #btn-fin { background: #d4af37; color: #2b2b2b; border: none; font-weight: 600; }
        #btn-fin:hover { background: #e6c55a; }
        #btn-fin:disabled { background: #555044; color: #2b2b2b; }
        """
        prov = Gtk.CssProvider()
        prov.load_from_data(css)
        Gtk.StyleContext.add_provider_for_screen(Gdk.Screen.get_default(), prov,
                                                 Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION)

    def _construir(self):
        self.titulo = Gtk.Label(label="M&S Dictado")
        self.titulo.set_name("titulo")
        self.titulo.set_xalign(0)

        self.fila_estado = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=6)
        self.punto = Gtk.Label(label="●")
        self.punto.set_name("punto")
        self.estado = Gtk.Label(label="Habla con normalidad...")
        self.estado.set_name("estado")
        self.estado.set_xalign(0)
        self.tiempo = Gtk.Label(label="00:00")
        self.tiempo.set_name("tiempo")
        self.fila_estado.pack_start(self.punto, False, False, 0)
        self.fila_estado.pack_start(self.estado, False, False, 0)
        self.fila_estado.pack_start(self.tiempo, False, False, 0)

        self.btn_pausa = Gtk.Button(label="⏸  Pausar")
        self.btn_pausa.set_name("btn-pausa")
        self.btn_pausa.connect("clicked", self.alternar_pausa)
        self.btn_borrar = Gtk.Button(label="🗑  Borrar")
        self.btn_borrar.set_name("btn-pausa")
        self.btn_borrar.connect("clicked", self.borrar_texto)
        self.btn_fin = Gtk.Button(label="✓  Enviar")
        self.btn_fin.set_name("btn-fin")
        self.btn_fin.connect("clicked", self.terminar)

        fila_botones = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=8)
        fila_botones.pack_start(self.btn_pausa, False, False, 0)
        fila_botones.pack_start(self.btn_borrar, False, False, 0)
        fila_botones.pack_start(self.btn_fin, True, True, 0)

        # área de texto con el dictado acumulado
        self.visor_scroll = Gtk.ScrolledWindow()
        self.visor_scroll.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC)
        self.visor_scroll.set_min_content_height(120)
        self.visor_texto = Gtk.TextView()
        self.visor_texto.set_wrap_mode(Gtk.WrapMode.WORD_CHAR)
        self.visor_texto.set_editable(True)
        self.visor_texto.set_cursor_visible(True)
        self.visor_texto.set_name("visor-texto")
        self.visor_scroll.add(self.visor_texto)

        col = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=8)
        col.set_margin_top(14)
        col.set_margin_bottom(14)
        col.set_margin_left(18)
        col.set_margin_right(18)
        col.pack_start(self.titulo, False, False, 0)
        col.pack_start(self.fila_estado, False, False, 0)
        col.pack_start(self.visor_scroll, True, True, 0)
        col.pack_start(fila_botones, False, False, 0)

        self.add(col)
        self.show_all()

        # garantizar que nunca tome el foco del teclado
        def _sin_foco(*_):
            w = self.get_window()
            if w is not None:
                w.set_focus_on_map(False)
                w.set_accept_focus(False)
            log("foco del visor:", self.has_toplevel_focus())
        GLib.timeout_add(100, _sin_foco)
        GLib.timeout_add(800, _sin_foco)

    # ---------- audio ----------
    def _arrancar_ffmpeg(self):
        self.ffmpeg = subprocess.Popen(
            ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
             "-f", "pulse", "-i", SOURCE, "-ar", str(RATE), "-ac", "1",
             "-f", "s16le", "pipe:1"],
            stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
        threading.Thread(target=self._leer_audio, daemon=True).start()

    def _leer_audio(self):
        while not self.terminado and self.ffmpeg and self.ffmpeg.stdout:
            chunk = self.ffmpeg.stdout.read(4096)
            if not chunk:
                break
            if not self.pausado:
                self.pcm.extend(chunk)

    def _arrancar_transcriptor(self):
        def loop():
            while True:
                item = self.cola.get()
                if item is None:
                    break
                log("transcribiendo", item)
                texto = transcribir(item)
                if texto:
                    log("ACUMULANDO:", repr(texto))
                    # acumular el texto en el visor (sin enviarlo al cursor)
                    GLib.idle_add(self._acumular_texto, texto)
                    self.n_frases += 1
                else:
                    log("texto vacío, no se acumula")
                try:
                    os.remove(item)
                except Exception:
                    pass
        self.thread_transcriptor = threading.Thread(target=loop, daemon=True)
        self.thread_transcriptor.start()

    def _acumular_texto(self, texto):
        texto_plano = " ".join(texto.split())
        self.texto = (self.texto + " " + texto_plano).strip()
        self.visor_texto.get_buffer().set_text(self.texto)
        adj = self.visor_scroll.get_vadjustment()
        if adj:
            adj.set_value(adj.get_upper())
        self.estado.set_text("✓ " + texto_plano[:28])
        return False

    def _vigilar(self):
        if self.terminado:
            return False
        actual = len(self.pcm)
        ini = max(0, actual - int(RATE * 2 * 0.4))  # ventana de 400 ms al final
        ventana = bytes(self.pcm[ini:actual])
        nivel = rms(ventana) if ventana else 0

        if nivel > UMBRAL:
            self.hay_voz = True
            self.ult_audio = actual
            self.ult_voz_t = time.time()
            return True

        if self.hay_voz and (time.time() - self.ult_voz_t) >= PAUSA_CIERRE:
            log("frase cerrada", actual, "bytes, voz:", self.hay_voz)
            self._cerrar_frase()
            self.hay_voz = False
        return True

    def _cerrar_frase(self):
        fin = self.ult_audio + int(RATE * 2 * PAD_FINAL)
        inicio = self.ini_frase
        if inicio >= fin:
            self.ini_frase = fin
            return
        datos = bytes(self.pcm[inicio:fin])
        self.ini_frase = fin
        if len(datos) < int(RATE * 2 * 0.25):  # menos de 250 ms -> ignorar
            log("frase demasiado corta, ignorada")
            return
        tmp = DIR + "/frase_%d.wav" % int(time.time() * 1000)
        try:
            with wave.open(tmp, "wb") as w:
                w.setnchannels(1)
                w.setsampwidth(2)
                w.setframerate(RATE)
                w.writeframes(datos)
            log("frase guardada en", tmp, len(datos), "bytes")
            self.cola.put(tmp)
        except Exception as e:
            log("ERROR guardando frase:", e)

    # ---------- control ----------
    def borrar_texto(self, _b=None):
        self.texto = ""
        self.visor_texto.get_buffer().set_text("")
        self.estado.set_text("Texto borrado")
        log("texto borrado por el usuario")

    def alternar_pausa(self, _b=None):
        if self.pausado:
            self.pausado = False
            self.btn_pausa.set_label("⏸  Pausar")
            self.btn_pausa.set_name("btn-pausa")
            self.estado.set_text("Habla con normalidad...")
        else:
            self.pausado = True
            self.btn_pausa.set_label("▶  Reanudar")
            self.btn_pausa.set_name("btn-pausa pausado")
            self.estado.set_text("Pausado")
        self.btn_pausa.get_style_context().invalidate()

    def terminar(self, _b=None):
        if self.terminado:
            return
        self.terminado = True
        self.btn_fin.set_sensitive(False)
        self.btn_pausa.set_sensitive(False)
        self.estado.set_text("Terminando...")
        self.titulo.set_text("M&S Dictado · finalizando")
        self.hide()
        threading.Thread(target=self._cierre, daemon=True).start()

    def _cierre(self):
        time.sleep(0.2)
        # cerrar frase pendiente
        if self.hay_voz:
            self._cerrar_frase()
        # matar ffmpeg
        if self.ffmpeg:
            try:
                self.ffmpeg.send_signal(signal.SIGINT)
                try:
                    self.ffmpeg.wait(timeout=3)
                except Exception:
                    self.ffmpeg.kill()
            except Exception:
                pass
        # esperar a que el transcriptor vacíe la cola (incluye la frase en curso)
        self.cola.put(None)
        if self.thread_transcriptor:
            self.thread_transcriptor.join(timeout=120)
        # leer el texto que quedó en el visor (puede haber sido editado/borrado por el usuario)
        self.texto = self.visor_texto.get_buffer().get_text(
            self.visor_texto.get_buffer().get_start_iter(),
            self.visor_texto.get_buffer().get_end_iter(), False).strip()
        # escribir TODO el texto acumulado de una vez en el cursor
        if self.texto:
            # ocultar el visor para devolver el foco a la ventana del usuario
            # (el visor roba el foco en Wayland; si no, ydotool escribiría dentro del visor)
            GLib.idle_add(lambda: self.hide())
            time.sleep(0.35)
            log("ENVIANDO todo:", repr(self.texto))
            escribir(self.texto)
        for p in (LOCK, VISOR_PID, TMP):
            try:
                os.remove(p)
            except Exception:
                pass
        Gtk.main_quit()

    def _tick(self):
        if self.terminado:
            return False
        self.n += 1
        seg = int(time.time() - self.inicio)
        if self.pausado:
            self.punto.set_opacity(0.3)
        else:
            self.punto.set_opacity(1.0 if self.n % 2 else 0.3)
        self.tiempo.set_text("%02d:%02d" % (seg // 60, seg % 60))
        return True


def main():
    if len(sys.argv) > 1 and sys.argv[1] == "stop":
        try:
            with open(VISOR_PID) as f:
                os.kill(int(f.read().strip()), signal.SIGUSR1)
        except Exception:
            pass
        return

    # Barrera anti-duplicados: si ya hay otro visor en marcha, salir.
    try:
        out = subprocess.run(["pgrep", "-f", "dictar-visor.py"],
                             capture_output=True, text=True)
        for pid in out.stdout.split():
            p = pid.strip()
            if p and p != str(os.getpid()) and p != str(os.getppid()):
                log("visor duplicado detectado, saliendo (otro pid", p + ")")
                return
    except Exception:
        pass

    Visor()
    Gtk.main()


if __name__ == "__main__":
    main()
