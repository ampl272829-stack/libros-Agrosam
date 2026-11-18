// --- CONFIGURACIÓN ---
const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_DIR = path.join(__dirname, 'data');
const PEDIDOS_FILE = path.join(DATA_DIR, 'pedidos.json');
const PRODUCTOS_FILE = path.join(DATA_DIR, 'productos.json');

// --- AUTENTICACIÓN ADMIN ---
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'ms-admin-2026';
function adminAuth(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (!token || token !== ADMIN_TOKEN) {
    return res.status(411).json({ error: 'No autorizado: token admin inválido' });
  }
  next();
}

// --- CONFIGURACIÓN DE SUBIDA DE IMÁGENES ---
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.join(__dirname, 'img')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.svg';
    cb(null, crypto.randomBytes(8).toString('hex') + ext);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ['.svg', '.png', '.jpg', '.jpeg', '.webp'].includes(path.extname(file.originalname).toLowerCase());
    cb(null, ok);
  },
});

// --- DATA DIRECTORY ---
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(PEDIDOS_FILE)) fs.writeFileSync(PEDIDOS_FILE, '[]');
if (!fs.existsSync(PRODUCTOS_FILE)) fs.writeFileSync(PRODUCTOS_FILE, '[]');

function leerProductos() {
  let productos = JSON.parse(fs.readFileSync(PRODUCTOS_FILE, 'utf-8'));
  // Añadir stock por defecto (-1 = ilimitado) si no existe
  productos = productos.map(p => ({ ...p, stock: p.stock !== undefined ? p.stock : -1 }));
  return productos;
}
function guardarProductos(lista) {
  fs.writeFileSync(PRODUCTOS_FILE, JSON.stringify(lista, null, 2));
}
function leerPedidos() {
  return JSON.parse(fs.readFileSync(PEDIDOS_FILE, 'utf-8'));
}
// Guardar pedidos
function guardarPedidos(lista) {
  fs.writeFileSync(PEDIDOS_FILE, JSON.stringify(lista, null, 2));
}

// Estados de pedido
const ESTADOS_PEDIDO = ['pendiente', 'confirmado', 'en_preparacion', 'enviado', 'entregado', 'cancelado'];

// Descontar stock al confirmar un pedido
function descontarStock(pedido) {
  const productos = leerProductos();
  pedido.items.forEach(item => {
    const prod = productos.find(p => p.id === item.id);
    if (prod && prod.stock !== -1) {
      prod.stock -= item.cantidad;
      if (prod.stock <= 0) {
        prod.agotado = true;
      }
    }
  });
  guardarProductos(productos);
}

// Devolver stock al cancelar un pedido
function devolverStock(pedido) {
  const productos = leerProductos();
  pedido.items.forEach(item => {
    const prod = productos.find(p => p.id === item.id);
    if (prod && prod.stock !== -1) {
      prod.stock += item.cantidad;
      prod.agotado = false;
    }
  });
  guardarProductos(productos);
}

const CATEGORIAS = [
  { id: 'todos', nombre: 'Todos' }, { id: 'cargadores', nombre: 'Cargadores' },
  { id: 'cables', nombre: 'Cables' }, { id: 'fundas', nombre: 'Fundas' },
  { id: 'proteccion', nombre: 'Protección' }, { id: 'inalambrico', nombre: 'Inalámbrico' },
  { id: 'baterias', nombre: 'Baterías' },
];

app.use(express.json({ strict: false }));
app.use(express.urlencoded({ extended: true }));
app.use((req, _res, next) => {
  if (req.body === undefined) req.body = {};
  next();
});
app.use(express.static(__dirname));

// --- RUTAS DE PRODUCTOS ---
app.get('/api/productos', (req, res) => {
  const { categoria } = req.query;
  let lista = leerProductos();
  if (categoria && categoria !== 'todos') lista = lista.filter(p => p.categoria === categoria);
  res.json(lista);
});

