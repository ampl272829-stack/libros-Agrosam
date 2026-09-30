let libroActual = null;

function cargarLibro(libro) {
  libroActual = libro;

  const container = document.getElementById('reader-contenido');
  container.innerHTML = `
    <div id="libro-header">
      <img src="${libro.portada}" alt="${libro.titulo}"
           onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 200 200%22><rect fill=%22%232a2a2a%22 width=%22200%22 height=%22200%22/><text x=%2250%%22 y=%2250%%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23666%22 font-size=%2220%22>📖</text></svg>'">
      <div>
        <h2>${libro.titulo}</h2>
        <p class="autor">${libro.autor}</p>
        ${libro.descripcion ? `<p class="descripcion">${libro.descripcion}</p>` : ''}
      </div>
    </div>
    <div id="pdf-actions">
      <a href="${libro.pdf}" target="_blank" class="btn-pdf" download>📥 Descargar PDF</a>
      <a href="${libro.pdf}" target="_blank" class="btn-pdf btn-abrir">📖 Abrir en nueva pestaña</a>
    </div>
    <div id="pdf-viewer">
      <embed src="${libro.pdf}" type="application/pdf" id="pdf-embed">
    </div>
  `;
}
