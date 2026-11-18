// ============================================================
// M&S Store — Asistente IA (sin generación de imágenes)
// Chat de atención (Gemini) + builder de WhatsApp.
// ============================================================

/* --- Utilidades de UI --- */
let _iaToastTimer = null;

function iaToast(mensaje) {
  const el = document.getElementById('toast');
  if (el) {
    el.textContent = mensaje;
    el.classList.remove('oculto');
    clearTimeout(_iaToastTimer);
    _iaToastTimer = setTimeout(() => el.classList.add('oculto'), 2500);
    return;
  }
  alert(mensaje);
}

async function iaCopiar(texto, mensaje) {
  try {
    await navigator.clipboard.writeText(texto);
  } catch (e) {
    const ta = document.createElement('textarea');
    ta.value = texto;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
  iaToast(mensaje);
}

/* ---------- Modal ---------- */

function toggleAiModal() {
  const modal = document.getElementById('ia-modal');
  const abierto = modal.classList.contains('ia-abierto');
  modal.classList.toggle('ia-abierto');
  document.body.style.overflow = abierto ? '' : 'hidden';
  if (!abierto) {
    const input = document.getElementById('ia-user-input');
    if (input) input.focus();
  }
}

function iaCerrarModal() {
  const modal = document.getElementById('ia-modal');
  modal.classList.remove('ia-abierto');
  document.body.style.overflow = '';
}

function openAiModal() {
  toggleAiModal();
}

function switchAiTab(nombre) {
  ['chat', 'wa'].forEach(t => {
    const pane = document.getElementById('ia-pane-' + t);
    const tab = document.getElementById('ia-tab-' + t);
    if (pane) pane.classList.remove('ia-activo');
    if (tab) tab.classList.remove('ia-activo');
  });
  const pane = document.getElementById('ia-pane-' + nombre);
  const tab = document.getElementById('ia-tab-' + nombre);
  if (pane) pane.classList.add('ia-activo');
  if (tab) tab.classList.add('ia-activo');
}

let iaDestino = '584128991929';

function openAiWaBuilder(numero) {
  iaDestino = numero;
  const lbl = document.getElementById('ia-numero-destino');
  if (lbl) lbl.textContent = 'Enviando a: +' + numero;
  toggleAiModal();
  switchAiTab('wa');
}

/* ---------- Fetch con reintentos (backoff exponencial) ---------- */
// No reintenta en cola de 429: quemar retries contra el límite gratuito no ayuda.
async function iaFetch(url, options, maxReintentos = 1) {
  let delay = 800;
  for (let i = 0; i <= maxReintentos; i++) {
    try {
      const res = await fetch(url, options);
      if (res.ok) return res;
      if (res.status === 429) return res;
      if (res.status >= 400 && res.status < 500) return res;
      if (i === maxReintentos) return res;
    } catch (e) {
      if (i === maxReintentos) throw e;
    }
    await new Promise(r => setTimeout(r, delay));
    delay *= 2;
  }
  return fetch(url, options);
}

/* ---------- Chat Gemini ---------- */
// Contexto por historial nativo: guardamos los mensajes reales (iaMensajes) y
// se envían a Gemini como `contents` (1 llamada por turno). Si se supera el
// tope, los más antiguos se condensan en un resumen compacto (iaPrevio) solo
// en ese momento, para no crecer el histórico ni gastar llamadas por turno.
const IA_MAX_HISTORIA = 16;
const IA_MAX_LONG_MSG = 900;    // chars por mensaje guardado (para no inflar el payload)
const IA_MAX_PREVIO = 700;      // chars máx. del resumen de lo antiguo
const KEY_IA_MENSAJES = 'ms_ia_mensajes_v3';

const KEY_IA_PREVIO = 'ms_ia_previo_v3';
// Recorta un texto a un máximo de caracteres (para payloads pequeños).
function iaRecortarTexto(texto, max) {
  if (!texto || texto.length <= max) return texto;
  return texto.slice(0, max);
}

let iaMensajes = [];
let iaPrevio = '';
let iaProductoObjetivo = null;
let iaProductosObjetivo = [];
try {
  const raw = JSON.parse(localStorage.getItem(KEY_IA_MENSAJES) || '[]');
  if (Array.isArray(raw)) {
    iaMensajes = raw
      .filter(m => m && (m.role === 'user' || m.role === 'model') && Array.isArray(m.parts))
      .map(m => ({ role: m.role, parts: m.parts.map(p => ({ text: iaRecortarTexto(p.text, IA_MAX_LONG_MSG) })) }))
      .slice(-IA_MAX_HISTORIA);
  }
  iaPrevio = iaRecortarTexto(localStorage.getItem(KEY_IA_PREVIO) || '', IA_MAX_PREVIO);
} catch (e) {
  // Si localStorage trae datos corruptos, empezamos de cero.
}

function iaGuardarEstado() {
  try {
    localStorage.setItem(KEY_IA_MENSAJES, JSON.stringify(iaMensajes.slice(-IA_MAX_HISTORIA).map(m => ({ role: m.role, parts: m.parts.map(p => ({ text: iaRecortarTexto(p.text, IA_MAX_LONG_MSG) })) }))));
    localStorage.setItem(KEY_IA_PREVIO, iaRecortarTexto(iaPrevio, IA_MAX_PREVIO));
  } catch (e) { /* almacenamiento no disponible */ }
}

function iaScrollChatAbajo() {
  // #ia-chat es el contenedor con overflow-y que realmente hace scroll.
  const history = document.getElementById('ia-chat');
  requestAnimationFrame(() => {
    if (history) history.scrollTop = history.scrollHeight;
  });
}

// Extrae la frase que indica para qué modelos/equipos sirve el producto.
function iaCompatibilidad(p) {
  const texto = (p.descripcionLarga || p.descripcion || '').trim().replace(/\s+/g, ' ');
  const oraciones = texto.split(/(?<=[.!?])\s+/).filter(Boolean);
  return (
    oraciones.find(o => /compatib/i.test(o)) ||
    oraciones.find(o => /(desde el|hasta el|sirve para|funciona con|modelos de|iphone\s*\d|solo para)/i.test(o)) ||
    ''
  ).trim();
}

// Frase corta de compatibilidad (máx ~50 caracteres).
function iaCompatCorto(compat) {
  if (!compat) return '';
  let limpio = compat;
  const idx = limpio.toLowerCase().indexOf('compatible');
  if (idx > 0) limpio = limpio.slice(idx);
  limpio = limpio.replace(/^compatible\s+con\s+/i, '');
  const corta = limpio.trim().replace(/\s+/g, ' ');
  return corta.length > 50 ? corta.slice(0, 50).replace(/\s\S*$/, '') + '…' : corta;
}

// Clasifica el producto en plataformas (para filtrar por consulta).
function iaEsIphone(p) {
  const t = (p.nombre + ' ' + (iaCompatibilidad(p) || p.categoria || '')).toLowerCase();
  return /iphone|lightning|apple/i.test(t);
}

function iaEsAndroid(p) {
  const t = (p.nombre + ' ' + (iaCompatibilidad(p) || p.categoria || '')).toLowerCase();
  return /android|tecno|infinix|xiaomi|samsung|redmi/i.test(t);
}

function iaEsCargador(p) {
  const t = (p.nombre + ' ' + (p.categoria || '')).toLowerCase();
  return /cargador|carga|charger/i.test(t);
}

// Detecta la intención de la consulta del usuario por palabras clave.
function iaIntencion(texto) {
  const t = texto.toLowerCase();
  return {
    iphone: /iphone/i.test(t),
    android: /(android|tecno|infinix|xiaomi|samsung|redmi)/i.test(t),
    cargador: /(cargador|carga)/i.test(t),
    funda: /(funda|protector|coraza|carcasa)/i.test(t),
    cable: /(cable)/i.test(t),
  };
}

// Catálogo compacto y filtrado por consulta. Solo manda lo relevante:
// Compatibilidad (sí/no) por producto, sin descripciones largas.
function iaCatalogoParaContexto(textoUsuario) {
  if (typeof productos === 'undefined' || !Array.isArray(productos)) {
    return 'Catálogo no disponible.';
  }
  const todos = productos.filter(p => p.visible !== false);

let seleccion = todos;
  const n = iaIntencion(textoUsuario || '');
  if (n.cargador && n.iphone) {
    // "cargador de iphone": mandar solo cargadores compatibles con iPhone.
    seleccion = todos.filter(p => iaEsCargador(p) && iaEsIphone(p));
  } else if (n.cargador) {
    seleccion = todos.filter(iaEsCargador);
  } else if (n.iphone) {
    seleccion = todos.filter(p => iaEsIphone(p) || iaEsCargador(p));
  }

  if (n.android && !n.iphone) {
    seleccion = todos.filter(p => !iaEsIphone(p) && (iaEsAndroid(p) || iaEsCargador(p)));
  }
  if (n.funda) seleccion = todos.filter(p => !iaEsCargador(p));
  if (n.cable) seleccion = todos.filter(p => /cable|usb-c/i.test(p.nombre + ' ' + (p.categoria || '')));

  // Si sin filtro reconocido quedó vacío o es saludo, manda el catálogo completo compacto.
  if (!seleccion.length) seleccion = todos;

  const lineas = seleccion.map(p => {
    const estado = p.agotado ? 'AGOTADO' : 'Disponible';
    const compat = iaCompatCorto(iaCompatibilidad(p));
    return `- [ID:${p.id}] ${p.nombre} | $${Number(p.precio).toFixed(2)} | ${estado}` + (compat ? ` | Compatibilidad: ${compat}` : '');
  });
  return 'Catálgo de productos disponibles (usa la compatibilidad para recomendar):\n' + lineas.join('\n');
}

// Condensa el exceso de historial en un resumen compacto. Solo se llama cuando
// la conversación rebasa el tope; la llamada extra es ocasional, no por turno.
async function iaCondensarHistoria() {
  if (iaMensajes.length <= IA_MAX_HISTORIA) return;
  const sobrante = iaMensajes.length - IA_MAX_HISTORIA;
  const viejos = iaMensajes.splice(0, sobrante);
  const textoViejos = viejos
    .map(m => (m.role === 'user' ? 'Usuario: ' : 'Asistente: ') + m.parts.map(p => p.text).join(' '))
    .join('\n');
  const prompt =
    (iaPrevio ? 'Resumen actual de la conversación:\n' + iaPrevio + '\n\n' : '') +
    'Mensajes recientes de la conversación:\n' + textoViejos + '\n\n' +
    'Genera un resumen breve en español de TODA la conversación mantenida hasta ahora ' +
    '(máximo 120 palabras), conservando los datos importantes: productos, precios, envíos, ' +
    'disponibilidad y preferencias del cliente. Responde SOLO con el resumen, sin saludos ni comentarios extra.';
  let url, body, headers;
  if (IA_PROVIDER === 'nvidia' && IA_API_KEY) {
    url = `${IA_BASE_URL}/chat/completions`;
    headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${IA_API_KEY}` };
    body = JSON.stringify({
      model: IA_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 300,
      stream: false,
    });
  } else {
    url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_CHAT_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    headers = { 'Content-Type': 'application/json' };
    body = JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] });
  }
  // Rate limit: la condensación también consume llamadas de la API.
  if (!rlPermitir('ms-ia-condensar', { minMs: 10000, porHora: 20, porDia: 100 }).ok) {
    iaMensajes = viejos.concat(iaMensajes);
    iaGuardarEstado();
    return;
  }
  try {
    const res = await iaFetch(url, {
      method: 'POST',
      headers,
      body,
    });
    const data = await res.json();
    const s = (IA_PROVIDER === 'nvidia'
      ? data?.choices?.[0]?.message?.content
      : data?.candidates?.[0]?.content?.parts?.[0]?.text);
    if (s && s.trim()) iaPrevio = s.trim();
  } catch (e) {
    // Si falla, no perdemos el histórico: restauramos los mensajes viejos.
    iaMensajes = viejos.concat(iaMensajes);
  }
  iaGuardarEstado();
}

async function sendAiMessage() {
  const input = document.getElementById('ia-user-input');
  const history = document.getElementById('ia-chat');
  if (!input || !history) return;
  const texto = input.value.trim();
  if (!texto) return;

  // Rate limit: cooldown entre envíos + topes por hora/día (config-ia.js).
  const rl = rlPermitir('ms-ia-chat', {
    minMs: (IA_MIN_SEGUNDOS_ENTRE || 3) * 1000,
    porHora: IA_MAX_POR_HORA || 60,
    porDia: IA_MAX_POR_DIA || 300,
  });
  if (!rl.ok) {
    iaToast('⏳ ' + rlMensaje(rl.motivo));
    return;
  }

  // Bloquea el botón de envío mientras el asistente responde.
  const btnEnviar = document.getElementById('ia-enviar');
  if (btnEnviar) btnEnviar.disabled = true;
  const restaurarBtn = () => { if (btnEnviar) btnEnviar.disabled = false; };

  const userMsg = document.createElement('div');
  userMsg.className = 'ia-msg ia-msg-usuario';
  userMsg.textContent = texto;
  history.appendChild(userMsg);

  input.value = '';
  history.scrollTop = history.scrollHeight;

  const loadingMsg = document.createElement('div');
  loadingMsg.className = 'ia-msg ia-msg-asistente ia-msg-cargando';
  loadingMsg.textContent = 'El asistente está respondiendo...';
  history.appendChild(loadingMsg);
  iaScrollChatAbajo();

  if (!GEMINI_API_KEY && !IA_API_KEY) {
    loadingMsg.textContent = 'El asistente IA no está configurado aún. Contacta por WhatsApp.';
    restaurarBtn();
    return;
  }

  try {
    iaMensajes.push({ role: 'user', parts: [{ text: iaRecortarTexto(texto, IA_MAX_LONG_MSG) }] });
    if (iaMensajes.length > IA_MAX_HISTORIA) await iaCondensarHistoria();

    const contexto = 'Catálogo actual (usa solo estos productos, con su compatibilidad):\n' + iaCatalogoParaContexto(texto);

    let url, payload, headers;
    if (IA_PROVIDER === 'nvidia' && IA_API_KEY) {
      // Endpoint compatible con OpenAI (NVIDIA build.nvidia.com).
      const partesSystem = [IA_SYSTEM_PROMPT];
      if (iaPrevio) partesSystem.push('Este es un resumen de lo hablado antes en esta conversación. Úsalo como contexto y no repitas información que ya diste:\n' + iaPrevio);
      partesSystem.push('Catálogo actual (usa solo estos productos, con su compatibilidad):\n' + iaCatalogoParaContexto(texto));
      const msgs = [{ role: 'system', content: partesSystem.join('\n\n') }];
      iaMensajes.slice(-IA_MAX_HISTORIA).forEach(m => {
        const role = m.role === 'model' ? 'assistant' : 'user';
        const content = iaRecortarTexto(m.parts.map(p => p.text || '').join(' '), IA_MAX_LONG_MSG);
        if (content) msgs.push({ role, content });
      });
      payload = {
        model: IA_MODEL,
        messages: msgs,
        temperature: 0.6,
        top_p: 0.95,
        max_tokens: IA_MAX_TOKENS,
        reasoning_budget: typeof IA_REASONING_BUDGET === 'number' ? IA_REASONING_BUDGET : 0,
        stream: false,
      };
      url = `${IA_BASE_URL}/chat/completions`;
    } else {
      // Google Gemini.
      const systemParts = [{ text: IA_SYSTEM_PROMPT }, { text: contexto }];
      if (iaPrevio) {
        systemParts.push({ text: 'Este es un resumen de lo hablado antes en esta conversación. Úsalo como contexto y no repitas información que ya diste:\n' + iaPrevio });
      }
      payload = {
        contents: iaMensajes.slice(-IA_MAX_HISTORIA).map(m => ({ role: m.role, parts: m.parts.map(p => ({ text: iaRecortarTexto(p.text, IA_MAX_LONG_MSG) })) })),
        systemInstruction: { parts: systemParts },
      };
      url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_CHAT_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    }

    const res = await iaFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(IA_PROVIDER === 'nvidia' ? { 'Authorization': `Bearer ${IA_API_KEY}` } : {}) },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    let aiText;
    if (res.status === 429) {
      const detalle = String(data?.error?.message || data?.message || '');
      const resumen429 = String(data?.error?.status || data?.code || '');
      const esDiario = /perday|current quota|billing|inactive|credit/i.test(detalle) || /perday|free ?tier|credit/i.test(JSON.stringify(data?.error?.details || ''));
      console.error('[IA] 429 Cuota:', detalle.split('\n')[0] || resumen429, '| diario =', esDiario);
      if (esDiario) {
        aiText = 'Llegué al límite de mensajes gratis de la IA del proveedor. 😕 Esto no suele recuperarse en minutos: vuelve más tarde o revisa el plan/creditos del proveedor.';
      } else {
        aiText = 'Por ahora he alcanzado un límite de mensajes de la IA. 😅 Espera un momentico y vuelve a intentarlo (en menos de un minuto estoy de vuelta).';
      }
    } else if (!res.ok) {
      // Cualquier error distinto de 429 (auth, modelo no disponible...).
      const detalle = String(data?.error?.message || data?.message || data?.detail || '');
      console.error('[IA] Error HTTP', res.status, '-', data);
      aiText = 'Estoy teniendo un problema de configuración del chat (código ' + res.status + '). Si sigues viendo esto, avísale al equipo de la tienda.';
      console.warn('[IA] Detalle:', detalle.split('\n')[0]);
    } else {
      aiText = (IA_PROVIDER === 'nvidia'
          ? data?.choices?.[0]?.message?.content
          : data?.candidates?.[0]?.content?.parts?.[0]?.text) ||
        'Lo siento, no pude responder en este momento. Por favor intenta de nuevo.';
    }

    // Los ids embebidos por la IA (etiqueta [ID:xxx]) son la fuente más confiable.
    const productoEtiquetado = iaExtraerProductoDeAi(aiText);
    const productosEtiquetados = iaExtraerProductosDeAi(aiText);
    const textoLimpio = iaDedupeTexto(iaLimpiarEtiqueta(aiText)) || 'Listo.';

    iaMensajes.push({ role: 'model', parts: [{ text: iaRecortarTexto(textoLimpio, IA_MAX_LONG_MSG) }] });
    iaGuardarEstado();
    if (productoEtiquetado) {
      iaProductoObjetivo = productoEtiquetado;
      if (productosEtiquetados.length) {
        iaProductosObjetivo = productosEtiquetados;
      } else {
        iaProductosObjetivo = [productoEtiquetado];
      }
    } else {
      const objetivoFresco = iaProductoEnContexto();
      if (objetivoFresco) iaProductoObjetivo = objetivoFresco;
    }

    history.removeChild(loadingMsg);
    const msg = document.createElement('div');
    msg.className = 'ia-msg ia-msg-asistente';

    const head = document.createElement('div');
    head.className = 'ia-msg-cabecera';
    const strong = document.createElement('strong');
    strong.textContent = IA_NOMBRE_ASISTENTE + ':';
    head.appendChild(strong);

    const body = document.createElement('div');
    body.textContent = textoLimpio;

    msg.appendChild(head);
    msg.appendChild(body);
    msg.appendChild(iaCrearBotonCompra());
    history.appendChild(msg);
  } catch (err) {
    history.removeChild(loadingMsg);
    const errMsg = document.createElement('div');
    errMsg.className = 'ia-msg ia-msg-asistente';
    errMsg.textContent = 'Hubo un error de conexión con la IA. Intenta de nuevo o contacta por WhatsApp.';
    history.appendChild(errMsg);
  }
  restaurarBtn();
  iaScrollChatAbajo();
}

/* ---------- Builder de WhatsApp ---------- */
const IA_PLANTILLAS_WA = {
  catalogo: '¡Hola M&S Store! Quisiera consultar la disponibilidad del catálogo actual de accesorios y precios. Gracias.',
  envio: '¡Hola! Quiero saber el costo de envío e información de entregas para mi zona desde Maracay.',
  horario: '¡Hola! Quiero confirmar el horario de atención y el tiempo estimado de entrega.',
  asesoria: '¡Hola M&S! Me gustaría recibir asesoría para elegir el accesorio correcto para mi dispositivo.',
};

// Botón "Concretar compra": agrega el producto hablado al carrito y abre el formulario.
function iaCrearBotonCompra() {
  const acciones = document.createElement('div');
  acciones.className = 'ia-msg-acciones';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'ia-btn-comprar';
  btn.innerHTML = '<svg class="ia-icono-stroke" viewBox="0 0 24 24"><path d="M7 7h10l2 3H5l2-3zm-2 4h14l-2 8H7l-2-8z"></path></svg> Concretar compra';
  btn.setAttribute('aria-label', 'Agregar al carrito el producto y abrir el formulario de pedido');
  btn.addEventListener('click', () => iaConcretarCompra());
  acciones.appendChild(btn);
  return acciones;
}

// Extrae TODOS los productos que la IA marcó con la etiqueta [ID:xxx] (método robusto).
// Recolecta cada uno en el orden en que aparecen, sin duplicados.
function iaExtraerProductosDeAi(texto) {
  if (typeof productos === 'undefined') return [];
  const ids = String(texto || '').match(/\[ID:([\w-]+)\]/g) || [];
  const encontrados = [];
  const vistos = new Set();
  ids.forEach(tag => {
    const m = tag.match(/\[ID:([\w-]+)\]/);
    if (m && !vistos.has(m[1])) {
      vistos.add(m[1]);
      const prod = productos.find(p => p.id === m[1]);
      if (prod) encontrados.push(prod);
    }
  });
  return encontrados;
}

// Último producto etiquetado (compatibilidad con el código anterior).
function iaExtraerProductoDeAi(texto) {
  const encontrados = iaExtraerProductosDeAi(texto);
  return encontrados.length ? encontrados[encontrados.length - 1] : null;
}

// Quita la etiqueta [ID:xxx] para no mostrarla en el chat.
function iaLimpiarEtiqueta(texto) {
  return String(texto || '').replace(/\s*\[ID:[\w-]+\]\s*/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

// Elimina frases duplicadas consecutivas de una respuesta.
// El modelo a veces repite la misma idea (disponibilidad, precio...); esto lo
// limpia comparando cada frase con la anterior (sin acentos ni mayúsculas).
function iaDedupeTexto(texto) {
  if (!texto) return texto;
  const normalizar = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  const frases = String(texto).replace(/\s+/g, ' ').split(/(?<=[.!?;\n])\s+|\n+/).map(s => s.trim()).filter(Boolean);
  if (!frases.length) return texto;
  const resultado = [frases[0]];
  for (let i = 1; i < frases.length; i++) {
    const actual = normalizar(frases[i]);
    const anterior = normalizar(resultado[resultado.length - 1]);
    // Coincidencia exacta o alta similitud (primera parte igual).
    const coinciden = actual.length > 12 && anterior.length > 12 &&
      (actual === anterior || actual.slice(0, Math.floor(actual.length * 0.6)) === anterior.slice(0, Math.floor(anterior.length * 0.6)));
    if (!coinciden) resultado.push(frases[i]);
  }
  return resultado.join(' ');
}

const IA_PALABRAS_IRRELEVANTES = new Set([
  'de', 'del', 'la', 'el', 'los', 'las', 'un', 'una', 'unos', 'unas',
  'para', 'con', 'al', 'en', 'y', 'pack', 'pulgadas', '1416', '123',
]);
function iaTokensNombre(p) {
  return String(p.nombre)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(w => w.length >= 3 && !IA_PALABRAS_IRRELEVANTES.has(w));
}

// Último producto mencionado en la conversación (para agregarlo al carrito).
// Puntuación por tokens: cuenta cuántas palabras significativas del nombre
// aparecen en el texto, eligiendo el producto con más coincidencias.
function iaProductoEnContexto() {
  if (typeof productos === 'undefined' || !Array.isArray(productos)) return null;
  const texto = (iaMensajes || [])
    .filter(m => m && (m.role === 'user' || m.role === 'model'))
    .map(m => m.parts.map(p => p.text || '').join(' '))
    .join(' \n ');
  if (!texto) return null;
  const normalizar = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const t = normalizar(texto);
  let mejor = null;
  let mejorPuntos = 0;
  let ultimaPos = -1;
  productos.forEach(p => {
    if (p.visible === false || p.agotado) return;
    const toks = iaTokensNombre(p);
    if (!toks.length) return;
    const puntos = toks.filter(w => t.includes(w)).length;
    const pos = (() => {
      let last = -1;
      toks.forEach(w => { const i = t.lastIndexOf(w); if (i > last) last = i; });
      return last;
    })();
    if (puntos > mejorPuntos || (puntos === mejorPuntos && pos > ultimaPos)) {
      mejor = p;
      mejorPuntos = puntos;
      ultimaPos = pos;
    }
  });
  return mejorPuntos >= 1 ? mejor : null;
}

// Muestra el formulario de pedido (checkout) y cierra el modal de IA.
// Reutiliza el mismo flujo que el botón "Ir a pagar" de la tienda.
function iaParaFormulario() {
  iaCerrarModal();
  document.body.style.overflow = '';
  const btn = document.getElementById('btn-checkout');
  if (btn) {
    btn.click();
  } else if (typeof mostrarResumenCheckout === 'function') {
    const tienda = document.getElementById('tienda');
    const checkoutView = document.getElementById('checkout-view');
    const cartPanel = document.getElementById('cart-panel');
    if (cartPanel) cartPanel.classList.add('oculto');
    const overlay = document.getElementById('overlay');
    if (overlay) overlay.remove();
    if (tienda) tienda.classList.add('oculto');
    if (checkoutView) checkoutView.classList.remove('oculto');
    mostrarResumenCheckout();
  }
  window.scrollTo(0, 0);
}

// Concretar compra: agrega al carrito TODOS los productos hablados y abre el formulario.
function iaConcretarCompra() {
  try {
    const lista = iaProductosObjetivo.length
      ? iaProductosObjetivo
      : (iaProductoObjetivo ? [iaProductoObjetivo] : []);
    const prodUnico = iaProductoEnContexto();

    let agregados = 0;
    const yaEnCarrito = new Set(carrito.map(i => i.id));
    lista.forEach(p => {
      if (p.visible === false || p.agotado) return;
      agregarAlCarrito(p.id);
      agregados++;
    });
    if (!agregados && prodUnico) {
      agregarAlCarrito(prodUnico.id);
      agregados++;
    }

    if (carrito && carrito.length) {
      iaParaFormulario();
    } else if (!agregados) {
      const btnCarrito = document.getElementById('btn-carrito');
      if (btnCarrito) {
        iaCerrarModal();
        btnCarrito.click();
        iaToast('Aún no he identificado el producto. Busca uno y pulsa "+ Agregar", o escríbeme cuál quieres.');
      } else {
        iaToast('Escríbeme el producto que quieres y pulsa "Concretar compra" de nuevo.');
      }
    }
  } catch (err) {
    console.error('[IA] Error en Concretar compra:', err);
    iaToast('Ocurrió un error al concretar la compra. Intenta de nuevo.');
  }
}

function buildWaTemplate(tipo) {
  const ta = document.getElementById('ia-wa-textarea');
  if (ta) ta.value = IA_PLANTILLAS_WA[tipo] || '';
}

function sendGeneratedWa() {
  const ta = document.getElementById('ia-wa-textarea');
  const texto = (ta && ta.value.trim()) || '';
  if (!texto) return;
  const url = `https://wa.me/${iaDestino}?text=${encodeURIComponent(texto)}`;
  window.open(url, '_blank');
}

/* ---------- Init ---------- */
document.addEventListener('DOMContentLoaded', () => {
  // Copiar al hacer clic en tarjetas de contacto (data-ia-copiar)
  document.addEventListener('click', (e) => {
    const target = e.target.closest('.ia-copiable');
    if (target && target.dataset.iaCopiar) {
      iaCopiar(target.dataset.iaCopiar, target.dataset.iaCopiarMsg || 'Copiado al portapapeles');
    }
  });

  document.querySelectorAll('[data-ia-cerrar]').forEach(b => b.addEventListener('click', iaCerrarModal));
  document.querySelectorAll('[data-ia-abrir]').forEach(b => b.addEventListener('click', openAiModal));
  const modal = document.getElementById('ia-modal');
  if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) iaCerrarModal(); });

  document.querySelectorAll('[data-ia-tab]').forEach(tab => {
    tab.addEventListener('click', () => switchAiTab(tab.dataset.iaTab));
  });

  const enviar = document.getElementById('ia-enviar');
  const input = document.getElementById('ia-user-input');
  if (enviar) enviar.addEventListener('click', sendAiMessage);
  if (input) input.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendAiMessage(); });

  const waEnviar = document.getElementById('ia-wa-enviar');
  if (waEnviar) waEnviar.addEventListener('click', sendGeneratedWa);

  document.querySelectorAll('[data-ia-template]').forEach(b => {
    b.addEventListener('click', () => buildWaTemplate(b.dataset.iaTemplate));
  });
});