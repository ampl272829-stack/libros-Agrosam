// --- CONFIGURACIÓN ---
// Cambia este número por tu WhatsApp personal
const NUMERO_WHATSAPP = '584128991929';

let filtroActual = 'todos';

/* --- Header Scroll Effect --- */
let lastScroll = 0;
function initHeaderScroll() {
  const header = document.querySelector('header');
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (y > 60) {
      header.style.backdropFilter = 'blur(28px)';
      header.style.boxShadow = '0 1px 20px var(--shadow-md)';
    } else {
      header.style.backdropFilter = 'blur(20px)';
      header.style.boxShadow = 'none';
    }
    lastScroll = y;
  }, { passive: true });
}

function initTheme() {
  const btn = document.getElementById('btn-theme');
  const saved = localStorage.getItem('mp_theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = saved || (prefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);
  btn.textContent = theme === 'dark' ? '☀️' : '🌙';

  btn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('mp_theme', next);
    btn.textContent = next === 'dark' ? '☀️' : '🌙';
  });
}

function iniciarApp() {
  initTheme();
  initHeaderScroll();
  renderizarProductos();
  renderizarCarrito();
  configurarFiltros();
  configurarEventos();
}

function renderizarProductos() {
  const grid = document.getElementById('productos-grid');
  const visibles = productos.filter(p => p.visible !== false);
  const filtrados = filtroActual === 'todos'
    ? visibles
    : visibles.filter(p => p.categoria === filtroActual);

  const catMap = Object.fromEntries(CATEGORIAS.map(c => [c.id, c.nombre]));

  grid.innerHTML = filtrados.map((p, i) => `
    <div class="producto-card ${p.agotado ? 'agotado' : ''}" data-id="${p.id}" style="animation-delay:${i * 0.05}s">
      <div class="img-wrap">
        <img src="${p.img}" alt="${p.nombre}" loading="lazy"
             onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 400 400%22><rect fill=%22%23f5f5f7%22 width=%22400%22 height=%22400%22/><text x=%22200%22 y=%22200%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23ccc%22 font-size=%2232%22>📱</text></svg>'">
        ${p.agotado ? '<span class="badge-agotado">Agotado</span>' : ''}
        <span class="img-categoria">${catMap[p.categoria] || p.categoria}</span>
      </div>
      <div class="producto-info">
        <h3>${p.nombre}</h3>
        <p class="descripcion">${p.descripcion}</p>
        <div class="producto-footer">
          <span class="producto-precio">${p.precio.toFixed(2)}</span>
          ${p.agotado
            ? '<button class="btn-agregar btn-agotado" disabled>Agotado</button>'
            : `<button class="btn-agregar" data-id="${p.id}">+ Agregar</button>`}
        </div>
      </div>
    </div>
  `).join('');

  grid.querySelectorAll('.btn-agregar').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      agregarAlCarrito(btn.dataset.id);
    });
  });
  grid.querySelectorAll('.producto-card').forEach(card => {
    card.addEventListener('click', () => abrirDetalle(card.dataset.id));
  });
}

function renderizarCarrito() {
  const panel = document.getElementById('cart-items');
  const footer = document.getElementById('cart-footer');
  const vacio = document.getElementById('cart-vacio');
  const totalEl = document.getElementById('cart-total');
  const contador = document.getElementById('contador-carrito');

  const total = contarItems();
  contador.textContent = total;
  contador.classList.toggle('oculto', total === 0);

  if (!carrito.length) {
    panel.innerHTML = '';
    footer.classList.add('oculto');
    vacio.classList.remove('oculto');
    return;
  }

  vacio.classList.add('oculto');
  footer.classList.remove('oculto');

  panel.innerHTML = carrito.map(item => {
    const prod = productos.find(p => p.id === item.id);
    if (!prod) return '';
    return `
      <div class="cart-item" data-id="${item.id}">
        <img src="${prod.img}" alt="${prod.nombre}" class="cart-item-img"
             onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%23f5f5f7%22 width=%22100%22 height=%22100%22/><text x=%2250%22 y=%2250%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23ccc%22 font-size=%2216%22>📱</text></svg>'">
        <div class="cart-item-info">
          <h4>${prod.nombre}</h4>
          <span class="cart-item-precio">$${prod.precio.toFixed(2)} c/u</span>
        </div>
        <div class="cart-item-cantidad">
          <button class="btn-restar" data-id="${item.id}">−</button>
          <span>${item.cantidad}</span>
          <button class="btn-sumar" data-id="${item.id}">+</button>
        </div>
      </div>
    `;
  }).join('');

  totalEl.textContent = `$${calcularTotal().toFixed(2)}`;

  panel.querySelectorAll('.btn-restar').forEach(btn => {
    btn.addEventListener('click', () => quitarDelCarrito(btn.dataset.id));
  });
  panel.querySelectorAll('.btn-sumar').forEach(btn => {
    btn.addEventListener('click', () => agregarAlCarrito(btn.dataset.id));
  });
}

