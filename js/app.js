function iniciarApp() {
  const galeria = document.getElementById('galeria');
  const playerView = document.getElementById('player-view');
  const librosGrid = document.getElementById('libros-grid');
  const btnVolver = document.getElementById('btn-volver');

  function mostrarGaleria() {
    galeria.classList.remove('oculto');
    playerView.classList.add('oculto');
    detenerReproduccion();
  }

  function mostrarPlayer(libroId) {
    const libro = libros.find(l => l.id === libroId);
    if (!libro) return;
    galeria.classList.add('oculto');
    playerView.classList.remove('oculto');
    cargarLibro(libro);
  }

  function renderizarGaleria() {
    if (!libros.length) {
      librosGrid.innerHTML = `
        <div id="sin-libros">
          <p>No hay audiolibros todavía</p>
          <p class="sub">Agrega tus libros en <code>js/data.js</code></p>
        </div>
      `;
      return;
    }

    librosGrid.innerHTML = libros.map(libro => `
      <div class="libro-card" data-id="${libro.id}">
        <img src="${libro.portada}" alt="${libro.titulo}" loading="lazy"
             onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 200 200%22><rect fill=%22%232a2a2a%22 width=%22200%22 height=%22200%22/><text x=%2250%%22 y=%2250%%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23666%22 font-size=%2240%22>📖</text></svg>'">
        <div class="libro-info">
          <h3>${libro.titulo}</h3>
          <p>${libro.autor}</p>
        </div>
      </div>
    `).join('');

    librosGrid.querySelectorAll('.libro-card').forEach(card => {
      card.addEventListener('click', () => mostrarPlayer(card.dataset.id));
    });
  }

  btnVolver.addEventListener('click', mostrarGaleria);
  renderizarGaleria();
}
