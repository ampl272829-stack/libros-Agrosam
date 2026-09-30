#!/usr/bin/env bash
# ============================================================
#  Instalador de TODO el sistema (Arch Linux + GNOME)
#  "Family friendly": menú guiado, paso a paso, con colores.
#
#  Restaura paquetes, dotfiles, GNOME, extensiones, servicios,
#  scripts, dictado por voz y wallpaper, tal cual estaban.
#
#  Uso:
#     ./instalar-todo.sh            → menú interactivo
#     ./instalar-todo.sh todo       → instalar todo sin preguntar
# ============================================================

set -u

# ---------- colores ----------
VERDE='\033[0;32m'
AMARILLO='\033[1;33m'
AZUL='\033[0;34m'
ROJO='\033[0;31m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

ok()   { echo -e "${VERDE}  ✓ $1${NC}"; }
info() { echo -e "${AZUL}  → $1${NC}"; }
aviso(){ echo -e "${AMARILLO}  ⚠ $1${NC}"; }
err()  { echo -e "${ROJO}  ✗ $1${NC}"; }
titulo(){ echo -e "\n${CYAN}═══════════════════════════════════════════════${NC}"; echo -e "${CYAN}  $1${NC}"; echo -e "${CYAN}═══════════════════════════════════════════════${NC}"; }

# ---------- ubicación del repo (funciona desde ~/dev/config o dev-config/) ----------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PAQ="$SCRIPT_DIR/paquetes"
GNOME="$SCRIPT_DIR/gnome"
SERV="$SCRIPT_DIR/servicios"
SCRIPTS="$SCRIPT_DIR/scripts"
DOT="$SCRIPT_DIR/dotfiles"
WALL="$SCRIPT_DIR/wallpaper"
SYS="$SCRIPT_DIR/system"

# ---------- comprobaciones iniciales ----------
verificar_arch() {
  if ! command -v pacman >/dev/null 2>&1; then
    err "Este respaldo es para Arch Linux (necesita pacman)."
    return 1
  fi
  return 0
}

verificar_root() {
  if [ "$(id -u)" -eq 0 ]; then
    err "No ejecutes este script como root."
    exit 1
  fi
}

detectar_gnome() {
  if [ "$XDG_CURRENT_DESKTOP" = "GNOME" ] || [ -n "${GNOME_DESKTOP_SESSION_ID:-}" ] \
     || command -v gnome-shell >/dev/null 2>&1; then
    return 0
  fi
  aviso "No se detectó GNOME en esta sesión (usas: ${XDG_CURRENT_DESKTOP:-desconocido})."
  echo -n "    ¿Continuar de todos modos? (s/N): "; read -r r
  [ "$r" = "s" ] || [ "$r" = "S" ]
}

preguntar() {
  local msj="$1"
  local r
  echo -n "  $msj (s/N): "; read -r r
  [ "$r" = "s" ] || [ "$r" = "S" ]
}

# ============================================================
#  1. PAQUETES
# ============================================================
instalar_yay() {
  if command -v yay >/dev/null 2>&1; then
    ok "yay ya instalado"
    return 0
  fi
  info "Instalando yay (gestor AUR)..."
  sudo pacman -S --needed --noconfirm base-devel git 2>/dev/null
  local d="/tmp/yay-build"
  rm -rf "$d"
  git clone --depth 1 https://aur.archlinux.org/yay.git "$d" >/dev/null 2>&1
  (cd "$d" && makepkg -si --noconfirm) || { err "No se pudo instalar yay"; return 1; }
  rm -rf "$d"
  ok "yay instalado"
}

instalar_paquetes() {
  titulo "Paso 1 de 8 · Paquetes oficiales + AUR"
  verificar_arch || return 1
  [ -f "$PAQ/paquetes-oficiales.txt" ] || { err "Falta $PAQ/paquetes-oficiales.txt"; return 1; }
  [ -f "$PAQ/paquetes-aur.txt" ] || { err "Falta $PAQ/paquetes-aur.txt"; return 1; }

  local total_official total_aur
  total_official=$(wc -l < "$PAQ/paquetes-oficiales.txt")
  total_aur=$(wc -l < "$PAQ/paquetes-aur.txt")
  info "Se instalarán $total_official paquetes oficiales y $total_aur del AUR."
  preguntar "¿Instalar paquetes oficiales (requiere sudo)?" || { info "Omitido"; return 0; }

  info "Instalando paquetes oficiales..."
  sudo pacman -S --needed --noconfirm - < "$PAQ/paquetes-oficiales.txt" \
    && ok "Paquetes oficiales instalados" || err "Hubo errores (revisa arriba)"

  preguntar "¿Instalar paquetes AUR (instala yay si hace falta)?" || { info "Omitido"; return 0; }
  instalar_yay || return 1
  info "Instalando paquetes AUR..."
  yay -S --needed --noconfirm - < "$PAQ/paquetes-aur.txt" \
    && ok "Paquetes AUR instalados" || err "Hubo errores (revisa arriba)"
}

