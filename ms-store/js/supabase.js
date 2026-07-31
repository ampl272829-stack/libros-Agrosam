// --- Cliente Supabase vía REST (sin SDK) ---
// Se usa solo si SUPABASE_URL y SUPABASE_ANON_KEY están configurados.

const USAR_SUPABASE = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

function sbHeaders(token) {
  const h = {
    'apikey': SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
  };
  if (token) h['Authorization'] = 'Bearer ' + token;
  return h;
}

async function sbREST(path, opts = {}) {
  const res = await fetch(SUPABASE_URL + path, {
    method: opts.method || 'GET',
    headers: sbHeaders(opts.token),
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) throw new Error('Supabase ' + res.status);
  if (res.status === 204) return null;
  return res.json();
}

function sbProductoDesde(o) {
  return {
    id: o.id,
    nombre: o.nombre,
    descripcion: o.descripcion || '',
    descripcionLarga: o.descripcion_larga || '',
    precio: Number(o.precio),
    categoria: o.categoria,
    img: o.img || 'img/placeholder.svg',
    imagenes: Array.isArray(o.imagenes) ? o.imagenes : [],
    visible: o.visible !== false,
    agotado: !!o.agotado,
  };
}

function sbProductoHacia(p) {
  return {
    nombre: p.nombre,
    descripcion: p.descripcion || '',
    descripcion_larga: p.descripcionLarga || '',
    precio: Number(p.precio),
    categoria: p.categoria,
    img: p.img || 'img/placeholder.svg',
    imagenes: p.imagenes || [],
    visible: p.visible !== false,
    agotado: !!p.agotado,
  };
}

async function sbLogin(email, pass) {
  const res = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: pass }),
  });
  if (!res.ok) throw new Error('Credenciales inválidas');
  const data = await res.json();
  return data.access_token;
}

async function sbProductos() {
  const data = await sbREST('/rest/v1/productos?select=*');
  return data.map(sbProductoDesde);
}

async function sbExisteProducto(id) {
  const data = await sbREST('/rest/v1/productos?select=id&id=eq.' + encodeURIComponent(id));
  return data.length > 0;
}

async function sbGuardarProducto(p, token) {
  const body = sbProductoHacia(p);
  if (await sbExisteProducto(p.id)) {
    await sbREST('/rest/v1/productos?id=eq.' + encodeURIComponent(p.id), { method: 'PATCH', body, token });
  } else {
    await sbREST('/rest/v1/productos', { method: 'POST', body: Object.assign({ id: p.id }, body), token });
  }
}

async function sbEliminarProducto(id, token) {
  await sbREST('/rest/v1/productos?id=eq.' + encodeURIComponent(id), { method: 'DELETE', token });
}

async function sbCrearPedido(pedido) {
  await sbREST('/rest/v1/pedidos', {
    method: 'POST',
    body: {
      id: pedido.id,
      fecha: pedido.fecha,
      nombre: pedido.nombre,
      telefono: pedido.telefono,
      direccion: pedido.direccion,
      notas: pedido.notas || '',
      items: pedido.items,
      total: pedido.total,
    },
  });
}

async function sbPedidos() {
  return sbREST('/rest/v1/pedidos?select=*&order=fecha.desc');
}

async function sbEliminarPedido(id, token) {
  await sbREST('/rest/v1/pedidos?id=eq.' + encodeURIComponent(id), { method: 'DELETE', token });
}

async function sbSubirImagen(file, token) {
  const ext = (file.name.split('.').pop() || 'png').toLowerCase();
  const nombre = 'prod-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7) + '.' + ext;
  const res = await fetch(SUPABASE_URL + '/storage/v1/object/imagenes/' + nombre, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: 'Bearer ' + token,
      'Content-Type': file.type || 'application/octet-stream',
    },
    body: file,
  });
  if (!res.ok) throw new Error('Error al subir imagen');
  return SUPABASE_URL + '/storage/v1/object/public/imagenes/' + nombre;
}
