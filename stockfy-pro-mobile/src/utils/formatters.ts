import type { FixedExpenseFrequency, WalletDefinition, WalletId } from '../types/stockfy';

export const WALLETS: WalletDefinition[] = [
  {
    id: 'pago_movil',
    nombre: 'Pago Móvil',
    monedaBase: 'VES',
    descripcion: 'Pagos instantáneos interbancarios en Bs',
  },
  {
    id: 'zelle',
    nombre: 'Zelle',
    monedaBase: 'USD',
    descripcion: 'Transferencias digitales en USD',
  },
  {
    id: 'binance',
    nombre: 'Binance',
    monedaBase: 'USD',
    descripcion: 'Cripto / USDT Pay',
  },
  {
    id: 'efectivo_usd',
    nombre: 'Efectivo $',
    monedaBase: 'USD',
    descripcion: 'Divisas físicas en caja',
  },
  {
    id: 'efectivo_bs',
    nombre: 'Efectivo Bs',
    monedaBase: 'VES',
    descripcion: 'Billetes en moneda nacional',
  },
  {
    id: 'punto_venta',
    nombre: 'Punto de Venta',
    monedaBase: 'VES',
    descripcion: 'Tarjetas débito y crédito',
  },
  {
    id: 'transferencia',
    nombre: 'Transferencia',
    monedaBase: 'VES',
    descripcion: 'Transferencias bancarias directas',
  },
];

export function getWalletName(id?: WalletId): string {
  if (!id) return 'Sin asignar';
  return WALLETS.find((w) => w.id === id)?.nombre ?? id;
}

export function formatUSD(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  const sign = safe < 0 ? '-' : '';
  const abs = Math.abs(safe);
  return `${sign}$${abs.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatVES(amountUSD: number, rate: number): string {
  const safeUSD = Number.isFinite(amountUSD) ? amountUSD : 0;
  const safeRate = Number.isFinite(rate) && rate > 0 ? rate : 0;
  const ves = safeUSD * safeRate;
  const sign = ves < 0 ? '-' : '';
  const abs = Math.abs(ves);
  return `${sign}Bs. ${abs.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatVESDirect(amountVES: number): string {
  const safe = Number.isFinite(amountVES) ? amountVES : 0;
  const sign = safe < 0 ? '-' : '';
  const abs = Math.abs(safe);
  return `${sign}Bs. ${abs.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatRate(rate: number): string {
  const safe = Number.isFinite(rate) ? rate : 0;
  return `Bs. ${safe.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-VE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('es-VE', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getLocalTodayYMD(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDaysToYMD(ymd: string, days: number): string {
  const parts = ymd.split('-').map((n) => parseInt(n, 10));
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) {
    const fallback = new Date(Date.now() + days * 24 * 3600 * 1000);
    return `${fallback.getFullYear()}-${String(fallback.getMonth() + 1).padStart(2, '0')}-${String(
      fallback.getDate()
    ).padStart(2, '0')}`;
  }
  const d = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

export function diffDaysFromTodayYMD(targetYmd: string): number {
  const todayParts = getLocalTodayYMD().split('-').map((n) => parseInt(n, 10));
  const targetParts = targetYmd.split('-').map((n) => parseInt(n, 10));
  if (targetParts.length !== 3 || targetParts.some((n) => !Number.isFinite(n))) {
    return 999;
  }
  const todayMs = new Date(todayParts[0], todayParts[1] - 1, todayParts[2], 12, 0, 0).getTime();
  const targetMs = new Date(
    targetParts[0],
    targetParts[1] - 1,
    targetParts[2],
    12,
    0,
    0
  ).getTime();
  return Math.round((targetMs - todayMs) / (24 * 3600 * 1000));
}

export function formatShortYMD(ymd: string): string {
  const parts = ymd.split('-').map((n) => parseInt(n, 10));
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return ymd;
  const d = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
  return d.toLocaleDateString('es-VE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function getFrequencyIntervalDays(
  frecuencia?: FixedExpenseFrequency,
  cadaDias?: number
): number {
  if (frecuencia === 'semanal') return 7;
  if (frecuencia === 'quincenal') return 15;
  if (frecuencia === 'mensual') return 30;
  if (frecuencia === 'personalizada') return Math.max(1, Math.round(cadaDias || 30));
  return 0;
}

export function getFrequencyLabel(
  frecuencia?: FixedExpenseFrequency,
  cadaDias?: number
): string {
  if (frecuencia === 'semanal') return 'Semanal (c/ 7 días)';
  if (frecuencia === 'quincenal') return 'Quincenal (c/ 15 días)';
  if (frecuencia === 'mensual') return 'Mensual (c/ 30 días)';
  if (frecuencia === 'personalizada') {
    const n = Math.max(1, Math.round(cadaDias || 30));
    return `Cada ${n} ${n === 1 ? 'día' : 'días'}`;
  }
  return 'Sin recordatorio';
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function round3(n: number): number {
  return Math.round((n + Number.EPSILON) * 1000) / 1000;
}

export function formatQty(qty: number, unidad?: string): string {
  const clean = round3(qty);
  const u = unidad || 'u';
  if (u === 'u') {
    return Number.isInteger(clean) ? String(clean) : clean.toFixed(2);
  }
  return `${Number.isInteger(clean) ? clean : clean.toFixed(2)} ${u}`;
}

export async function shareOrCopyText(
  title: string,
  text: string
): Promise<'shared' | 'copied' | 'failed'> {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text });
      return 'shared';
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return 'failed';
      }
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'failed';
  }
}

export function generateId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${rand}`;
}

export function generateDocNumber(prefix: string): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  const suffix = Date.now().toString().slice(-3);
  return `${prefix}-${num}${suffix}`;
}

export interface DolarApiResult {
  bcvRate: number;
  paraleloRate: number;
  updatedAt: string;
}

interface DolarApiEntry {
  fuente?: string;
  nombre?: string;
  promedio?: number;
  venta?: number;
  compra?: number;
  fechaActualizacion?: string;
}

export async function fetchDolarApiRates(): Promise<DolarApiResult> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 5500);

  try {
    const res = await fetch('https://ve.dolarapi.com/v1/dolares', {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data: DolarApiEntry[] = await res.json();
    if (!Array.isArray(data)) {
      throw new Error('Formato inesperado');
    }

    const oficial = data.find(
      (item) =>
        item.fuente?.toLowerCase() === 'oficial' ||
        item.nombre?.toLowerCase().includes('oficial')
    );
    const paralelo = data.find(
      (item) =>
        item.fuente?.toLowerCase() === 'paralelo' ||
        item.nombre?.toLowerCase().includes('paralelo')
    );

    const bcvVal = oficial?.promedio ?? oficial?.venta ?? oficial?.compra ?? 0;
    const parVal = paralelo?.promedio ?? paralelo?.venta ?? paralelo?.compra ?? 0;

    if (!bcvVal && !parVal) {
      throw new Error('Tasas no disponibles');
    }

    return {
      bcvRate: bcvVal > 0 ? round2(bcvVal) : 0,
      paraleloRate: parVal > 0 ? round2(parVal) : 0,
      updatedAt:
        oficial?.fechaActualizacion ||
        paralelo?.fechaActualizacion ||
        new Date().toISOString(),
    };
  } finally {
    window.clearTimeout(timeoutId);
  }
}
