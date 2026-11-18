// ============================================================
// M&S Store — Rate limit del cliente (gate de red compartido)
// Es un límite del lado del navegador: frena abusos casuales,
// doble clics y uso accidental. No sustituye la seguridad real
// del servidor (RLS en Supabase, referrer en la key de IA).
// ============================================================

const RL_PREFIJO = 'ms_rl_';
const RL_HORA_MS = 3600000;   // 1 hora
const RL_DIA_MS = 86400000;   // 24 horas
const RL_MAX_GUARDADOS = 300; // máx. eventos que conservamos por clave

function rlLeer(nombre) {
  try {
    const a = JSON.parse(localStorage.getItem(RL_PREFIJO + nombre) || '[]');
    return Array.isArray(a) ? a : [];
  } catch (e) {
    return [];
  }
}

function rlGuardar(nombre, arr) {
  try {
    localStorage.setItem(RL_PREFIJO + nombre, JSON.stringify(arr.slice(-RL_MAX_GUARDADOS)));
  } catch (e) { /* sin almacenamiento */ }
}

// Permite una llamada de red si no se violan los límites.
// cfg = { minMs, porHora, porDia } (minMs = cooldown entre llamadas).
// Devuelve { ok: true } o { ok: false, motivo, retrasoMs }.
function rlPermitir(nombre, cfg) {
  cfg = cfg || {};
  const ahora = Date.now();
  const minMs = cfg.minMs || 0;
  let eventos = rlLeer(nombre).filter(t => ahora - t < RL_DIA_MS);

  // Cooldown mínimo entre llamadas.
  if (minMs) {
    const ultimo = eventos.length ? eventos[eventos.length - 1] : null;
    if (ultimo && ahora - ultimo < minMs) {
      return { ok: false, motivo: 'cooldown', retrasoMs: minMs - (ahora - ultimo) };
    }
  }

  // Tope por hora.
  if (cfg.porHora) {
    const n = eventos.filter(t => ahora - t < RL_HORA_MS).length;
    if (n >= cfg.porHora) return { ok: false, motivo: 'hora', retrasoMs: 0 };
  }

  // Tope por día.
  if (cfg.porDia) {
    if (eventos.length >= cfg.porDia) return { ok: false, motivo: 'dia', retrasoMs: 0 };
  }

  eventos.push(ahora);
  rlGuardar(nombre, eventos);
  return { ok: true };
}

// Texto amigable de los motivos de bloqueo.
function rlMensaje(motivo) {
  if (motivo === 'cooldown') return 'Espera unos segundos antes de repetir la acción.';
  if (motivo === 'hora') return 'Has alcanzado el límite de esta hora. Vuelve un poquito más tarde.';
  if (motivo === 'dia') return 'Has alcanzado el límite diario de esta acción. Vuelve mañana.';
  return '';
}