let imgActual = 0;

function abrirDetalle(productoId) {
  const producto = productos.find(p => p.id === productoId);
  if (!producto) return;
  imgActual = 0;
  renderizarDetalle(producto);
  document.getElementById('detail-overlay').classList.remove('oculto');
  document.body.style.overflow = 'hidden';
}

function cerrarDetalle() {
  document.getElementById('detail-overlay').classList.add('oculto');
  document.getElementById('detail-comentarios').classList.add('oculto');
  document.body.style.overflow = '';
}

function cambiarImagen(dir) {
  const overlay = document.getElementById('detail-overlay');
  const id = overlay.dataset.productoId;
  const producto = productos.find(p => p.id === id);
  if (!producto || !producto.imagenes) return;
  imgActual = (imgActual + dir + producto.imagenes.length) % producto.imagenes.length;
  document.getElementById('detail-img-principal').src = producto.imagenes[imgActual];
  document.querySelectorAll('.detail-thumb').forEach((t, i) => {
    t.classList.toggle('activo', i === imgActual);
  });
}

function renderizarDetalle(producto) {
  const overlay = document.getElementById('detail-overlay');
  overlay.dataset.productoId = producto.id;
  const imgs = producto.imagenes || [producto.img];
  const content = document.getElementById('detail-contenido');
  content.innerHTML = `
    <div class="detail-gallery">
      <div class="detail-img-main-wrap">
        <button class="detail-nav detail-nav-prev" onclick="cambiarImagen(-1)">‹</button>
        <img id="detail-img-principal" src="${imgs[0]}" alt="${producto.nombre}"
             onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 400 400%22><rect fill=%22%23f5f5f7%22 width=%22400%22 height=%22400%22/><text x=%22200%22 y=%22200%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23ccc%22 font-size=%2232%22>📱</text></svg>'">
        <button class="detail-nav detail-nav-next" onclick="cambiarImagen(1)">›</button>
      </div>
      <div class="detail-thumbs">
        ${imgs.map((src, i) => `
          <img class="detail-thumb ${i === 0 ? 'activo' : ''}" src="${src}" alt=""
               onclick="imgActual=${i};document.getElementById('detail-img-principal').src=this.src;document.querySelectorAll('.detail-thumb').forEach(t=>t.classList.remove('activo'));this.classList.add('activo')">
        `).join('')}
      </div>
    </div>
    <div class="detail-info">
      <span class="detail-categoria">${CATEGORIAS.find(c => c.id === producto.categoria)?.nombre || producto.categoria}</span>
      <h2 class="detail-titulo">${producto.nombre}</h2>
      <div class="detail-precio">$${producto.precio.toFixed(2)}</div>
      <p class="detail-descripcion">${producto.descripcionLarga || producto.descripcion}</p>
      ${producto.agotado
        ? '<button class="btn-agregar detail-agregar btn-agotado" disabled>Agotado</button>'
        : `<button class="btn-agregar detail-agregar" data-id="${producto.id}">+ Agregar al carrito</button>`}
    </div>
  `;
  const btnDetalle = content.querySelector('.detail-agregar');
  if (btnDetalle && !btnDetalle.disabled) {
    btnDetalle.addEventListener('click', () => {
      agregarAlCarrito(producto.id);
      cerrarDetalle();
    });
  }

  const comSection = document.getElementById('detail-comentarios');
  comSection.classList.remove('oculto');
  initComentarios(producto.id);
}

function configurarFiltros() {
  document.querySelectorAll('.filtro-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('activo'));
      btn.classList.add('activo');
      filtroActual = btn.dataset.cat;
      renderizarProductos();
    });
  });
}

