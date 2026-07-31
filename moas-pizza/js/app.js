(function () {
  'use strict';

  const DATA = window.DATA || {};
  const USER_REVIEWS_KEY = 'moas-pizza_user_reviews';

  function initDarkMode() {
    const toggle = document.getElementById('themeToggle');
    const saved = localStorage.getItem('moas-pizza_theme');

    if (saved === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      toggle.textContent = '☀️';
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      toggle.textContent = '🌙';
      localStorage.setItem('moas-pizza_theme', 'light');
    }

    toggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      if (current === 'dark') {
        document.documentElement.setAttribute('data-theme', 'light');
        toggle.textContent = '🌙';
        localStorage.setItem('moas-pizza_theme', 'light');
      } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        toggle.textContent = '☀️';
        localStorage.setItem('moas-pizza_theme', 'dark');
      }
    });
  }

  function initNavbar() {
    const navbar = document.getElementById('navbar');
    const toggle = document.getElementById('menuToggle');
    const links = document.getElementById('navLinks');

    window.addEventListener('scroll', () => {
      if (window.scrollY > 80) navbar.classList.add('scrolled');
      else navbar.classList.remove('scrolled');
    });

    toggle.addEventListener('click', () => links.classList.toggle('open'));
  }

  function initViewSwitching() {
    const navLinks = document.querySelectorAll('[data-view]');
    const views = document.querySelectorAll('.page-view');
    const navbarLinks = document.querySelectorAll('.navbar-links a');
    let currentView = 'home';

    function setActiveNav(viewId) {
      navbarLinks.forEach(a => {
        a.classList.toggle('active-link', a.dataset.view === viewId);
      });
    }

    function activateView(view) {
      currentView = view;
      views.forEach(v => v.classList.remove('active'));
      const target = document.getElementById('view-' + view);
      if (target) target.classList.add('active');
      document.getElementById('navLinks').classList.remove('open');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setActiveNav(view);
      target.querySelectorAll('.reveal, .reveal-left, .reveal-right').forEach(el => el.classList.add('visible'));
      setTimeout(() => { initScrollReveal(); }, 200);
    }

    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const view = link.dataset.view;
        if (view === currentView) return;
        activateView(view);
      });
    });

    setActiveNav('home');
  }

  function initTyping() {
    const el = document.getElementById('typingText');
    if (!el) return;
    const phrases = ['Un paraíso en cada sabor', 'Pizzas artesanales y postres tropicales', 'El sabor que te enamora'];
    let idx = 0, charIdx = 0, isDeleting = false;

    function type() {
      const current = phrases[idx];
      if (isDeleting) {
        el.textContent = current.substring(0, charIdx--);
        if (charIdx < 0) { isDeleting = false; idx = (idx + 1) % phrases.length; setTimeout(type, 400); return; }
        setTimeout(type, 40);
      } else {
        el.textContent = current.substring(0, charIdx++);
        if (charIdx > current.length) { isDeleting = true; setTimeout(type, 2000); return; }
        setTimeout(type, 70);
      }
    }
    type();
  }

  function initScrollReveal() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('visible');
      });
    }, { threshold: 0.1 });
    document.querySelectorAll('.reveal, .reveal-left, .reveal-right').forEach(el => observer.observe(el));
  }

  function getIngredientIcon(ing) {
    const icons = window.DATA.ICONOS_INGREDIENTES || {};
    return icons[ing] || '•';
  }

  function renderMenuCategory(categoria) {
    const container = document.getElementById('menuGrid');
    if (!container) return;
    const cat = DATA.MENU.find(c => c.categoria === categoria);
    if (!cat) return;

    const heroImg = document.getElementById('menuHeroImg');
    const heroTitle = document.getElementById('menuHeroTitle');
    const heroDesc = document.getElementById('menuHeroDesc');
    if (heroImg) heroImg.src = cat.imagen_categoria;
    if (heroTitle) heroTitle.textContent = cat.categoria;
    if (heroDesc) heroDesc.textContent = cat.descripcion_categoria || '';

    container.innerHTML = cat.items.map((item, i) => `
      <div class="menu-item">
        ${item.popular ? '<div class="menu-popular-badge">⭐ Popular</div>' : ''}
        <div class="menu-item-img-wrapper">
          <img class="menu-item-img" src="${item.img}" alt="${item.nombre}" loading="lazy">
          <div class="menu-item-img-overlay"></div>
          <span class="menu-item-price-badge">$${item.precio.toFixed(2)}</span>
        </div>
        <div class="menu-item-body">
          <div class="menu-item-name">${item.nombre}</div>
          <div class="menu-item-desc">${item.descripcion}</div>
          ${item.ingredientes && item.ingredientes.length ? `
            <div class="menu-ingredientes">
              ${item.ingredientes.map(ing => `
                <span class="menu-ingrediente-tag">
                  <span class="ing-icon">${getIngredientIcon(ing)}</span>
                  ${ing}
                </span>
              `).join('')}
            </div>
          ` : ''}
          <div class="menu-item-footer">
            <a href="https://wa.me/${DATA.CONFIG.whatsapp}?text=${encodeURIComponent('Hola, quiero ordenar: ' + item.nombre)}" target="_blank" class="btn btn-primary btn-sm">🍕 Ordenar</a>
          </div>
        </div>
      </div>
    `).join('');

    document.querySelectorAll('#view-menu .reveal, #view-menu .reveal-left, #view-menu .reveal-right').forEach(el => el.classList.add('visible'));
  }

  function initMenu() {
    const tabs = document.querySelectorAll('.menu-tab');
    if (!document.getElementById('menuGrid')) return;

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        renderMenuCategory(tab.dataset.cat);
      });
    });

    if (tabs.length > 0) renderMenuCategory(tabs[0].dataset.cat);
  }

  function initGaleria() {
    const grid = document.getElementById('galeriaGrid');
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightboxImg');
    if (!grid) return;
    let currentIdx = 0;

    grid.innerHTML = DATA.GALERIA.map((url, i) => `
      <div class="galeria-item reveal" data-index="${i}">
        <img src="${url}" alt="Galería ${i+1}" loading="lazy">
        <div class="galeria-overlay"><span>+</span></div>
      </div>
    `).join('');

    grid.addEventListener('click', (e) => {
      const item = e.target.closest('.galeria-item');
      if (!item) return;
      currentIdx = parseInt(item.dataset.index);
      lightboxImg.src = DATA.GALERIA[currentIdx];
      lightbox.classList.add('open');
    });

    document.querySelector('.lightbox-close').addEventListener('click', () => lightbox.classList.remove('open'));
    document.querySelector('.lightbox-nav.prev').addEventListener('click', (e) => { e.stopPropagation(); currentIdx = (currentIdx - 1 + DATA.GALERIA.length) % DATA.GALERIA.length; lightboxImg.src = DATA.GALERIA[currentIdx]; });
    document.querySelector('.lightbox-nav.next').addEventListener('click', (e) => { e.stopPropagation(); currentIdx = (currentIdx + 1) % DATA.GALERIA.length; lightboxImg.src = DATA.GALERIA[currentIdx]; });
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) lightbox.classList.remove('open');
    });
    document.addEventListener('keydown', (e) => {
      if (!lightbox.classList.contains('open')) return;
      if (e.key === 'Escape') lightbox.classList.remove('open');
      if (e.key === 'ArrowLeft') document.querySelector('.lightbox-nav.prev').click();
      if (e.key === 'ArrowRight') document.querySelector('.lightbox-nav.next').click();
    });

    grid.querySelectorAll('.galeria-item').forEach(el => {
      const ro = new IntersectionObserver((entries) => {
        entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); ro.unobserve(e.target); } });
      }, { threshold: 0.1 });
      ro.observe(el);
    });
  }

  function initResenas() {
    const track = document.querySelector('.resenas-track');
    const dots = document.querySelector('.resenas-dots');
    if (!track) return;
    let current = 0;

    const userReviews = JSON.parse(localStorage.getItem(USER_REVIEWS_KEY) || '[]');
    const allResenas = [...DATA.RESENAS, ...userReviews];

    function render() {
      track.innerHTML = allResenas.map(r => `
        <div class="resena-card">
          <div class="resena-estrellas">${'★'.repeat(r.estrellas)}${'☆'.repeat(5 - r.estrellas)}</div>
          <div class="resena-texto">${r.texto}</div>
          <div class="resena-autor">${r.nombre}</div>
          <div class="resena-fecha">${r.fecha}</div>
        </div>
      `).join('');

      dots.innerHTML = allResenas.map((_, i) => `
        <button class="resena-dot ${i === 0 ? 'active' : ''}" data-index="${i}"></button>
      `).join('');

      function goTo(index) {
        current = index;
        track.style.transform = `translateX(-${current * 100}%)`;
        dots.querySelectorAll('.resena-dot').forEach((d, i) => d.classList.toggle('active', i === current));
      }

      dots.addEventListener('click', (e) => {
        const dot = e.target.closest('.resena-dot');
        if (dot) goTo(parseInt(dot.dataset.index));
      });

      setInterval(() => goTo((current + 1) % allResenas.length), 5000);
    }

    render();
  }

  function initReviewForm() {
    const btn = document.getElementById('submitReviewBtn');
    if (!btn) return;

    btn.addEventListener('click', () => {
      const nombre = document.getElementById('reviewName').value.trim();
      const estrellas = parseInt(document.getElementById('reviewStars').value);
      const texto = document.getElementById('reviewText').value.trim();

      if (!nombre || !texto) { alert('Por favor ingresa tu nombre y tu reseña'); return; }

      const review = {
        nombre,
        estrellas,
        texto,
        fecha: new Date().toLocaleDateString('es-VE')
      };

      const saved = JSON.parse(localStorage.getItem(USER_REVIEWS_KEY) || '[]');
      saved.unshift(review);
      localStorage.setItem(USER_REVIEWS_KEY, JSON.stringify(saved));

      document.getElementById('reviewName').value = '';
      document.getElementById('reviewText').value = '';
      document.getElementById('reviewStars').value = '5';

      alert('¡Gracias por tu reseña! Recarga la página para verla en el carrusel.');
      initResenas();
    });
  }

  function initHomeUbicacion() {
    const map = document.getElementById('homeMapFrame');
    if (!map) return;
    const { lat, lng } = DATA.CONFIG.coordenadas;
    map.src = `https://www.google.com/maps?q=${lat},${lng}&z=17&output=embed`;
    const dirEl = document.getElementById('homeDir');
    const horEl = document.getElementById('homeHorario');
    const telEl = document.getElementById('homeTel');
    if (dirEl) dirEl.textContent = DATA.CONFIG.direccion;
    if (horEl) horEl.textContent = DATA.CONFIG.horario;
    if (telEl) telEl.textContent = DATA.CONFIG.telefono;
  }

  function initWhatsappFloat() {
    const btn = document.getElementById('whatsappFloat');
    if (btn) btn.href = `https://wa.me/${DATA.CONFIG.whatsapp}?text=${encodeURIComponent('¡Hola! Quiero hacer un pedido')}`;
  }

  function initPedidosForm() {
    const form = document.getElementById('pedidosForm');
    if (!form) return;

    const container = document.getElementById('orderItems');
    const success = document.getElementById('pedidosSuccess');

    let allItems = [];
    DATA.MENU.forEach(cat => {
      cat.items.forEach(item => {
        allItems.push({ ...item, categoria: cat.categoria });
      });
    });

    function renderMenuSelector() {
      container.innerHTML = DATA.MENU.map(cat => `
        <div style="grid-column:1/-1;font-size:0.85rem;font-weight:700;color:var(--accent);margin-top:0.3rem">${cat.categoria}</div>
        ${cat.items.map(item => `
          <label class="pedidos-menu-item">
            <input type="checkbox" data-id="${item.id}" data-name="${item.nombre}" data-price="${item.precio}">
            <span>${item.nombre}</span>
            <input type="number" class="menu-qty" min="1" value="1" disabled>
          </label>
        `).join('')}
      `).join('');

      container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', () => {
          const qty = cb.closest('.pedidos-menu-item').querySelector('.menu-qty');
          qty.disabled = !cb.checked;
          if (!cb.checked) qty.value = 1;
        });
      });
    }

    renderMenuSelector();

    document.querySelectorAll('input[name="delivery"]').forEach(r => {
      r.addEventListener('change', () => {
        const addrGroup = document.getElementById('addressGroup');
        addrGroup.style.display = r.value === 'Delivery' ? 'block' : 'none';
      });
    });
    document.getElementById('addressGroup').style.display = 'block';

    document.getElementById('submitOrderBtn').addEventListener('click', () => {
      const name = document.getElementById('orderName').value.trim();
      const phone = document.getElementById('orderPhone').value.trim();
      const delivery = document.querySelector('input[name="delivery"]:checked').value;
      const address = document.getElementById('orderAddress').value.trim();
      const notes = document.getElementById('orderNotes').value.trim();

      if (!name || !phone) { alert('Por favor ingresa tu nombre y teléfono'); return; }

      const checked = container.querySelectorAll('input[type="checkbox"]:checked');
      if (checked.length === 0) { alert('Selecciona al menos un producto'); return; }

      const items = [];
      checked.forEach(cb => {
        const qty = cb.closest('.pedidos-menu-item').querySelector('.menu-qty').value || 1;
        items.push({ nombre: cb.dataset.name, precio: parseFloat(cb.dataset.price), qty: parseInt(qty) });
      });

      const total = items.reduce((sum, i) => sum + i.precio * i.qty, 0);

      let msg = `🍕 *NUEVO PEDIDO - Moa's Pizza*\n\n`;
      msg += `👤 *Nombre:* ${name}\n`;
      msg += `📱 *Teléfono:* ${phone}\n`;
      msg += `📍 *Tipo:* ${delivery}\n`;
      if (delivery === 'Delivery' && address) msg += `🏠 *Dirección:* ${address}\n`;
      msg += `\n*🛒 Productos:*\n`;
      items.forEach(i => { msg += `  • ${i.nombre} x${i.qty} = $${(i.precio * i.qty).toFixed(2)}\n`; });
      msg += `\n*💰 Total: $${total.toFixed(2)}*\n`;
      if (notes) msg += `\n*📝 Notas:* ${notes}\n`;
      msg += `\n🙏 ¡Gracias por tu pedido!`;

      const url = `https://wa.me/${DATA.CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`;
      window.open(url, '_blank');

      form.style.display = 'none';
      success.classList.add('show');
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initDarkMode();
    initNavbar();
    initViewSwitching();
    initTyping();
    initScrollReveal();
    initMenu();
    initGaleria();
    initResenas();
    initReviewForm();
    initHomeUbicacion();
    initWhatsappFloat();
    initPedidosForm();
  });
})();
