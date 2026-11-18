import React, { useMemo, useState } from 'react';
import { BarChart3, PieChart, PiggyBank, TrendingUp, Wallet } from 'lucide-react';
import { useStockfy } from '../context/StockfyContext';
import {
  WALLETS,
  addDaysToYMD,
  formatUSD,
  formatVES,
  getLocalTodayYMD,
  round2,
} from '../utils/formatters';

function isoToLocalYMD(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function shortDayLabel(ymd: string): string {
  const parts = ymd.split('-').map((n) => parseInt(n, 10));
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return ymd;
  const d = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
  return d.toLocaleDateString('es-VE', { day: '2-digit', month: 'short' }).replace('.', '');
}

interface DailyMetric {
  ymd: string;
  label: string;
  ventasUSD: number;
  gananciaUSD: number;
  egresosUSD: number;
  ahorroUSD: number;
}

export const FinancialChartsSection: React.FC = () => {
  const { state, metrics } = useStockfy();
  const rate = state.rates.activeRate;
  const [rangeDays, setRangeDays] = useState<7 | 14>(7);
  const [selectedDayYmd, setSelectedDayYmd] = useState<string | null>(null);

  // 1. Daily series for Ventas, Ganancia Bruta, Egresos & Ahorro
  const dailySeries = useMemo<DailyMetric[]>(() => {
    const today = getLocalTodayYMD();
    const map = new Map<string, DailyMetric>();
    const ordered: DailyMetric[] = [];

    for (let i = rangeDays - 1; i >= 0; i--) {
      const ymd = addDaysToYMD(today, -i);
      const entry: DailyMetric = {
        ymd,
        label: shortDayLabel(ymd),
        ventasUSD: 0,
        gananciaUSD: 0,
        egresosUSD: 0,
        ahorroUSD: 0,
      };
      map.set(ymd, entry);
      ordered.push(entry);
    }

    for (const s of state.sales) {
      const ymd = isoToLocalYMD(s.fecha);
      const bucket = map.get(ymd);
      if (!bucket) continue;
      bucket.ventasUSD = round2(bucket.ventasUSD + s.totalUSD);
      let profit = 0;
      for (const it of s.items) {
        profit += (it.precioUnitarioUSD - it.costoUnitarioUSD) * it.cantidad;
      }
      if (s.descuentoUSD) profit -= s.descuentoUSD;
      bucket.gananciaUSD = round2(bucket.gananciaUSD + profit);
    }

    for (const mov of state.ledger) {
      if (
        mov.tipo !== 'gasto_extra' &&
        mov.tipo !== 'pago_fijo' &&
        mov.tipo !== 'pago_proveedor' &&
        mov.tipo !== 'perdida_garantia'
      ) {
        continue;
      }
      const ymd = isoToLocalYMD(mov.fecha);
      const bucket = map.get(ymd);
      if (!bucket) continue;
      bucket.egresosUSD = round2(bucket.egresosUSD + Math.abs(mov.montoUSD));
    }

    for (const sm of state.savingsMovements) {
      if (sm.tipo !== 'deposito') continue;
      const ymd = isoToLocalYMD(sm.fecha);
      const bucket = map.get(ymd);
      if (!bucket) continue;
      bucket.ahorroUSD = round2(bucket.ahorroUSD + sm.montoUSD);
    }

    return ordered;
  }, [rangeDays, state.ledger, state.sales, state.savingsMovements]);

  const activeDay = useMemo(() => {
    if (selectedDayYmd) {
      const found = dailySeries.find((d) => d.ymd === selectedDayYmd);
      if (found) return found;
    }
    for (let i = dailySeries.length - 1; i >= 0; i--) {
      const d = dailySeries[i];
      if (d.ventasUSD > 0 || d.egresosUSD > 0 || d.ahorroUSD > 0) return d;
    }
    return dailySeries[dailySeries.length - 1];
  }, [dailySeries, selectedDayYmd]);

  const hasTimelineActivity = useMemo(
    () =>
      dailySeries.some(
        (d) => d.ventasUSD > 0 || d.egresosUSD > 0 || d.gananciaUSD !== 0 || d.ahorroUSD > 0
      ),
    [dailySeries]
  );

  // SVG Chart Geometry
  const chartGeom = useMemo(() => {
    const svgW = 640;
    const svgH = 210;
    const padL = 48;
    const padR = 14;
    const padT = 16;
    const padB = 28;
    const plotW = svgW - padL - padR;
    const plotH = svgH - padT - padB;

    const maxRaw = Math.max(
      10,
      ...dailySeries.map((d) => Math.max(d.ventasUSD, d.egresosUSD, d.gananciaUSD, d.ahorroUSD))
    );
    const maxY = Math.ceil(maxRaw * 1.15);
    const slotW = plotW / Math.max(1, dailySeries.length);
    const barW = Math.min(18, Math.max(6, slotW * 0.28));

    const yFor = (val: number) => {
      const clamped = Math.max(0, val);
      return padT + plotH - (clamped / maxY) * plotH;
    };

    const profitPoints = dailySeries.map((d, idx) => {
      const cx = padL + idx * slotW + slotW / 2;
      const cy = yFor(d.gananciaUSD);
      return { cx, cy, val: d.gananciaUSD, ymd: d.ymd };
    });

    const profitPolyline = profitPoints.map((p) => `${p.cx.toFixed(1)},${p.cy.toFixed(1)}`).join(' ');

    return {
      svgW,
      svgH,
      padL,
      padR,
      padT,
      padB,
      plotW,
      plotH,
      maxY,
      slotW,
      barW,
      yFor,
      profitPoints,
      profitPolyline,
    };
  }, [dailySeries]);

  // 2. Wealth & Savings Donut Breakdown
  const wealthData = useMemo(() => {
    const slices = [
      {
        id: 'caja',
        label: 'Caja en Monederos',
        value: round2(Math.max(0, metrics.cajaLiquidaUSD)),
        color: '#059669',
        dotClass: 'bg-emerald-600',
      },
      {
        id: 'ahorro',
        label: 'Moneda de Ahorro',
        value: round2(Math.max(0, metrics.ahorroTotalUSD)),
        color: '#0ea5e9',
        dotClass: 'bg-sky-500',
      },
      {
        id: 'inventario',
        label: 'Inventario (al Costo)',
        value: round2(Math.max(0, metrics.valorInventarioCostoUSD)),
        color: '#6366f1',
        dotClass: 'bg-indigo-500',
      },
      {
        id: 'fiados',
        label: 'Fiados por Cobrar',
        value: round2(Math.max(0, metrics.fiadosPendientesUSD)),
        color: '#f59e0b',
        dotClass: 'bg-amber-500',
      },
    ];

    const total = round2(slices.reduce((acc, s) => acc + s.value, 0));
    const radius = 52;
    const circumference = 2 * Math.PI * radius;
    let cumulative = 0;

    const segments = slices
      .filter((s) => s.value > 0)
      .map((s) => {
        const fraction = total > 0 ? s.value / total : 0;
        const dash = fraction * circumference;
        const offset = -cumulative * circumference;
        cumulative += fraction;
        return {
          ...s,
          pct: Math.round(fraction * 100),
          dash,
          offset,
        };
      });

    const liquidPlusSavings = Math.max(0, metrics.cajaLiquidaUSD) + metrics.ahorroTotalUSD;
    const savingsRatioPct =
      liquidPlusSavings > 0 ? Math.round((metrics.ahorroTotalUSD / liquidPlusSavings) * 100) : 0;

    return {
      slices,
      segments,
      total,
      radius,
      circumference,
      savingsRatioPct,
    };
  }, [
    metrics.ahorroTotalUSD,
    metrics.cajaLiquidaUSD,
    metrics.fiadosPendientesUSD,
    metrics.valorInventarioCostoUSD,
  ]);

  // 3. Profitability & Expenses Breakdown Bars
  const profitBars = useMemo(() => {
    const gastosYMermas = round2(metrics.gastosTotalesUSD + metrics.perdidasTotalesUSD);
    const maxRef = Math.max(
      1,
      metrics.ventasTotalesUSD,
      metrics.utilidadBrutaVentasUSD,
      gastosYMermas,
      metrics.ahorroTotalUSD,
      Math.abs(metrics.utilidadNetaRealUSD)
    );

    return [
      {
        label: 'Ventas Acumuladas',
        value: metrics.ventasTotalesUSD,
        pct: Math.min(100, Math.round((Math.max(0, metrics.ventasTotalesUSD) / maxRef) * 100)),
        barClass: 'bg-slate-800 dark:bg-slate-200',
        textClass: 'text-slate-900 dark:text-white',
      },
      {
        label: 'Utilidad Bruta (Margen)',
        value: metrics.utilidadBrutaVentasUSD,
        pct: Math.min(100, Math.round((Math.max(0, metrics.utilidadBrutaVentasUSD) / maxRef) * 100)),
        barClass: 'bg-sky-500',
        textClass: 'text-sky-700 dark:text-sky-400',
      },
      {
        label: 'Gastos Operativos y Mermas',
        value: gastosYMermas,
        pct: Math.min(100, Math.round((Math.max(0, gastosYMermas) / maxRef) * 100)),
        barClass: 'bg-rose-500',
        textClass: 'text-rose-600 dark:text-rose-400',
      },
      {
        label: 'Utilidad Neta Real',
        value: metrics.utilidadNetaRealUSD,
        pct: Math.min(100, Math.round((Math.max(0, metrics.utilidadNetaRealUSD) / maxRef) * 100)),
        barClass: metrics.utilidadNetaRealUSD >= 0 ? 'bg-emerald-600' : 'bg-red-600',
        textClass:
          metrics.utilidadNetaRealUSD >= 0
            ? 'text-emerald-700 dark:text-emerald-400'
            : 'text-red-600 dark:text-red-400',
      },
      {
        label: 'Moneda de Ahorro (Reserva)',
        value: metrics.ahorroTotalUSD,
        pct: Math.min(100, Math.round((Math.max(0, metrics.ahorroTotalUSD) / maxRef) * 100)),
        barClass: 'bg-amber-500',
        textClass: 'text-amber-700 dark:text-amber-400',
      },
    ];
  }, [
    metrics.ahorroTotalUSD,
    metrics.gastosTotalesUSD,
    metrics.perdidasTotalesUSD,
    metrics.utilidadBrutaVentasUSD,
    metrics.utilidadNetaRealUSD,
    metrics.ventasTotalesUSD,
  ]);

  // 4. Top Wallets Distribution
  const walletBars = useMemo(() => {
    const items = WALLETS.map((w) => ({
      id: w.id,
      nombre: w.nombre,
      balance: metrics.walletBalances[w.id] || 0,
    }))
      .filter((w) => Math.abs(w.balance) > 0.009)
      .sort((a, b) => b.balance - a.balance);

    const positiveTotal = items.reduce((acc, w) => acc + Math.max(0, w.balance), 0);
    const maxAbs = Math.max(1, ...items.map((w) => Math.abs(w.balance)));

    return items.map((w) => ({
      ...w,
      sharePct: positiveTotal > 0 && w.balance > 0 ? Math.round((w.balance / positiveTotal) * 100) : 0,
      widthPct: Math.min(100, Math.round((Math.abs(w.balance) / maxAbs) * 100)),
    }));
  }, [metrics.walletBalances]);

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
        {/* Chart 1: Evolución Diaria */}
        <div className="xl:col-span-7 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Evolución de Ventas, Ganancias, Ahorro y Egresos
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Toca una fecha en la gráfica para inspeccionar el balance diario exacto
              </p>
            </div>

            <div className="inline-flex p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => {
                  setRangeDays(7);
                  setSelectedDayYmd(null);
                }}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                  rangeDays === 7
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                7 días
              </button>
              <button
                type="button"
                onClick={() => {
                  setRangeDays(14);
                  setSelectedDayYmd(null);
                }}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                  rangeDays === 14
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                14 días
              </button>
            </div>
          </div>

          {/* Selected Day Readout Strip */}
          {activeDay && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800">
              <div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Ventas ({activeDay.label})
                </p>
                <p className="text-sm font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                  {formatUSD(activeDay.ventasUSD)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Ganancia Bruta</p>
                <p className="text-sm font-bold font-mono tabular-nums text-sky-600 dark:text-sky-400">
                  {formatUSD(activeDay.gananciaUSD)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Egresos</p>
                <p className="text-sm font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400">
                  -{formatUSD(activeDay.egresosUSD)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Ahorro apartado</p>
                <p className="text-sm font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">
                  {formatUSD(activeDay.ahorroUSD)}
                </p>
              </div>
            </div>
          )}

          {/* SVG Bar + Profit Line Chart */}
          {!hasTimelineActivity ? (
            <div className="h-[190px] rounded-xl border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center px-4">
              <TrendingUp className="w-6 h-6 text-slate-400 dark:text-slate-600 mb-2" />
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Sin actividad en los últimos {rangeDays} días
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Registra ventas, egresos o depósitos a reserva para visualizar tu evolución diaria.
              </p>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <svg
                viewBox={`0 0 ${chartGeom.svgW} ${chartGeom.svgH}`}
                className="w-full h-auto min-w-[460px] select-none"
                role="img"
                aria-label="Gráfica diaria de ventas, ganancia bruta, egresos y ahorro"
              >
                {/* Horizontal gridlines */}
                {[0, 0.5, 1].map((ratio) => {
                  const val = round2(chartGeom.maxY * ratio);
                  const y = chartGeom.yFor(val);
                  return (
                    <g key={ratio}>
                      <line
                        x1={chartGeom.padL}
                        x2={chartGeom.svgW - chartGeom.padR}
                        y1={y}
                        y2={y}
                        stroke="currentColor"
                        className="text-slate-200 dark:text-slate-800"
                        strokeDasharray={ratio === 0 ? undefined : '3 3'}
                        strokeWidth={1}
                      />
                      <text
                        x={chartGeom.padL - 6}
                        y={y + 3.5}
                        textAnchor="end"
                        className="fill-slate-400 dark:fill-slate-500 text-[10px] font-mono"
                      >
                        ${val >= 1000 ? `${(val / 1000).toFixed(1)}k` : Math.round(val)}
                      </text>
                    </g>
                  );
                })}

                {/* Daily Grouped Bars */}
                {dailySeries.map((day, idx) => {
                  const slotX = chartGeom.padL + idx * chartGeom.slotW;
                  const centerX = slotX + chartGeom.slotW / 2;
                  const isSelected = activeDay?.ymd === day.ymd;
                  const baseBottom = chartGeom.yFor(0);

                  const salesTop = chartGeom.yFor(day.ventasUSD);
                  const expTop = chartGeom.yFor(day.egresosUSD);
                  const savTop = chartGeom.yFor(day.ahorroUSD);

                  const salesH = Math.max(day.ventasUSD > 0 ? 3 : 0, baseBottom - salesTop);
                  const expH = Math.max(day.egresosUSD > 0 ? 3 : 0, baseBottom - expTop);
                  const savH = Math.max(day.ahorroUSD > 0 ? 3 : 0, baseBottom - savTop);

                  const showLabel = rangeDays === 7 || idx % 2 === 0 || isSelected;

                  return (
                    <g
                      key={day.ymd}
                      onClick={() => setSelectedDayYmd(day.ymd)}
                      onMouseEnter={() => setSelectedDayYmd(day.ymd)}
                      className="cursor-pointer"
                    >
                      {isSelected && (
                        <rect
                          x={slotX + 2}
                          y={chartGeom.padT}
                          width={Math.max(4, chartGeom.slotW - 4)}
                          height={chartGeom.plotH}
                          rx={6}
                          className="fill-slate-100/90 dark:fill-slate-800/60"
                        />
                      )}

                      {/* Ventas Bar */}
                      {salesH > 0 && (
                        <rect
                          x={centerX - chartGeom.barW * 1.1}
                          y={baseBottom - salesH}
                          width={chartGeom.barW * 0.95}
                          height={salesH}
                          rx={3}
                          className="fill-emerald-500 dark:fill-emerald-500"
                        />
                      )}

                      {/* Egresos Bar */}
                      {expH > 0 && (
                        <rect
                          x={centerX + chartGeom.barW * 0.05}
                          y={baseBottom - expH}
                          width={chartGeom.barW * 0.95}
                          height={expH}
                          rx={3}
                          className="fill-rose-500 dark:fill-rose-400"
                        />
                      )}

                      {/* Ahorro Bar (thin gold marker beside) */}
                      {savH > 0 && (
                        <rect
                          x={centerX + chartGeom.barW * 1.1}
                          y={baseBottom - savH}
                          width={Math.max(4, chartGeom.barW * 0.5)}
                          height={savH}
                          rx={2}
                          className="fill-amber-500 dark:fill-amber-400"
                        />
                      )}

                      {showLabel && (
                        <text
                          x={centerX}
                          y={chartGeom.svgH - 8}
                          textAnchor="middle"
                          className={`text-[10px] font-mono ${
                            isSelected
                              ? 'fill-slate-900 dark:fill-white font-bold'
                              : 'fill-slate-500 dark:fill-slate-400'
                          }`}
                        >
                          {day.label}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Ganancia Bruta Polyline */}
                <polyline
                  fill="none"
                  stroke="#0ea5e9"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={chartGeom.profitPolyline}
                />
                {chartGeom.profitPoints.map((pt) => {
                  const isSel = activeDay?.ymd === pt.ymd;
                  return (
                    <circle
                      key={pt.ymd}
                      cx={pt.cx}
                      cy={pt.cy}
                      r={isSel ? 4.5 : 3}
                      className="fill-sky-500 stroke-white dark:stroke-slate-900"
                      strokeWidth={1.5}
                      onClick={() => setSelectedDayYmd(pt.ymd)}
                    />
                  );
                })}
              </svg>
            </div>
          )}

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11px] text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block" />
              <span>Ventas</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block" />
              <span>Ganancia Bruta</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-rose-500 inline-block" />
              <span>Egresos</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 inline-block" />
              <span>Ahorro apartado</span>
            </span>
          </div>
        </div>

        {/* Chart 2: Distribución de Patrimonio y Ahorro */}
        <div className="xl:col-span-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between gap-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <PieChart className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Distribución Patrimonial y Ahorro
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Composición total del negocio entre liquidez, reserva, stock y fiados
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row xl:flex-col 2xl:flex-row items-center gap-5">
            {/* SVG Ring */}
            <div className="relative w-36 h-36 shrink-0">
              <svg viewBox="0 0 144 144" className="w-full h-full -rotate-90">
                <circle
                  cx={72}
                  cy={72}
                  r={wealthData.radius}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={16}
                  className="text-slate-100 dark:text-slate-800"
                />
                {wealthData.segments.map((seg) => (
                  <circle
                    key={seg.id}
                    cx={72}
                    cy={72}
                    r={wealthData.radius}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth={16}
                    strokeDasharray={`${seg.dash} ${wealthData.circumference}`}
                    strokeDashoffset={seg.offset}
                  />
                ))}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">
                  Patrimonio
                </span>
                <span className="text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                  {formatUSD(wealthData.total)}
                </span>
              </div>
            </div>

            {/* Breakdown Legend */}
            <div className="flex-1 w-full space-y-2.5">
              {wealthData.slices.map((s) => {
                const pct =
                  wealthData.total > 0 ? Math.round((s.value / wealthData.total) * 100) : 0;
                return (
                  <div key={s.id} className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-2.5 h-2.5 rounded-xs shrink-0 ${s.dotClass}`} />
                      <span className="text-slate-700 dark:text-slate-300 truncate">{s.label}</span>
                    </div>
                    <div className="text-right font-mono tabular-nums shrink-0">
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {formatUSD(s.value)}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 ml-1.5">
                        ({pct}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Savings Reserve Ratio Bar */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                <PiggyBank className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                <span>Fondo de Ahorro sobre Liquidez Total</span>
              </span>
              <span className="font-mono tabular-nums font-bold text-sky-700 dark:text-sky-400">
                {wealthData.savingsRatioPct}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-sky-500 transition-all"
                style={{ width: `${Math.min(100, Math.max(0, wealthData.savingsRatioPct))}%` }}
              />
            </div>
            <p className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
              Reserva protegida: {formatUSD(metrics.ahorroTotalUSD)} ({formatVES(metrics.ahorroTotalUSD, rate)})
            </p>
          </div>
        </div>
      </div>

      {/* Chart 3: Rentabilidad vs Egresos & Distribución por Monedero */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Balance Acumulado de Ganancias y Ahorro
              </h3>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Historico total</span>
          </div>

          <div className="space-y-3">
            {profitBars.map((bar) => (
              <div key={bar.label} className="space-y-1">
                <div className="flex items-center justify-between text-xs gap-2">
                  <span className="font-medium text-slate-700 dark:text-slate-300 truncate">
                    {bar.label}
                  </span>
                  <span className={`font-mono tabular-nums font-bold shrink-0 ${bar.textClass}`}>
                    {formatUSD(bar.value)}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${bar.barClass}`}
                    style={{ width: `${bar.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Participación por Monedero
              </h3>
            </div>
            <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
              Caja: {formatUSD(metrics.cajaLiquidaUSD)}
            </span>
          </div>

          {walletBars.length === 0 ? (
            <div className="h-36 flex items-center justify-center text-xs text-slate-500 dark:text-slate-400 text-center">
              Inyecta capital o registra ventas al contado para ver la distribución por billetera.
            </div>
          ) : (
            <div className="space-y-3">
              {walletBars.map((wb) => (
                <div key={wb.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs gap-2">
                    <span className="font-medium text-slate-700 dark:text-slate-300 truncate">
                      {wb.nombre}
                    </span>
                    <span className="font-mono tabular-nums shrink-0">
                      <strong
                        className={
                          wb.balance < 0
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-slate-900 dark:text-white'
                        }
                      >
                        {formatUSD(wb.balance)}
                      </strong>
                      {wb.balance > 0 && (
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 ml-1.5">
                          ({wb.sharePct}%)
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        wb.balance < 0 ? 'bg-red-500' : 'bg-emerald-600 dark:bg-emerald-500'
                      }`}
                      style={{ width: `${wb.widthPct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
