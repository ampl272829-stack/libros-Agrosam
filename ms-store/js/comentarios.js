const COMENTARIOS_KEY = 'mp_comentarios';

function obtenerComentarios(productoId) {
  const data = JSON.parse(localStorage.getItem(COMENTARIOS_KEY) || '{}');
  return data[productoId] || [];
}

function guardarComentario(productoId, nombre, texto, estrellas) {
  const data = JSON.parse(localStorage.getItem(COMENTARIOS_KEY) || '{}');
  if (!data[productoId]) data[productoId] = [];
  data[productoId].unshift({
    id: Date.now(),
    nombre: nombre.trim() || 'Anónimo',
    texto: texto.trim(),
    estrellas: Math.min(5, Math.max(1, Math.round(estrellas))),
    fecha: new Date().toISOString(),
  });
  localStorage.setItem(COMENTARIOS_KEY, JSON.stringify(data));
}

function renderizarComentarios(productoId) {
  const lista = document.getElementById('comentarios-lista');
  const contador = document.getElementById('comentarios-contador');
  const comentarios = obtenerComentarios(productoId);

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
    const initial = c.nombre.charAt(0).toUpperCase();
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

  form.onsubmit = (e) => {
    e.preventDefault();
    const nombre = inputNombre.value.trim() || 'Anónimo';
    const texto = inputTexto.value.trim();
    if (!texto) return;
    guardarComentario(productoId, nombre, texto, rating);
    inputTexto.value = '';
    if (!inputNombre.value.trim()) inputNombre.value = '';
    renderizarComentarios(productoId);
  };
}

function initComentarios(productoId) {
  renderizarComentarios(productoId);
  configurarFormComentario(productoId);
}