app.get('/api/productos/:id', (req, res) => {
  const p = leerProductos().find(p => p.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Producto no encontrado' });
  res.json(p);
});

app.post('/api/productos', adminAuth, (req, res) => {
  const { nombre, descripcion, descripcionLarga, precio, categoria, stock } = req.body;
  if (!nombre || precio === undefined || !categoria) {
    return res.status(400).json({ error: 'Faltan campos: nombre, precio, categoria' });
  }
  const id = crypto.randomBytes(4).toString(36);
  const productos = leerProductos();
  const nuevo = {
    id, nombre: nombre.trim(), descripcion: (descripcion || '').trim(),
    descripcionLarga: (descripcionLarga || '').trim(), precio: Number(precio),
    categoria, img: `img/${id}.svg`,
    imagenes: [`img/${id}.svg`, `img/${id}-2.svg`, `img/${id}-3.svg`],
    stock: stock !== undefined ? stock : -1,  // -1 = ilimitado por defecto
  };
  productos.push(nuevo);
  guardarProductos(productos);
  res.status(201).json(nuevo);
});

app.put('/api/productos/:id', adminAuth, (req, res) => {
  const productos = leerProductos();
  const idx = productos.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Producto no encontrado' });
  const { nombre, descripcion, descripcionLarga, precio, categoria } = req.body;
  if (nombre !== undefined) productos[idx].nombre = nombre.trim();
  if (descripcion !== undefined) productos[idx].descripcion = descripcion.trim();
  if (descripcionLarga !== undefined) productos[idx].descripcionLarga = descripcionLarga.trim();
  if (precio !== undefined) productos[idx].precio = Number(precio);
  if (categoria !== undefined) productos[idx].categoria = categoria;
  guardarProductos(productos);
  res.json(productos[idx]);
});

app.delete('/api/productos/:id', adminAuth, (req, res) => {
  let productos = leerProductos();
  const len = productos.length;
  productos = productos.filter(p => p.id !== req.params.id);
  if (productos.length === len) return res.status(404).json({ error: 'Producto no encontrado' });
  guardarProductos(productos);
  res.json({ ok: true });
});

app.post('/api/productos/:id/imagen', adminAuth, upload.single('imagen'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se subió ninguna imagen' });
  const productos = leerProductos();
  const idx = productos.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Producto no encontrado' });
  const url = 'img/' + req.file.filename;
  productos[idx].img = url;
  if (productos[idx].imagenes) {
    productos[idx].imagenes = [url, ...productos[idx].imagenes.slice(1)];
  } else {
    productos[idx].imagenes = [url, url, url];
  }
  guardarProductos(productos);
  res.json({ ok: true, url });
});

// --- RUTAS DE CATEGORÍAS ---
app.get('/api/categorias', (_req, res) => res.json(CATEGORIAS));

// --- RUTAS DE PEDIDOS ---
app.post('/api/pedidos', adminAuth, (req, res) => {
  const { nombre, telefono, direccion, notas, items } = req.body || {};
  if (!nombre || !telefono || !direccion || !items?.length) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }
  const prods = leerProductos();
  // Validar stock antes de crear el pedido
  let stockOK = true;
  items.forEach(item => {
    const prod = prods.find(p => p.id === item.id);
    if (prod && prod.stock !== -1 && prod.stock < item.cantidad) {
      stockOK = false;
    }
  });
  if (!stockOK) {
    return res.status(400).json({ error: 'Stock insuficiente para algunos productos del carrito' });
  }
  const pedido = {
    id: crypto.randomUUID().slice(0, 8),
    fecha: new Date().toISOString(),
    nombre: nombre.trim(), telefono: telefono.trim(), direccion: direccion.trim(), notas: (notas || '').trim(),
    items: items.map(item => {
      const prod = prods.find(p => p.id === item.id);
      return { id: item.id, nombre: prod?.nombre || item.id, precio: prod?.precio || 0, cantidad: item.cantidad, subtotal: (prod?.precio || 0) * item.cantidad };
    }),
    total: items.reduce((sum, item) => sum + ((prods.find(p => p.id === item.id)?.precio || 0) * item.cantidad), 0),
    estado: 'pendiente'  // Estado inicial
  };
  const pedidos = leerPedidos();
  pedidos.unshift(pedido);
  guardarPedidos(pedidos);
  // Descontar stock al crear el pedido
  descontarStock(pedido);
  res.status(201).json({ ok: true, id: pedido.id, estado: 'pendiente' });
});

app.get('/api/pedidos', adminAuth, (_req, res) => res.json(leerPedidos()));

app.delete('/api/pedidos/:id', adminAuth, (req, res) => {
  let pedidos = leerPedidos();
  const len = pedidos.length;
  pedidos = pedidos.filter(p => p.id !== req.params.id);
  if (pedidos.length === len) return res.status(404).json({ error: 'Pedido no encontrado' });
  guardarPedidos(pedidos);
  res.json({ ok: true });
});

// --- GESTIÓN DE ESTADOS DE PEDIDO ---

function confirmarPedido(idPedido, res) {
  let pedidos = leerPedidos();
  const pedido = pedidos.find(p => p.id === idPedido);
  if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });
  if (pedido.estado !== 'pendiente') {
    return res.status(400).json({ error: 'Solo se pueden confirmar pedidos con estado pendiente' });
  }
  pedido.estado = 'confirmado';
  descontarStock(pedido);
  guardarPedidos(pedidos);
  res.json({ ok: true, estado: 'confirmado' });
}

function cancelarPedido(idPedido, res) {
  let pedidos = leerPedidos();
  const pedido = pedidos.find(p => p.id === idPedido);
  if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });
  if (pedido.estado !== 'pendiente' && pedido.estado !== 'confirmado') {
    return res.status(400).json({ error: 'Solo se pueden cancelar pedidos con estado pendiente o confirmado' });
  }
  pedido.estado = 'cancelado';
  devolverStock(pedido);
  guardarPedidos(pedidos);
  res.json({ ok: true, estado: 'cancelado' });
});

// --- INICIO SERVIDOR ---


// --- INICIO SERVIDOR ---
app.listen(PORT, () => {
  console.log(`M&S Store API en http://localhost:${PORT}`);