# ============================================================
#  2. DOTFILES
# ============================================================
instalar_dotfiles() {
  titulo "Paso 2 de 8 · Dotfiles (ghostty, zsh, kitty, btop, zellij...)"
  [ -f "$DOT/install.sh" ] || { err "Falta $DOT/install.sh"; return 1; }
  info "Ejecutando $DOT/install.sh (crea los symlinks, con respaldo automático)"
  bash "$DOT/install.sh"
}

# ============================================================
#  3. GNOME (dconf + atajos)
# ============================================================
instalar_gnome() {
  titulo "Paso 3 de 8 · Configuración de GNOME (dconf)"
  detectar_gnome || return 1
  [ -f "$GNOME/gnome-full.dconf" ] || { err "Falta $GNOME/gnome-full.dconf"; return 1; }

  if preguntar "¿Restaurar TODA la configuración de GNOME (tema, dock, atajos, fondo...)?"; then
    info "Restaurando gnome-full.dconf..."
    if dconf load / < "$GNOME/gnome-full.dconf" 2>/dev/null; then
      ok "Configuración de GNOME restaurada"
    else
      err "El dconf completo falló; reintentando solo escritorio + atajos..."
      dconf load /org/gnome/desktop/ < "$GNOME/desktop.dconf" 2>/dev/null && ok "Escritorio restaurado"
      dconf load /org/gnome/settings-daemon/plugins/media-keys/ < "$GNOME/atajos-teclado.dconf" 2>/dev/null && ok "Atajos restaurados"
    fi
  else
    aviso "Omitido"
  fi
}

# ============================================================
#  4. EXTENSIONES GNOME
# ============================================================
instalar_extensiones() {
  titulo "Paso 4 de 8 · Extensiones de GNOME"
  detectar_gnome || return 1
  [ -f "$GNOME/extensiones-gnome.tgz" ] || { err "Falta $GNOME/extensiones-gnome.tgz"; return 1; }

  local dir="$HOME/.local/share/gnome-shell/extensions"
  mkdir -p "$dir"
  info "Extrayendo extensiones a $dir"
  tar xzf "$GNOME/extensiones-gnome.tgz" -C "$HOME/.local/share/gnome-shell/"
  ok "Extensiones extraídas"

  if [ -f "$GNOME/extensiones-config.dconf" ]; then
    dconf load /org/gnome/shell/extensions/ < "$GNOME/extensiones-config.dconf" 2>/dev/null \
      && ok "Configuración de extensiones restaurada"
  fi

  if [ -f "$GNOME/extensiones-activadas.txt" ]; then
    local lista
    lista=$(cat "$GNOME/extensiones-activadas.txt")
    info "Activando extensiones: $lista"
    gsettings set org.gnome.shell enabled-extensions "$lista" 2>/dev/null \
      && ok "Extensiones activadas" || aviso "No se pudieron activar ahora"
  fi

  aviso "Cierra sesión y vuelve a entrar para que carguen las extensiones."
}

# ============================================================
#  5. SERVICIOS
# ============================================================
instalar_servicios() {
  titulo "Paso 5 de 8 · Servicios systemd"
  local user_dir="$HOME/.config/systemd/user"
  mkdir -p "$user_dir"

  for f in "$SERV"/user-*.service; do
    [ -f "$f" ] || continue
    local nombre
    nombre=$(basename "$f" | sed 's/^user-//')
    cp "$f" "$user_dir/$nombre"
    info "Servicio de usuario: $nombre"
  done
  systemctl --user daemon-reload 2>/dev/null
  systemctl --user enable whisper-server 2>/dev/null && ok "whisper-server habilitado (autoarranque)"
  systemctl --user enable llama-server 2>/dev/null && ok "llama-server habilitado"
  systemctl --user enable openclaw-gateway 2>/dev/null && ok "openclaw-gateway habilitado"

  if [ -f "$SERV/system-ydotool-root.service" ] && preguntar "¿Instalar el servicio del sistema ydotool (requiere sudo, da teclado virtual)?"; then
    sudo cp "$SERV/system-ydotool-root.service" /etc/systemd/system/ydotool-root.service
    sudo systemctl daemon-reload
    sudo systemctl enable ydotool-root
    sudo systemctl start ydotool-root
    ok "ydotool-root activo"
  fi
}

# ============================================================
#  6. SCRIPTS PERSONALES
# ============================================================
instalar_scripts() {
  titulo "Paso 6 de 8 · Scripts personales (~/.local/bin)"
  local bin_dir="$HOME/.local/bin"
  mkdir -p "$bin_dir"
  for f in "$SCRIPTS"/dictar "$SCRIPTS"/dictar-toggle "$SCRIPTS"/dictar-visor.py \
           "$SCRIPTS"/bienvenida.sh "$SCRIPTS"/ghostty-launch.sh "$SCRIPTS"/launch_ghostty.sh; do
    [ -f "$f" ] || continue
    cp "$f" "$bin_dir/$(basename "$f")"
    chmod +x "$bin_dir/$(basename "$f")"
    ok "Instalado $(basename "$f")"
  done
}

