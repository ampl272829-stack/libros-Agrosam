import type { StockfyState } from '../types/stockfy';
import {
  formatDateTime,
  formatRate,
  formatUSD,
  formatVES,
  getWalletName,
  round2,
} from './formatters';

function escapeCsvCell(value: string | number | undefined): string {
  const str = value === undefined ? '' : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function downloadCsvFile(filename: string, headers: string[], rows: Array<Array<string | number | undefined>>) {
  const csvLines = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((r) => r.map(escapeCsvCell).join(',')),
  ];
  const content = '\uFEFF' + csvLines.join('\n');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportInventoryCsv(state: StockfyState) {
  const rate = state.rates.activeRate;
  const headers = [
    'ID',
    'Nombre',
    'SKU / Codigo',
    'Categoria',
    'Unidad',
    'Stock',
    'Costo USD',
    'Costo Bs',
    'Margen %',
    'Precio Venta USD',
    'Precio Venta Bs',
    'Valor Total Venta USD',
  ];
  const rows = state.products.map((p) => [
    p.id,
    p.nombre,
    p.sku || '',
    p.categoria || 'General',
    p.unidad || 'u',
    p.stock,
    p.costoUSD.toFixed(2),
    round2(p.costoUSD * rate).toFixed(2),
    p.margenPct.toFixed(2),
    p.precioUSD.toFixed(2),
    round2(p.precioUSD * rate).toFixed(2),
    round2(p.stock * p.precioUSD).toFixed(2),
  ]);
  downloadCsvFile(`stockfy-inventario-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
}

export function exportSalesCsv(state: StockfyState) {
  const headers = [
    'Factura',
    'Fecha',
    'Modalidad',
    'Estado Credito',
    'Cliente / Monedero',
    'Articulos',
    'Descuento USD',
    'Total USD',
    'Total Bs',
    'Tasa Aplicada',
    'Abonado USD',
  ];
  const rows = state.sales.map((s) => {
    const walletLabel =
      s.pagos && s.pagos.length > 1
        ? s.pagos.map((p) => `${getWalletName(p.monederoId)} ($${p.montoUSD.toFixed(2)})`).join(' + ')
        : getWalletName(s.monederoId);
    return [
      s.numeroFactura,
      formatDateTime(s.fecha),
      s.tipo === 'contado' ? 'Contado' : 'Credito (Fiado)',
      s.tipo === 'credito' ? s.estadoCredito || 'pendiente' : 'Cobrado',
      s.tipo === 'contado' ? walletLabel : s.cliente || 'Cliente',
      s.items.map((it) => `${it.cantidad}${it.unidad && it.unidad !== 'u' ? it.unidad : 'x'} ${it.nombre}`).join(' | '),
      (s.descuentoUSD || 0).toFixed(2),
      s.totalUSD.toFixed(2),
      s.totalVES.toFixed(2),
      s.tasaAplicada.toFixed(2),
      (s.montoPagadoUSD ?? (s.tipo === 'contado' ? s.totalUSD : 0)).toFixed(2),
    ];
  });
  downloadCsvFile(`stockfy-ventas-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
}

export function exportLedgerCsv(state: StockfyState) {
  const headers = ['ID', 'Fecha', 'Tipo', 'Concepto', 'Monedero', 'Monto USD', 'Tasa Ref'];
  const rows = state.ledger.map((m) => [
    m.id,
    formatDateTime(m.fecha),
    m.tipo,
    m.concepto,
    m.monederoId ? getWalletName(m.monederoId) : 'Capital Neto',
    m.montoUSD.toFixed(2),
    m.tasaAplicada.toFixed(2),
  ]);
  downloadCsvFile(`stockfy-libro-caja-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
}

export interface DailyClosingSummary {
  ventasHoyCount: number;
  ventasHoyUSD: number;
  utilidadHoyUSD: number;
  cobrosFiadosHoyUSD: number;
  egresosHoyUSD: number;
  inyeccionesHoyUSD: number;
}

export function computeTodayClosing(state: StockfyState): DailyClosingSummary {
  const todayStr = new Date().toISOString().slice(0, 10);
  const isToday = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return false;
    const localDate = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10);
    const localToday = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10);
    return localDate === localToday || iso.slice(0, 10) === todayStr;
  };

  let ventasHoyCount = 0;
  let ventasHoyUSD = 0;
  let utilidadHoyUSD = 0;

  for (const s of state.sales) {
    if (isToday(s.fecha)) {
      ventasHoyCount += 1;
      ventasHoyUSD += s.totalUSD;
      for (const it of s.items) {
        utilidadHoyUSD += (it.precioUnitarioUSD - it.costoUnitarioUSD) * it.cantidad;
      }
      if (s.descuentoUSD) {
        utilidadHoyUSD -= s.descuentoUSD;
      }
    }
  }

  let cobrosFiadosHoyUSD = 0;
  let egresosHoyUSD = 0;
  let inyeccionesHoyUSD = 0;

  for (const m of state.ledger) {
    if (!isToday(m.fecha)) continue;
    if (m.tipo === 'cobro_credito') cobrosFiadosHoyUSD += m.montoUSD;
    if (m.tipo === 'gasto_extra' || m.tipo === 'pago_fijo' || m.tipo === 'pago_proveedor') {
      egresosHoyUSD += Math.abs(m.montoUSD);
    }
    if (m.tipo === 'inyeccion') inyeccionesHoyUSD += m.montoUSD;
  }

  return {
    ventasHoyCount,
    ventasHoyUSD: round2(ventasHoyUSD),
    utilidadHoyUSD: round2(utilidadHoyUSD),
    cobrosFiadosHoyUSD: round2(cobrosFiadosHoyUSD),
    egresosHoyUSD: round2(egresosHoyUSD),
    inyeccionesHoyUSD: round2(inyeccionesHoyUSD),
  };
}

export function buildDailyClosingWhatsappText(
  state: StockfyState,
  metrics: {
    capitalNetoUSD: number;
    ahorroTotalUSD: number;
    fiadosPendientesUSD: number;
  },
  today: DailyClosingSummary
): string {
  const rate = state.rates.activeRate;
  const fecha = new Date().toLocaleDateString('es-VE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  return [
    `*CIERRE DIARIO — ${state.store.nombreComercio.toUpperCase()}*`,
    `Fecha: ${fecha} | Tasa: ${formatRate(rate)}`,
    `--------------------------------`,
    `Ventas de hoy (${today.ventasHoyCount}): ${formatUSD(today.ventasHoyUSD)} (${formatVES(today.ventasHoyUSD, rate)})`,
    `Utilidad bruta hoy: ${formatUSD(today.utilidadHoyUSD)}`,
    `Cobros de fiados hoy: ${formatUSD(today.cobrosFiadosHoyUSD)}`,
    `Egresos de hoy: -${formatUSD(today.egresosHoyUSD)}`,
    `--------------------------------`,
    `Capital Neto en Caja: ${formatUSD(metrics.capitalNetoUSD)} (${formatVES(metrics.capitalNetoUSD, rate)})`,
    `Fondo de Ahorro: ${formatUSD(metrics.ahorroTotalUSD)}`,
    `Fiados por Cobrar: ${formatUSD(metrics.fiadosPendientesUSD)}`,
  ].join('\n');
}