function configurarEventos() {
  const btnCarrito = document.getElementById('btn-carrito');
  const btnCerrar = document.getElementById('btn-cerrar-carrito');
  const cartPanel = document.getElementById('cart-panel');
  const btnCheckout = document.getElementById('btn-checkout');
  const checkoutView = document.getElementById('checkout-view');
  const tienda = document.getElementById('tienda');
  const btnVolver = document.getElementById('btn-volver-tienda');
  const form = document.getElementById('checkout-form');

  function abrirCarrito() {
    cartPanel.classList.remove('oculto');
    document.body.insertAdjacentHTML('beforeend', '<div id="overlay"></div>');
    document.getElementById('overlay').addEventListener('click', cerrarCarrito);
    renderizarCarrito();
  }

  function cerrarCarrito() {
    cartPanel.classList.add('oculto');
    const overlay = document.getElementById('overlay');
    if (overlay) overlay.remove();
  }

  btnCarrito.addEventListener('click', abrirCarrito);
  btnCerrar.addEventListener('click', cerrarCarrito);

  btnCheckout.addEventListener('click', () => {
    cerrarCarrito();
    tienda.classList.add('oculto');
    checkoutView.classList.remove('oculto');
    mostrarResumenCheckout();
  });

  btnVolver.addEventListener('click', () => {
    checkoutView.classList.add('oculto');
    tienda.classList.remove('oculto');
  });

  const btnCerrarDetalle = document.getElementById('btn-cerrar-detalle');
  const detailOverlay = document.getElementById('detail-overlay');
  btnCerrarDetalle.addEventListener('click', cerrarDetalle);
  detailOverlay.addEventListener('click', (e) => {
    if (e.target === detailOverlay) cerrarDetalle();
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    enviarPedido();
  });
}

function mostrarResumenCheckout() {
  const container = document.getElementById('checkout-resumen');
  container.innerHTML = carrito.map(item => {
    const prod = productos.find(p => p.id === item.id);
    return `
      <div class="resumen-item">
        <span>${prod.nombre} × ${item.cantidad}</span>
        <span>$${(prod.precio * item.cantidad).toFixed(2)}</span>
      </div>
    `;
  }).join('') + `
    <div class="resumen-item total">
      <span>Total</span>
      <span>$${calcularTotal().toFixed(2)}</span>
    </div>
  `;
}

function enviarPedido() {
  const nombre = document.getElementById('cf-nombre').value.trim();
  const telefono = document.getElementById('cf-telefono').value.trim();
  const direccion = document.getElementById('cf-direccion').value.trim();
  const notas = document.getElementById('cf-notas').value.trim();

  if (!nombre || !telefono || !direccion) return;

  let mensaje = `📦 *Nuevo Pedido M&S Store*\n\n`;
  mensaje += `👤 *Nombre:* ${nombre}\n`;
  mensaje += `📞 *Teléfono:* ${telefono}\n`;
  mensaje += `📍 *Dirección:* ${direccion}\n`;
  if (notas) mensaje += `📝 *Notas:* ${notas}\n`;
  mensaje += `\n*Productos:*\n`;

  carrito.forEach(item => {
    const prod = productos.find(p => p.id === item.id);
    mensaje += `  • ${prod.nombre} × ${item.cantidad} = $${(prod.precio * item.cantidad).toFixed(2)}\n`;
  });

  mensaje += `\n💰 *Total: $${calcularTotal().toFixed(2)}*`;

  const url = `https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(mensaje)}`;
  window.open(url, '_blank');

  const pedido = {
    id: Math.random().toString(36).slice(2, 10),
    fecha: new Date().toISOString(),
    nombre,
    telefono,
    direccion,
    notas,
    items: carrito.map(i => {
      const prod = productos.find(p => p.id === i.id);
      return {
        id: i.id,
        nombre: prod?.nombre || i.id,
        cantidad: i.cantidad,
        subtotal: (prod?.precio || 0) * i.cantidad,
      };
    }),
    total: calcularTotal(),
  };

  if (USAR_SUPABASE) {
    sbCrearPedido(pedido).catch(() => {});
  } else {
    fetch('/api/pedidos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre,
        telefono,
        direccion,
        notas,
        items: carrito.map(i => ({ id: i.id, cantidad: i.cantidad })),
      }),
    }).catch(() => {});
  }

  mostrarToast('✅ Pedido enviado por WhatsApp');

  vaciarCarrito();
  document.getElementById('checkout-view').classList.add('oculto');
  document.getElementById('tienda').classList.remove('oculto');
  document.getElementById('checkout-form').reset();
}

function actualizarUI() {
  renderizarProductos();
  renderizarCarrito();
}

function mostrarToast(mensaje) {
  const toast = document.getElementById('toast');
  toast.textContent = mensaje;
  toast.classList.remove('oculto');
  setTimeout(() => toast.classList.add('oculto'), 2500);
}

function iniciarHeroMoto() {
  const stat = document.querySelector('.hero-stat');
  if (!stat) return;
  const icon = stat.querySelector('.hero-stat-icon');
  const travel = Math.max(0, stat.clientWidth - icon.offsetWidth - 34);
  stat.style.setProperty('--travel', travel + 'px');
  requestAnimationFrame(() => requestAnimationFrame(() => stat.classList.add('animar')));
}

document.addEventListener('DOMContentLoaded', iniciarApp);
window.addEventListener('load', iniciarHeroMoto);
