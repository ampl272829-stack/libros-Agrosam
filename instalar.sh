#!/usr/bin/env bash
# ============================================================
#  Instalador automático del sistema (1 sola línea)
#
#  HACE TODO SOLO: instala git si falta, descarga el respaldo,
#  y abre el instalador family friendly de 8 pasos.
#
#  Cómo usarlo (copiar y pegar):
#    curl -sL https://raw.githubusercontent.com/ampl272829-stack/libros-Agrosam/master/instalar.sh | bash
# ============================================================

set -u

VERDE='\033[0;32m'; AMARILLO='\033[1;33m'; AZUL='\033[0;34m'; ROJO='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'
ok()   { echo -e "${VERDE}  ✓ $1${NC}"; }
info() { echo -e "${AZUL}  → $1${NC}"; }
aviso(){ echo -e "${AMARILLO}  ⚠ $1${NC}"; }
err()  { echo -e "${ROJO}  ✗ $1${NC}"; }

echo -e "${CYAN}═══════════════════════════════════════════════${NC}"
echo -e "${CYAN}  🎉 Bienvenido al instalador automático${NC}"
echo -e "${CYAN}  (Todo se descarga y configura solo)${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════${NC}"

REPO="https://github.com/ampl272829-stack/libros-Agrosam.git"
DEST="$HOME/libros-Agrosam"

# ---------- 1. git ----------
if ! command -v git >/dev/null 2>&1; then
  info "Git no está instalado, lo instalo..."
  if command -v pacman >/dev/null 2>&1; then
    sudo pacman -S --needed --noconfirm git || { err "No pude instalar git"; exit 1; }
  elif command -v apt >/dev/null 2>&1; then
    sudo apt update -y && sudo apt install -y git || { err "No pude instalar git"; exit 1; }
  elif command -v dnf >/dev/null 2>&1; then
    sudo dnf install -y git || { err "No pude instalar git"; exit 1; }
  else
    err "Instala git tú mismo y vuelve a ejecutar este comando."
    exit 1
  fi
  ok "Git instalado"
fi

# ---------- 2. descargar el respaldo ----------
if [ -d "$DEST" ]; then
  aviso "Ya existe $DEST, lo actualizo..."
  git -C "$DEST" pull --rebase 2>/dev/null || { err "No pude actualizar"; exit 1; }
else
  info "Descargando el respaldo del sistema..."
  git clone "$REPO" "$DEST" || { err "No pude descargar"; exit 1; }
fi
ok "Respaldo descargado en $DEST"

# ---------- 3. lanzar el instalador ----------
echo
info "Abriendo el instalador (menú paso a paso)..."
echo
cd "$DEST/dev-config" && bash instalar-todo.sh

echo
echo -e "${VERDE}═══════════════════════════════════════════════${NC}"
echo -e "${VERDE}  💚 ¡Listo! Tu sistema está restaurado.${NC}"
echo -e "${VERDE}  Reinicia la sesión y a disfrutar.${NC}"
echo -e "${VERDE}═══════════════════════════════════════════════${NC}"
