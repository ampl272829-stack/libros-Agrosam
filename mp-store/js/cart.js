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
  if (!prod || prod.visible === false) return;
  
  // Validar stock: -1 = ilimitado, 0 = agotado, > 0 = cantidad disponible
  if (prod.stock === -1) {
    // Ilimitado: permitir sin restricciones
  } else if (prod.stock === 0) {
    mostrarToast('Producto agotado - no disponible para la compra');
    return;
  } else if (prod.stock > 0) {
    // Stock controlado: verificar que no se exceda
    const itemActual = carrito.find(c => c.id === id);
    if (itemActual) {
      // Ya está en carrito: sumar cantidad pero no exceder stock
      const nuevaCantidad = Math.min(itemActual.cantidad + 1, prod.stock);
      carrito[idx].cantidad = nuevaCantidad;
    } else if (1 <= prod.stock) {
      carrito.push({ id, cantidad: 1 });
    } else {
      mostrarToast('Stock insuficiente');
      return;
    }
  }
  
  // Guardar y actualizar UI (código existente)
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
