#!/usr/bin/env bash
# Respalda toda la configuración del sistema a ~/dev/config y hace commit.
set -e
cd "$HOME/dev/config"

echo "==> paquetes"
pacman -Qqe > paquetes/paquetes-oficiales.txt
pacman -Qqm > paquetes/paquetes-aur.txt
pacman -Q > paquetes/todos-instalados.txt

echo "==> gnome"
dconf dump / > gnome/gnome-full.dconf
dconf dump /org/gnome/desktop/ > gnome/desktop.dconf
dconf dump /org/gnome/settings-daemon/plugins/media-keys/ > gnome/atajos-teclado.dconf
dconf dump /org/gnome/shell/extensions/ > gnome/extensiones-config.dconf
gsettings get org.gnome.shell enabled-extensions > gnome/extensiones-activadas.txt

echo "==> extensiones"
tar czf gnome/extensiones-gnome.tgz -C "$HOME/.local/share/gnome-shell" extensions

echo "==> servicios"
for u in llama-server openclaw-gateway whisper-server; do
  systemctl --user cat "$u.service" > "servicios/user-$u.service" 2>/dev/null || true
done
systemctl cat ydotool-root.service > servicios/system-ydotool-root.service 2>/dev/null || true

echo "==> sistema"
for f in /etc/hostname /etc/locale.conf /etc/vconsole.conf /etc/default/grub /etc/fstab /etc/mkinitcpio.conf; do
  [ -f "$f" ] && cp "$f" "system/$(basename "$f")" || true
done

echo "==> wallpaper"
cp "$HOME/.config/background" wallpaper/fondo-actual.jpg

echo "==> scripts"
cp "$HOME/.local/bin/dictar" "$HOME/.local/bin/dictar-toggle" "$HOME/.local/bin/dictar-visor.py" scripts/ 2>/dev/null || true
cp "$HOME/.ghostty/launch.sh" scripts/ghostty-launch.sh 2>/dev/null || true

git add -A
git commit -m "respaldo: $(date '+%Y-%m-%d %H:%M')" >/dev/null 2>&1 || echo "sin cambios para commit"
echo "==> respaldo completo ✔"
