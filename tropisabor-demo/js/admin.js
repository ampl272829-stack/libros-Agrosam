(function () {
  'use strict';

  let CFG, MENU, RESENAS;

  function loadData() {
    const stored = localStorage.getItem('tropisabor_admin');
    if (stored) {
      const data = JSON.parse(stored);
      CFG = data.CONFIG;
      MENU = data.MENU;
      RESENAS = data.RESENAS;
    } else {
      CFG = JSON.parse(JSON.stringify(window.DATA.CONFIG));
      MENU = JSON.parse(JSON.stringify(window.DATA.MENU));
      RESENAS = JSON.parse(JSON.stringify(window.DATA.RESENAS));
    }
  }

  function saveData() {
    localStorage.setItem('tropisabor_admin', JSON.stringify({ CONFIG: CFG, MENU, RESENAS }));
  }

  function showView(id) {
    document.querySelectorAll('.admin-view').forEach(v => v.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.querySelectorAll('.admin-nav-item').forEach(n => n.classList.remove('active'));
    document.querySelector(`[data-view="${id}"]`).classList.add('active');
  }

  function renderMenu() {
    const container = document.getElementById('adminMenuList');
    const catFilter = document.getElementById('menuCatFilter').value;

    const filtered = catFilter === 'todas' ? MENU : MENU.filter(c => c.categoria === catFilter);

    container.innerHTML = filtered.map(cat => `
      <div class="admin-cat-group">
        <h3 class="admin-cat-title">${cat.categoria}</h3>
        ${cat.items.map(item => `
          <div class="admin-row" data-id="${item.id}">
            <img src="${item.img}" class="admin-thumb">
            <div class="admin-row-info">
              <strong>${item.nombre}</strong>
              <span class="admin-row-desc">${item.descripcion}</span>
            </div>
            <span class="admin-row-price">$${item.precio.toFixed(2)}</span>
            <button class="admin-btn admin-btn-sm" onclick="ADMIN.editMenuItem('${item.id}')">Editar</button>
            <button class="admin-btn admin-btn-sm admin-btn-danger" onclick="ADMIN.deleteMenuItem('${item.id}')">Eliminar</button>
          </div>
        `).join('')}
      </div>
    `).join('');
  }

  function editMenuItem(id) {
    let item, cat;
    for (const c of MENU) {
      const found = c.items.find(i => i.id === id);
      if (found) { item = found; cat = c; break; }
    }
    if (!item) return;

    document.getElementById('editItemId').value = item.id;
    document.getElementById('editItemCat').value = cat.categoria;
    document.getElementById('editItemNombre').value = item.nombre;
    document.getElementById('editItemDesc').value = item.descripcion;
    document.getElementById('editItemPrecio').value = item.precio;
    document.getElementById('editItemImg').value = item.img;
    document.getElementById('editItemModal').classList.add('open');
  }

  function saveMenuItem() {
    const id = document.getElementById('editItemId').value;
    const categoria = document.getElementById('editItemCat').value;
    const nombre = document.getElementById('editItemNombre').value.trim();
    const desc = document.getElementById('editItemDesc').value.trim();
    const precio = parseFloat(document.getElementById('editItemPrecio').value);
    const img = document.getElementById('editItemImg').value.trim();

    if (!nombre || !precio) { alert('Nombre y precio son obligatorios'); return; }

    let cat = MENU.find(c => c.categoria === categoria);
    if (!cat) {
      cat = { categoria, items: [] };
      MENU.push(cat);
    }

    const idx = cat.items.findIndex(i => i.id === id);
    if (idx >= 0) {
      cat.items[idx] = { ...cat.items[idx], nombre, descripcion: desc, precio, img };
    } else {
      cat.items.push({ id: 'i' + Date.now(), nombre, descripcion: desc, precio, img });
    }

    document.getElementById('editItemModal').classList.remove('open');
    saveData();
    renderMenu();
    renderMenuSelect();
  }

  function deleteMenuItem(id) {
    if (!confirm('¿Eliminar este item del menú?')) return;
    for (const c of MENU) {
      const idx = c.items.findIndex(i => i.id === id);
      if (idx >= 0) { c.items.splice(idx, 1); break; }
    }
    saveData();
    renderMenu();
    renderMenuSelect();
  }

  function renderMenuSelect() {
    const catFilter = document.getElementById('menuCatFilter');
    catFilter.innerHTML = '<option value="todas">Todas las categorías</option>' +
      MENU.map(c => `<option value="${c.categoria}">${c.categoria}</option>`).join('');
  }

  function renderResenas() {
    const container = document.getElementById('adminResenasList');
    container.innerHTML = RESENAS.map((r, i) => `
      <div class="admin-row">
        <div class="admin-row-info">
          <strong>${r.nombre}</strong>
          <span class="admin-row-desc">${'★'.repeat(r.estrellas)}${'☆'.repeat(5-r.estrellas)} — ${r.texto}</span>
        </div>
        <button class="admin-btn admin-btn-sm admin-btn-danger" onclick="ADMIN.deleteResena(${i})">Eliminar</button>
      </div>
    `).join('');
  }

  function deleteResena(idx) {
    if (!confirm('¿Eliminar esta reseña?')) return;
    RESENAS.splice(idx, 1);
    saveData();
    renderResenas();
  }

  function addResena() {
    const nombre = document.getElementById('nuevaResenaNombre').value.trim();
    const texto = document.getElementById('nuevaResenaTexto').value.trim();
    const estrellas = parseInt(document.getElementById('nuevaResenaEstrellas').value);

    if (!nombre || !texto) { alert('Nombre y texto son obligatorios'); return; }

    RESENAS.push({ nombre, texto, estrellas, fecha: new Date().toLocaleDateString('es-VE') });
    document.getElementById('nuevaResenaNombre').value = '';
    document.getElementById('nuevaResenaTexto').value = '';
    saveData();
    renderResenas();
  }

  function renderConfig() {
    document.getElementById('cfgPassword').value = CFG.password;
    document.getElementById('cfgWhatsapp').value = CFG.whatsapp;
    document.getElementById('cfgInstagram').value = CFG.instagram;
    document.getElementById('cfgTelefono').value = CFG.telefono;
    document.getElementById('cfgDireccion').value = CFG.direccion;
    document.getElementById('cfgHorario').value = CFG.horario;
    document.getElementById('cfgWhatsappDisplay').textContent = CFG.telefono;
    document.getElementById('cfgWhatsappLink').href = `https://wa.me/${CFG.whatsapp}`;
  }

  function saveConfig() {
    CFG.password = document.getElementById('cfgPassword').value.trim() || CFG.password;
    CFG.whatsapp = document.getElementById('cfgWhatsapp').value.trim();
    CFG.instagram = document.getElementById('cfgInstagram').value.trim();
    CFG.telefono = document.getElementById('cfgTelefono').value.trim();
    CFG.direccion = document.getElementById('cfgDireccion').value.trim();
    CFG.horario = document.getElementById('cfgHorario').value.trim();
    saveData();
    renderConfig();
    alert('Configuración guardada correctamente');
  }

  function exportData() {
    const data = { CONFIG: CFG, MENU, RESENAS, GALERIA: window.DATA.GALERIA };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tropisabor-data.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function importData() {
    document.getElementById('importFile').click();
  }

  function handleImportFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.CONFIG && data.MENU) {
          CFG = data.CONFIG;
          MENU = data.MENU;
          RESENAS = data.RESENAS || RESENAS;
          saveData();
          renderAll();
          alert('Datos importados correctamente');
        } else {
          alert('Archivo inválido');
        }
      } catch { alert('Error al leer el archivo'); }
    };
    reader.readAsText(file);
  }

  function renderAll() {
    renderMenu();
    renderMenuSelect();
    renderResenas();
    renderConfig();
  }

  const ADMIN = {
    editMenuItem, saveMenuItem, deleteMenuItem,
    deleteResena, addResena, saveConfig,
    exportData, importData, handleImportFile
  };
  window.ADMIN = ADMIN;

  document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const adminPanel = document.getElementById('adminPanel');
    const loginView = document.getElementById('loginView');
    const loginError = document.getElementById('loginError');

    loadData();

    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const pass = document.getElementById('loginPass').value;
      if (pass === CFG.password) {
        loginView.classList.remove('active');
        adminPanel.classList.add('active');
        renderAll();
        showView('viewMenu');
      } else {
        loginError.textContent = 'Contraseña incorrecta';
        setTimeout(() => loginError.textContent = '', 3000);
      }
    });

    document.getElementById('logoutBtn').addEventListener('click', () => {
      localStorage.removeItem('tropisabor_admin');
      loginView.classList.add('active');
      adminPanel.classList.remove('active');
    });

    document.querySelectorAll('.admin-nav-item').forEach(item => {
      item.addEventListener('click', () => showView(item.dataset.view));
    });

    document.getElementById('editItemModal').addEventListener('click', (e) => {
      if (e.target === document.getElementById('editItemModal')) {
        document.getElementById('editItemModal').classList.remove('open');
      }
    });

    document.getElementById('addItemBtn').addEventListener('click', () => {
      document.getElementById('editItemId').value = '';
      document.getElementById('editItemCat').value = MENU[0]?.categoria || 'Pizzas';
      document.getElementById('editItemNombre').value = '';
      document.getElementById('editItemDesc').value = '';
      document.getElementById('editItemPrecio').value = '';
      document.getElementById('editItemImg').value = 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=300&fit=crop';
      document.getElementById('editItemModal').classList.add('open');
    });

    document.getElementById('saveItemBtn').addEventListener('click', saveMenuItem);
    document.getElementById('cancelItemBtn').addEventListener('click', () => {
      document.getElementById('editItemModal').classList.remove('open');
    });

    document.getElementById('addResenaBtn').addEventListener('click', addResena);
    document.getElementById('saveConfigBtn').addEventListener('click', saveConfig);
    document.getElementById('exportBtn').addEventListener('click', exportData);
    document.getElementById('importBtn').addEventListener('click', importData);
    document.getElementById('importFile').addEventListener('change', handleImportFile);

    document.getElementById('menuCatFilter').addEventListener('change', renderMenu);
  });
})();
