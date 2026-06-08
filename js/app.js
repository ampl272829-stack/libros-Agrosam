function iniciarApp() {
  const galeria = document.getElementById('galeria');
  const readerView = document.getElementById('reader-view');
  const librosGrid = document.getElementById('libros-grid');
  const btnVolver = document.getElementById('btn-volver');

  function mostrarGaleria() {
    galeria.classList.remove('oculto');
    readerView.classList.add('oculto');
  }

  function mostrarReader(libroId) {
    const libro = libros.find(l => l.id === libroId);
    if (!libro) return;
    galeria.classList.add('oculto');
    readerView.classList.remove('oculto');
    cargarLibro(libro);
  }

  function mostrarProximamente() {
    galeria.classList.add('oculto');
    readerView.classList.remove('oculto');
    document.getElementById('reader-contenido').innerHTML = `
      <div class="prox-details" style="text-align: center; padding: 2rem;">
        <h2>Próximamente</h2>
        <p style="margin: 1rem 0; color: #ccc;">Estamos preparando algo muy especial para ti.</p>
        <p style="margin: 1rem 0; color: #ccc;">Mantente atento a nuestras redes sociales para más novedades y el lanzamiento oficial.</p>
        <div class="prox-img-wrap" style="max-width: 400px; margin: 2rem auto; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
            <img src="portadas/agrosam.jpg" alt="Próximamente" style="width: 100%; height: auto; display: block;">
        </div>
      </div>
    `;
  }

  function renderizarGaleria() {
    if (!libros.length) {
      librosGrid.innerHTML = `
        <div id="sin-libros">
          <p>No hay libros todavía</p>
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
    `).join('') + `
      <div class="libro-card prox-card">
        <img src="portadas/agrosam.jpg" alt="Próximamente">
        <div class="libro-info">
          <h3>Próximamente</h3>
          <p>Pronto, atento a redes</p>
        </div>
      </div>
    `;

    librosGrid.querySelectorAll('.libro-card:not(.prox-card)').forEach(card => {
      card.addEventListener('click', () => mostrarReader(card.dataset.id));
    });
    
    librosGrid.querySelector('.prox-card').addEventListener('click', mostrarProximamente);
  }

  btnVolver.addEventListener('click', mostrarGaleria);
  renderizarGaleria();
}