# ============================================================
#  7. WHISPER (dictado por voz)
# ============================================================
instalar_whisper() {
  titulo "Paso 7 de 8 · Whisper (modelo del dictado por voz)"
  local wdir="$HOME/.local/share/whisper-models"
  mkdir -p "$wdir"

  # el lanzador que usa el servicio
  cp "$SCRIPT_DIR/whisper-server.sh" "$wdir/whisper-server.sh" 2>/dev/null \
    || [ -f "$wdir/whisper-server.sh" ] || { err "No hay whisper-server.sh en el repo"; return 1; }
  chmod +x "$wdir/whisper-server.sh"

  local modelo="$wdir/ggml-small-q5_1.bin"
  if [ -f "$modelo" ]; then
    ok "Modelo ggml-small-q5_1.bin ya presente ($(du -h "$modelo" | cut -f1))"
  else
    info "Falta el modelo (~190 MB). Opciones:"
    echo "    1) Descargarlo de Hugging Face"
    echo "    2) Copiarlo desde otro equipo (tipo USB)"
    echo -n "    Elige (1/2): "; read -r opcion
    if [ "$opcion" = "2" ]; then
      echo -n "    Ruta del archivo en este equipo (ej: /run/media/usb/ggml-small-q5_1.bin): "; read -r ruta
      [ -f "$ruta" ] && cp "$ruta" "$modelo" && ok "Modelo copiado" || err "No existe esa ruta"
    else
      info "Descargando ggml-small-q5_1.bin (~190 MB)..."
      wget -q --show-progress -O "$modelo" \
        "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small-q5_1.bin" \
        && ok "Modelo descargado" || { err "Descarga fallida"; rm -f "$modelo"; }
    fi
  fi
}

# ============================================================
#  8. WALLPAPER
# ============================================================
instalar_wallpaper() {
  titulo "Paso 8 de 8 · Fondo de pantalla"
  [ -f "$WALL/fondo-actual.jpg" ] || { err "Falta $WALL/fondo-actual.jpg"; return 1; }
  local dest="$HOME/.config/background"
  mkdir -p "$(dirname "$dest")"
  cp "$WALL/fondo-actual.jpg" "$dest"
  gsettings set org.gnome.desktop.background picture-uri "file://$dest" 2>/dev/null
  gsettings set org.gnome.desktop.background picture-uri-dark "file://$dest" 2>/dev/null
  ok "Fondo restaurado"
}

# ============================================================
#  OPCIONAL: archivos de sistema
# ============================================================
instalar_sistema() {
  titulo "Extras · Archivos del sistema (/etc)"
  if preguntar "¿Copiar fstab, grub, mkinitcpio, etc.? (SOLO si el disco/CPU son iguales, si no, romperá el arranque)"; then
    for f in "$SYS"/*; do
      [ -f "$f" ] || continue
      local origen="/etc/$(basename "$f")"
      sudo cp "$f" "$origen"
      ok "Restaurado /etc/$(basename "$f")"
    done
    aviso "Regenera el arranque con: sudo grub-mkconfig -o /boot/grub/grub.cfg"
  fi
}

# ============================================================
#  MENÚ PRINCIPAL
# ============================================================
menu() {
  while true; do
    titulo "Instalador completo del sistema"
    echo "   1) Paquetes oficiales + AUR"
    echo "   2) Dotfiles (terminal, zsh, ghostty...)"
    echo "   3) Configuración GNOME (dconf)"
    echo "   4) Extensiones GNOME"
    echo "   5) Servicios systemd"
    echo "   6) Scripts personales"
    echo "   7) Whisper (dictado por voz)"
    echo "   8) Fondo de pantalla"
    echo "   9) Archivos de sistema (/etc) [avanzado]"
    echo "   0) INSTALAR TODO"
    echo "   q) Salir"
    echo -n "  Elige una opción: "; read -r opcion
    case "$opcion" in
      1) instalar_paquetes ;;
      2) instalar_dotfiles ;;
      3) instalar_gnome ;;
      4) instalar_extensiones ;;
      5) instalar_servicios ;;
      6) instalar_scripts ;;
      7) instalar_whisper ;;
      8) instalar_wallpaper ;;
      9) instalar_sistema ;;
      0) todo ;;
      q|Q) echo "¡Hasta luego!"; exit 0 ;;
      *) err "Opción inválida" ;;
    esac
  done
}

todo() {
  titulo "Instalación COMPLETA"
  instalar_paquetes
  instalar_dotfiles
  instalar_gnome
  instalar_extensiones
  instalar_servicios
  instalar_scripts
  instalar_whisper
  instalar_wallpaper
  echo -e "\n${VERDE}═══════════════════════════════════════════════${NC}"
  echo -e "${VERDE}  🎉 Instalación completada.${NC}"
  echo -e "${VERDE}  Reinicia la sesión y disfruta tu sistema.${NC}"
  echo -e "${VERDE}═══════════════════════════════════════════════${NC}"
}

# ============================================================
#  ENTRADA
# ============================================================
main() {
  verificar_root
  if [ "${1:-}" = "todo" ]; then
    todo
  else
    menu
  fi
}

main "$@"
