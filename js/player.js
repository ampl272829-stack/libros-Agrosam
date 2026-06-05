let audio = null;
let capituloActual = null;
let libroActual = null;
let capitulos = [];

function formatearTiempo(segundos) {
  if (isNaN(segundos)) return '0:00';
  const m = Math.floor(segundos / 60);
  const s = Math.floor(segundos % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function detenerReproduccion() {
  if (audio) {
    audio.pause();
    audio.src = '';
    audio = null;
  }
  capituloActual = null;
}

function cargarLibro(libro) {
  detenerReproduccion();
  libroActual = libro;
  capitulos = libro.capitulos;

  const container = document.getElementById('player-contenido');
  container.innerHTML = `
    <div id="libro-header">
      <img src="${libro.portada}" alt="${libro.titulo}"
           onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 200 200%22><rect fill=%22%232a2a2a%22 width=%22200%22 height=%22200%22/><text x=%2250%%22 y=%2250%%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23666%22 font-size=%2220%22>📖</text></svg>'">
      <div>
        <h2>${libro.titulo}</h2>
        <p class="autor">${libro.autor}</p>
      </div>
    </div>
    <div id="lista-capitulos"></div>
    <div id="reproductor">
      <div class="info-archivo">Ningún capítulo seleccionado</div>
      <div id="progreso-container">
        <span id="tiempo-actual">0:00</span>
        <input type="range" id="barra-progreso" value="0" min="0" max="100" step="0.1">
        <span id="tiempo-total">0:00</span>
      </div>
      <div id="controles">
        <button id="btn-anterior" title="Anterior">⏮</button>
        <button id="btn-play" title="Reproducir">▶</button>
        <button id="btn-siguiente" title="Siguiente">⏭</button>
        <div id="control-volumen">
          <span class="icono">🔊</span>
          <input type="range" id="barra-volumen" value="0.8" min="0" max="1" step="0.01">
        </div>
      </div>
    </div>
  `;

  renderizarCapitulos();
  configurarControles();
}

function renderizarCapitulos() {
  const lista = document.getElementById('lista-capitulos');
  lista.innerHTML = capitulos.map((cap, i) => `
    <div class="capitulo-item" data-index="${i}">
      <span class="num">${i + 1}</span>
      <span class="nombre">${cap.nombre}</span>
    </div>
  `).join('');

  lista.querySelectorAll('.capitulo-item').forEach(item => {
    item.addEventListener('click', () => {
      const idx = parseInt(item.dataset.index);
      reproducirCapitulo(idx);
    });
  });
}

function reproducirCapitulo(idx) {
  if (idx < 0 || idx >= capitulos.length) return;

  detenerReproduccion();
  capituloActual = idx;

  const cap = capitulos[idx];

  document.querySelectorAll('.capitulo-item').forEach(el => {
    el.classList.toggle('activo', parseInt(el.dataset.index) === idx);
  });

  document.querySelector('.info-archivo').textContent = `Reproduciendo: ${cap.nombre}`;

  audio = new Audio(cap.archivo);
  audio.volume = parseFloat(document.getElementById('barra-volumen').value);

  const barraProgreso = document.getElementById('barra-progreso');
  const tiempoActual = document.getElementById('tiempo-actual');
  const tiempoTotal = document.getElementById('tiempo-total');

  audio.addEventListener('loadedmetadata', () => {
    barraProgreso.max = audio.duration || 0;
    tiempoTotal.textContent = formatearTiempo(audio.duration);
  });

  audio.addEventListener('timeupdate', () => {
    if (!audio.duration) return;
    barraProgreso.value = audio.currentTime;
    tiempoActual.textContent = formatearTiempo(audio.currentTime);
  });

  audio.addEventListener('ended', () => {
    if (capituloActual < capitulos.length - 1) {
      reproducirCapitulo(capituloActual + 1);
    } else {
      document.querySelector('.info-archivo').textContent = 'Fin del audiolibro';
      document.getElementById('btn-play').textContent = '▶';
    }
  });

  audio.addEventListener('error', () => {
    document.querySelector('.info-archivo').textContent = `Error al cargar: ${cap.archivo}`;
  });

  barraProgreso.addEventListener('input', () => {
    if (audio) audio.currentTime = parseFloat(barraProgreso.value);
  });

  audio.play().then(() => {
    document.getElementById('btn-play').textContent = '⏸';
  }).catch(() => {
    document.querySelector('.info-archivo').textContent = 'Haz clic en reproducir';
  });
}

function configurarControles() {
  const btnPlay = document.getElementById('btn-play');
  const btnAnterior = document.getElementById('btn-anterior');
  const btnSiguiente = document.getElementById('btn-siguiente');
  const barraVolumen = document.getElementById('barra-volumen');

  btnPlay.addEventListener('click', () => {
    if (!audio) {
      if (capitulos.length > 0) reproducirCapitulo(0);
      return;
    }
    if (audio.paused) {
      audio.play().then(() => { btnPlay.textContent = '⏸'; });
    } else {
      audio.pause();
      btnPlay.textContent = '▶';
    }
  });

  btnAnterior.addEventListener('click', () => {
    if (capituloActual === null) return;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    reproducirCapitulo(Math.max(0, capituloActual - 1));
  });

  btnSiguiente.addEventListener('click', () => {
    if (capituloActual === null && capitulos.length > 0) {
      reproducirCapitulo(0);
      return;
    }
    reproducirCapitulo(Math.min(capitulos.length - 1, capituloActual + 1));
  });

  barraVolumen.addEventListener('input', () => {
    if (audio) audio.volume = parseFloat(barraVolumen.value);
  });
}
