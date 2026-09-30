let carrito = JSON.parse(localStorage.getItem('mp_carrito') || '[]');

function guardarCarrito() {
  localStorage.setItem('mp_carrito', JSON.stringify(carrito));
}

function obtenerCantidad(id) {
  const item = carrito.find(p => p.id === id);
  return item ? item.cantidad : 0;
}

function agregarAlCarrito(id) {
  const prod = productos.find(p => p.id === id);
  if (!prod || prod.agotado || prod.visible === false) return;
  const idx = carrito.findIndex(p => p.id === id);
  if (idx >= 0) {
    carrito[idx].cantidad++;
  } else {
    carrito.push({ id, cantidad: 1 });
  }
  guardarCarrito();
  actualizarUI();
  mostrarToast('✓ Agregado al carrito');
}

function quitarDelCarrito(id) {
  const idx = carrito.findIndex(p => p.id === id);
  if (idx < 0) return;
  if (carrito[idx].cantidad > 1) {
    carrito[idx].cantidad--;
  } else {
    carrito.splice(idx, 1);
  }
  guardarCarrito();
  actualizarUI();
}

function eliminarProducto(id) {
  carrito = carrito.filter(p => p.id !== id);
  guardarCarrito();
  actualizarUI();
}

function contarItems() {
  return carrito.reduce((sum, p) => sum + p.cantidad, 0);
}

function calcularTotal() {
  return carrito.reduce((sum, item) => {
    const prod = productos.find(p => p.id === item.id);
    return sum + (prod ? prod.precio * item.cantidad : 0);
  }, 0);
}

function vaciarCarrito() {
  carrito = [];
  guardarCarrito();
  actualizarUI();
}
