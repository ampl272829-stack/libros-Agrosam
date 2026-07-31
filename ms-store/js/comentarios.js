const COMENTARIOS_KEY = 'mp_comentarios';

async function obtenerComentarios(productoId) {
  if (USAR_SUPABASE) {
    try {
      return await sbComentarios(productoId);
    } catch (_) {}
  }
  const data = JSON.parse(localStorage.getItem(COMENTARIOS_KEY) || '{}');
  return data[productoId] || [];
}

async function guardarComentario(productoId, nombre, texto, estrellas) {
  const c = {
    nombre: nombre.trim() || 'Anónimo',
    texto: texto.trim(),
    estrellas: Math.min(5, Math.max(1, Math.round(estrellas))),
  };
  if (USAR_SUPABASE) {
    try {
      await sbCrearComentario({ productoId, ...c });
      return;
    } catch (_) {}
  }
  const data = JSON.parse(localStorage.getItem(COMENTARIOS_KEY) || '{}');
  if (!data[productoId]) data[productoId] = [];
  data[productoId].unshift({ id: Date.now(), ...c, fecha: new Date().toISOString() });
  localStorage.setItem(COMENTARIOS_KEY, JSON.stringify(data));
}

async function renderizarComentarios(productoId) {
  const lista = document.getElementById('comentarios-lista');
  const contador = document.getElementById('comentarios-contador');
  lista.innerHTML = '<p class="comentarios-vacio">Cargando comentarios...</p>';
  const comentarios = await obtenerComentarios(productoId);

  contador.textContent = comentarios.length;

  if (!comentarios.length) {
    lista.innerHTML = '<p class="comentarios-vacio">Sé el primero en comentar ✨</p>';
    return;
  }

  lista.innerHTML = comentarios.map(c => {
    const stars = '★'.repeat(c.estrellas) + '☆'.repeat(5 - c.estrellas);
    const date = new Date(c.fecha).toLocaleDateString('es-ES', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
    const initial = (c.nombre || 'A').charAt(0).toUpperCase();
    return `
      <div class="comentario-item">
        <div class="comentario-avatar">${initial}</div>
        <div class="comentario-body">
          <div class="comentario-head">
            <span class="comentario-nombre">${c.nombre}</span>
            <span class="comentario-estrellas">${stars}</span>
          </div>
          <p class="comentario-texto">${c.texto}</p>
          <span class="comentario-fecha">${date}</span>
        </div>
      </div>
    `;
  }).join('');
}

function configurarFormComentario(productoId) {
  const form = document.getElementById('form-comentario');
  const inputNombre = document.getElementById('com-entrada-nombre');
  const inputTexto = document.getElementById('com-entrada-texto');
  const estrellas = document.querySelectorAll('.com-estrella');

  let rating = 5;

  estrellas.forEach((s, i) => {
    s.addEventListener('click', () => {
      rating = i + 1;
      estrellas.forEach((e, j) => {
        e.textContent = j < rating ? '★' : '☆';
      });
    });
    s.addEventListener('mouseenter', () => {
      estrellas.forEach((e, j) => {
        e.textContent = j <= i ? '★' : '☆';
      });
    });
    s.addEventListener('mouseleave', () => {
      estrellas.forEach((e, j) => {
        e.textContent = j < rating ? '★' : '☆';
      });
    });
  });

  form.onsubmit = async (e) => {
    e.preventDefault();
    const nombre = inputNombre.value.trim() || 'Anónimo';
    const texto = inputTexto.value.trim();
    if (!texto) return;
    await guardarComentario(productoId, nombre, texto, rating);
    inputTexto.value = '';
    if (!inputNombre.value.trim()) inputNombre.value = '';
    await renderizarComentarios(productoId);
  };
}

async function initComentarios(productoId) {
  await renderizarComentarios(productoId);
  configurarFormComentario(productoId);
}
