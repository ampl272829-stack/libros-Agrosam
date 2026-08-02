# Configuración de mi sistema (Arch Linux)

Copia de seguridad completa de mi sistema para poder reinstalar todo desde cero
y que quede **exactamente como ahora**: escritorio, terminal, extensiones, fondo
de pantalla, servicios y comandos.

## Estructura

```
dev/config/
├── dotfiles/          → Repo de dotfiles (ghostty, kitty, zsh, btop, zellij...)
│   └── install.sh     → Crea los symlinks (ejecutar tras restaurar)
├── gnome/             → Configuración de GNOME
│   ├── gnome-full.dconf        → TODO el dconf (export completo)
│   ├── desktop.dconf           → Solo escritorio (fondo, temas, dock)
│   ├── atajos-teclado.dconf    → Atajos personalizados (Ctrl+Shift+G, etc.)
│   ├── extensiones-activadas.txt → Lista de extensiones habilitadas
│   ├── extensiones-config.dconf → Configuración de cada extensión
│   └── extensiones-gnome.tgz    → Las extensiones en sí (para instalar offline)
├── paquetes/          → Listas de paquetes para reinstalar
│   ├── paquetes-oficiales.txt  → 136 paquetes explícitos (pacman)
│   ├── paquetes-aur.txt        → 6 paquetes AUR
│   └── todos-instalados.txt    → Los 1091 paquetes instalados (pacman -Q)
├── servicios/         → Servicios systemd personalizados
│   ├── user-llama-server.service
│   ├── user-openclaw-gateway.service
│   ├── user-whisper-server.service   → Dictado por voz (puerto 4321)
│   └── system-ydotool-root.service   → ydotool (escribe teclado virtual)
├── system/            → Configuración base del sistema
│   ├── fstab, hostname, locale.conf, vconsole.conf
│   ├── grub, mkinitcpio.conf
├── wallpaper/         → Fondo de pantalla y fotos guardadas
│   └── fondo-actual.jpg → El que está en uso ahora
└── scripts/           → Scripts personalizados
    ├── dictar, dictar-toggle, dictar-visor.py → Sistema de dictado por voz
    └── ghostty-launch.sh, bienvenida.sh
```

## Cómo restaurar (en un Arch recién instalado)

### 1. Paquetes

```bash
# Paquetes oficiales
sudo pacman -S --needed - < paquetes/paquetes-oficiales.txt

# Paquetes AUR (necesitas yay o paru)
yay -S --needed - < paquetes/paquetes-aur.txt
```

### 2. Dotfiles (terminal, ghostty, kitty, zsh)

```bash
git clone <tu-repo> ~/dev/config
cd ~/dev/config/dotfiles
./install.sh
```

Esto crea los symlinks de ghostty, kitty, btop, zellij y zsh en `~/.config`.

### 3. GNOME (escritorio, extensiones, fondo, atajos)

```bash
# Restaurar todo el dconf (temas, dock, fondo, atajos, extensiones...)
dconf load / < gnome/gnome-full.dconf

# Fondo de pantalla
cp wallpaper/fondo-actual.jpg ~/.config/background

# Extensiones (instalar offline si hace falta)
mkdir -p ~/.local/share/gnome-shell/extensions
tar xzf gnome/extensiones-gnome.tgz -C ~/.local/share/gnome-shell/

# Desloguear y volver a entrar para que carguen las extensiones
```

### 4. Servicios

```bash
# Servicios de usuario
cp servicios/user-*.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now llama-server openclaw-gateway whisper-server

# Servicio del sistema (ydotool)
sudo cp servicios/system-ydotool-root.service /etc/systemd/system/
sudo systemctl enable --now ydotool-root
```

### 5. Scripts

```bash
cp scripts/dictar scripts/dictar-toggle scripts/dictar-visor.py ~/.local/bin/
chmod +x ~/.local/bin/dictar*
```

### 6. Whisper (modelo del dictado)

```bash
mkdir -p ~/.local/share/whisper-models
# Copiar ggml-small-q5_1.bin (182M) desde el sistema original
cp <origen>/whisper-models/ggml-small-q5_1.bin ~/.local/share/whisper-models/
```

## Notas

- El dictado por voz usa: ffmpeg (grabar) + whisper-server (transcribir en el
  puerto 4321) + ydotool (escribir). El atajo es `Ctrl+Shift+G`.
- El modelo de whisper es `ggml-small-q5_1.bin` (el `ggml-tiny` cambia palabras).
- El `gnome-full.dconf` contiene TODO; si algo se corrompe al importar, usar
  solo `desktop.dconf` y `atajos-teclado.dconf`.

## Actualizar esta copia

```bash
# Paquetes
pacman -Qqe > paquetes/paquetes-oficiales.txt
pacman -Qqm > paquetes/paquetes-aur.txt

# GNOME
dconf dump / > gnome/gnome-full.dconf

# Fondo
cp ~/.config/background wallpaper/fondo-actual.jpg

# Luego: git add -A && git commit -m "respaldo"
```
