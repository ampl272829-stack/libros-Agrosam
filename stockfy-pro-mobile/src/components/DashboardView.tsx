import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Award,
  BellRing,
  BookOpen,
  ClipboardCheck,
  Copy,
  Download,
  Landmark,
  Lock,
  Package,
  PiggyBank,
  ShoppingBag,
  TrendingUp,
  Truck,
  Wallet,
  Zap,
} from 'lucide-react';
import { useStockfy } from '../context/StockfyContext';
import {
  buildDailyClosingWhatsappText,
  computeTodayClosing,
  exportLedgerCsv,
  exportSalesCsv,
} from '../utils/csvExport';
import {
  WALLETS,
  formatDateTime,
  formatQty,
  formatShortYMD,
  formatUSD,
  formatVES,
  getFrequencyLabel,
  getWalletName,
  round3,
  shareOrCopyText,
} from '../utils/formatters';
import { CatalogExportModal } from './CatalogExportModal';
import { FinancialChartsSection } from './FinancialChartsSection';
import { PWAInstallButton } from './PWAInstallButton';

export const DashboardView: React.FC = () => {
  const {
    state,
    metrics,
    isCashierLocked,
    setActiveTab,
    payFixedTemplate,
    setSelectedReceipt,
    showToast,
  } = useStockfy();
  const rate = state.rates.activeRate;
  const [catalogOpen, setCatalogOpen] = useState(false);

  const totalUnits = round3(state.products.reduce((acc, p) => acc + p.stock, 0));
  const lowStockProducts = state.products.filter((p) => p.stock <= 10);
  const recentMovements = state.ledger.slice(0, 7);
  const isFreshBusiness = state.products.length === 0 && state.ledger.length === 0;
  const todaySummary = computeTodayClosing(state);

  const analyticsEnabled = state.features.enableSuppliersAndNetAnalytics;
  const catalogEnabled = state.features.enablePublicCatalogExport;
  const shiftCloseEnabled = state.features.enableCashierPinAndShiftClose;
  const lastClosing = state.cashClosings[0];

  const handleCopyClosing = async () => {
    const text = buildDailyClosingWhatsappText(state, metrics, todaySummary);
    if (state.features.enableScannerAndShare) {
      const res = await shareOrCopyText(`Cierre ${state.store.nombreComercio}`, text);
      if (res === 'shared') {
        showToast('Resumen de cierre compartido');
        return;
      }
      if (res === 'copied') {
        showToast('Resumen de cierre copiado para WhatsApp');
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      showToast('Resumen de cierre copiado para WhatsApp');
    } catch {
      showToast('No se pudo copiar al portapapeles');
    }
  };

  return (
    <div className="space-y-6">
      {/* Fresh Business Quick-Start Guide */}
      {isFreshBusiness && !isCashierLocked && (
        <section className="rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Tu comercio está en blanco y listo para comenzar
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                Sigue estos pasos rápidos para configurar tu caja, tu inventario y comenzar a
                facturar.
              </p>
            </div>
            <div className="sm:w-56 shrink-0">
              <PWAInstallButton compact />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setActiveTab('finance')}
              className="min-h-[56px] p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 text-left transition-colors"
            >
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                1. Fondear Caja Inicial
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Registra tu capital disponible por monedero
              </p>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('inventory')}
              className="min-h-[56px] p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 text-left transition-colors"
            >
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                2. Cargar Catálogo
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Agrega productos con costo y % de margen
              </p>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('sales')}
              className="min-h-[56px] p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 text-left transition-colors"
            >
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                3. Facturar o Fiar
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Cobra en $ / Bs y audita cada billetera
              </p>
            </button>
          </div>
        </section>
      )}

      {isCashierLocked ? (
        /* Cashier Mode Protected Operational View */
        <>
          <section className="rounded-2xl bg-slate-900 dark:bg-slate-900 text-white p-5 sm:p-7 border border-slate-800">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold">
                  <Lock className="w-4 h-4" />
                  <span>Modo Cajero Activo — Métricas financieras protegidas por PIN</span>
                </div>
                <p className="text-2xl sm:text-3xl font-bold tracking-tight">
                  {state.store.nombreComercio}
                </p>
                <p className="text-xs text-slate-400">
                  Puedes facturar ventas al contado o crédito, consultar precios de catálogo y
                  registrar gastos menores.
                </p>
              </div>

              <div className="flex flex-wrap gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('sales')}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors flex items-center gap-2 whitespace-nowrap"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Nueva Venta</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('inventory')}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium border border-slate-700 transition-colors flex items-center gap-2 whitespace-nowrap"
                >
                  <Package className="w-4 h-4" />
                  <span>Ver Catálogo</span>
                </button>
                {catalogEnabled && (
                  <button
                    type="button"
                    onClick={() => setCatalogOpen(true)}
                    className="min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium border border-slate-700 transition-colors flex items-center gap-2 whitespace-nowrap"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Catálogo Clientes</span>
                  </button>
                )}
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('inventory')}
              className="text-left p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors space-y-1.5"
            >
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Catálogo Activo</span>
                <Package className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              </div>
              <p className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                {state.products.length} productos
              </p>
              <p className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                Existencias totales: {totalUnits} · {lowStockProducts.length} con stock bajo
              </p>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('sales')}
              className="text-left p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors space-y-1.5"
            >
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Créditos (Fiados) Pendientes</span>
                <AlertTriangle
                  className={`w-4 h-4 ${
                    metrics.fiadosPendientesCount > 0
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-slate-400 dark:text-slate-600'
                  }`}
                />
              </div>
              <p className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                {formatUSD(metrics.fiadosPendientesUSD)}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                {formatVES(metrics.fiadosPendientesUSD, rate)} · {metrics.fiadosPendientesCount}{' '}
                {metrics.fiadosPendientesCount === 1 ? 'pendiente' : 'pendientes'}
              </p>
            </button>
          </section>

          <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Reposición Sugerida (Stock bajo)
              </h2>
              <button
                type="button"
                onClick={() => setActiveTab('inventory')}
                className="text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 whitespace-nowrap"
              >
                Ir a Stock
              </button>
            </div>
            {lowStockProducts.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                Todos los productos superan las 10 unidades en inventario.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {lowStockProducts.slice(0, 6).map((prod) => (
                  <div
                    key={prod.id}
                    className="px-5 py-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                        {prod.nombre}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                        Venta: {formatUSD(prod.precioUSD)} ({formatVES(prod.precioUSD, rate)})
                      </p>
                    </div>
                    <span
                      className={`text-xs font-mono tabular-nums font-semibold shrink-0 ${
                        prod.stock === 0
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-amber-700 dark:text-amber-400'
                      }`}
                    >
                      {formatQty(prod.stock, prod.unidad)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      ) : (
        /* Owner Mode Full Dashboard */
        <>
          {/* Focal Anchor: Capital Neto & Caja Operativa */}
          <section className="rounded-2xl bg-slate-900 dark:bg-slate-900 text-white p-5 sm:p-7 border border-slate-800">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-300">
                  Capital Neto Operativo (sin tocar Fondo de Ahorro)
                </p>
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <span className="text-3xl sm:text-4xl font-bold font-mono tabular-nums tracking-tight">
                    {formatUSD(metrics.capitalNetoUSD)}
                  </span>
                  <span className="text-base sm:text-lg font-mono tabular-nums text-emerald-400 font-semibold">
                    {formatVES(metrics.capitalNetoUSD, rate)}
                  </span>
                </div>
                <p className="text-xs text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span>
                    Liquidez en Monederos:{' '}
                    <strong className="text-slate-200 font-mono tabular-nums">
                      {formatUSD(metrics.cajaLiquidaUSD)}
                    </strong>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    Pérdidas mermas:{' '}
                    <strong className="text-slate-200 font-mono tabular-nums">
                      {formatUSD(metrics.perdidasTotalesUSD)}
                    </strong>
                  </span>
                  {analyticsEnabled && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>
                        Utilidad Neta Real:{' '}
                        <strong
                          className={`font-mono tabular-nums ${
                            metrics.utilidadNetaRealUSD >= 0 ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {formatUSD(metrics.utilidadNetaRealUSD)}
                        </strong>
                      </span>
                    </>
                  )}
                </p>
              </div>

              <div className="flex flex-wrap gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('sales')}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors flex items-center gap-2 whitespace-nowrap"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Nueva Venta</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('finance')}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium border border-slate-700 transition-colors flex items-center gap-2 whitespace-nowrap"
                >
                  <Landmark className="w-4 h-4" />
                  <span>Inyectar / Ahorro</span>
                </button>
              </div>
            </div>
          </section>

          {/* 4-Column KPI Strip */}
          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('finance')}
              className="text-left p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors space-y-1.5"
            >
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Moneda de Ahorro</span>
                <PiggyBank className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                {formatUSD(metrics.ahorroTotalUSD)}
              </p>
              <p className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                {formatVES(metrics.ahorroTotalUSD, rate)}
              </p>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('inventory')}
              className="text-left p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors space-y-1.5"
            >
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Inventario ({totalUnits} u.)</span>
                <Package className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              </div>
              <p className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                {formatUSD(metrics.valorInventarioVentaUSD)}
              </p>
              <p className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                Costo {formatUSD(metrics.valorInventarioCostoUSD)} · Ganancia{' '}
                {formatUSD(metrics.gananciaPotencialInventarioUSD)}
              </p>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('sales')}
              className="text-left p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors space-y-1.5"
            >
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Créditos (Fiados) Pendientes</span>
                <AlertTriangle
                  className={`w-4 h-4 ${
                    metrics.fiadosPendientesCount > 0
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-slate-400 dark:text-slate-600'
                  }`}
                />
              </div>
              <p className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                {formatUSD(metrics.fiadosPendientesUSD)}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                {formatVES(metrics.fiadosPendientesUSD, rate)} · {metrics.fiadosPendientesCount}{' '}
                {metrics.fiadosPendientesCount === 1 ? 'pendiente' : 'pendientes'}
              </p>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab(analyticsEnabled ? 'expenses' : 'sales')}
              className="text-left p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors space-y-1.5"
            >
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>{analyticsEnabled ? 'Ventas y Utilidad Neta' : 'Ventas y Utilidad Bruta'}</span>
                <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                {formatUSD(metrics.ventasTotalesUSD)}
              </p>
              <p className="text-xs font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                {analyticsEnabled ? (
                  <>
                    Neta{' '}
                    <span
                      className={
                        metrics.utilidadNetaRealUSD < 0
                          ? 'text-red-600 dark:text-red-400'
                          : ''
                      }
                    >
                      {formatUSD(metrics.utilidadNetaRealUSD)}
                    </span>{' '}
                    · Bruta {formatUSD(metrics.utilidadBrutaVentasUSD)}
                  </>
                ) : (
                  <>
                    Utilidad {formatUSD(metrics.utilidadBrutaVentasUSD)} · Egresos{' '}
                    {formatUSD(metrics.gastosTotalesUSD)}
                  </>
                )}
              </p>
            </button>
          </section>

          {/* Optional Point 5 Suppliers Alert Strip */}
          {analyticsEnabled && metrics.porPagarProveedoresCount > 0 && (
            <section className="rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-xs">
                <Truck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="text-slate-700 dark:text-slate-200">
                  <strong>Cuentas por Pagar a Proveedores:</strong>{' '}
                  <span className="font-mono tabular-nums font-bold text-amber-700 dark:text-amber-300">
                    {formatUSD(metrics.porPagarProveedoresUSD)}
                  </span>{' '}
                  ({formatVES(metrics.porPagarProveedoresUSD, rate)}) ·{' '}
                  {metrics.porPagarProveedoresCount}{' '}
                  {metrics.porPagarProveedoresCount === 1
                    ? 'factura pendiente'
                    : 'facturas pendientes'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('expenses')}
                className="text-xs font-semibold text-amber-800 dark:text-amber-300 hover:underline flex items-center gap-1 whitespace-nowrap"
              >
                <span>Gestionar pagos</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </section>
          )}

          {/* 2-Day Advance Fixed Expense Reminders */}
          {metrics.upcomingFixedReminders.length > 0 && (
            <section className="rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 p-4 sm:p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <BellRing className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Recordatorios de Gastos Fijos (Próximos 2 días)
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('expenses')}
                  className="text-xs font-semibold text-amber-800 dark:text-amber-300 hover:underline flex items-center gap-1 whitespace-nowrap"
                >
                  <span>Ir a Fijos</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {metrics.upcomingFixedReminders.map(({ template: tpl, diasRestantes }) => {
                  const urgencyText =
                    diasRestantes < 0
                      ? `Vencido hace ${Math.abs(diasRestantes)}d`
                      : diasRestantes === 0
                      ? 'Vence hoy'
                      : diasRestantes === 1
                      ? 'Vence mañana'
                      : 'Vence en 2 días';

                  return (
                    <div
                      key={tpl.id}
                      className="p-3.5 rounded-xl bg-white/95 dark:bg-slate-900 border border-amber-200/80 dark:border-amber-900/50 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-[11px] font-mono tabular-nums">
                          <span
                            className={`font-bold ${
                              diasRestantes <= 0
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-amber-700 dark:text-amber-400'
                            }`}
                          >
                            {urgencyText}
                          </span>
                          {tpl.proximoVencimiento && (
                            <span className="text-slate-500 dark:text-slate-400">
                              {' '}
                              · {formatShortYMD(tpl.proximoVencimiento)}
                            </span>
                          )}
                        </p>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {tpl.nombre}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {getFrequencyLabel(tpl.frecuencia, tpl.cadaDias)} ·{' '}
                          <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                            {formatUSD(tpl.montoUSD)}
                          </span>{' '}
                          ({formatVES(tpl.montoUSD, rate)})
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const receipt = payFixedTemplate(tpl.id);
                          if (receipt) setSelectedReceipt(receipt);
                        }}
                        className="min-h-[40px] px-3 py-2 rounded-xl bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
                      >
                        <Zap className="w-3.5 h-3.5 text-emerald-400 dark:text-white" />
                        <span>Pagar</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Visual Analytics Charts: Profits, Savings, Expenses & Wallets */}
          <FinancialChartsSection />

          {/* Cierre Diario y Exportación Contable */}
          <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Cierre del Día y Reportes
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>
                  Ventas hoy ({todaySummary.ventasHoyCount}):{' '}
                  <strong className="text-slate-900 dark:text-white">
                    {formatUSD(todaySummary.ventasHoyUSD)}
                  </strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  Utilidad hoy:{' '}
                  <strong className="text-emerald-700 dark:text-emerald-400">
                    {formatUSD(todaySummary.utilidadHoyUSD)}
                  </strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  Egresos hoy:{' '}
                  <strong className="text-red-600 dark:text-red-400">
                    -{formatUSD(todaySummary.egresosHoyUSD)}
                  </strong>
                </span>
              </p>
              {shiftCloseEnabled && lastClosing && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-1.5">
                  <ClipboardCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>
                    Último arqueo: <strong className="text-slate-700 dark:text-slate-200">{lastClosing.cajero}</strong> ({formatDateTime(lastClosing.fecha)}) · Diferencia{' '}
                    <span className="font-mono tabular-nums font-semibold">
                      {lastClosing.diferenciaUSD > 0 ? '+' : ''}
                      {formatUSD(lastClosing.diferenciaUSD)}
                    </span>
                  </span>
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {catalogEnabled && (
                <button
                  type="button"
                  onClick={() => setCatalogOpen(true)}
                  className="min-h-[42px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 whitespace-nowrap"
                >
                  <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Catálogo Clientes</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => void handleCopyClosing()}
                className="min-h-[42px] px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar Cierre WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  exportSalesCsv(state);
                  showToast('Reporte de ventas CSV descargado');
                }}
                className="min-h-[42px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1.5 whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Ventas CSV</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  exportLedgerCsv(state);
                  showToast('Libro de caja CSV descargado');
                }}
                className="min-h-[42px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1.5 whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Caja CSV</span>
              </button>
            </div>
          </section>

          {/* Monederos (Auditoría de Cobros) */}
          <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <Wallet className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Saldos por Monedero (Auditoría de Cobros)
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('finance')}
                className="text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 flex items-center gap-1 whitespace-nowrap"
              >
                <span>Ver detalle</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-800">
              {WALLETS.map((w) => {
                const bal = metrics.walletBalances[w.id] || 0;
                return (
                  <div key={w.id} className="p-4 space-y-1">
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-400 truncate">
                      {w.nombre}
                    </p>
                    <p
                      className={`text-base font-bold font-mono tabular-nums ${
                        bal < 0
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {formatUSD(bal)}
                    </p>
                    <p className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400 truncate">
                      {formatVES(bal, rate)}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Optional Point 5: Top 5 Productos Más Vendidos */}
          {analyticsEnabled && metrics.topProducts.length > 0 && (
            <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Top 5 Productos Más Vendidos
                  </h2>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Rendimiento acumulado por ingresos
                </span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {metrics.topProducts.map((tp, idx) => (
                  <div
                    key={tp.productId}
                    className="px-5 py-3 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-mono font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {tp.nombre}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                          Vendido: {formatQty(tp.cantidadVendida, tp.unidad)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right font-mono tabular-nums shrink-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {formatUSD(tp.ingresosUSD)}
                      </p>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
                        Utilidad +{formatUSD(tp.utilidadUSD)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Two-Column Split: Recent Ledger + Low Stock Alert */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Últimos Movimientos de Caja
                </h2>
                <button
                  type="button"
                  onClick={() => setActiveTab('finance')}
                  className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white whitespace-nowrap"
                >
                  Historial completo
                </button>
              </div>

              {recentMovements.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    Sin movimientos registrados
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Registra una inyección de capital o tu primera venta para ver el flujo de caja.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {recentMovements.map((mov) => {
                    const isInflow = mov.montoUSD >= 0;
                    return (
                      <div
                        key={mov.id}
                        className="px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <span
                            className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              isInflow
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                                : 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-400'
                            }`}
                          >
                            {isInflow ? (
                              <ArrowUpRight className="w-4 h-4" />
                            ) : (
                              <ArrowDownRight className="w-4 h-4" />
                            )}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                              {mov.concepto}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                              {mov.monederoId ? getWalletName(mov.monederoId) : 'Ajuste de capital'} ·{' '}
                              {formatDateTime(mov.fecha)}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <p
                            className={`text-sm font-semibold font-mono tabular-nums ${
                              isInflow
                                ? 'text-emerald-700 dark:text-emerald-400'
                                : 'text-red-600 dark:text-red-400'
                            }`}
                          >
                            {isInflow ? '+' : ''}
                            {formatUSD(mov.montoUSD)}
                          </p>
                          <p className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                            {formatVES(mov.montoUSD, mov.tasaAplicada)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Reposición Sugerida
                </h2>
                <button
                  type="button"
                  onClick={() => setActiveTab('inventory')}
                  className="text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 whitespace-nowrap"
                >
                  Ir a Stock
                </button>
              </div>

              {state.products.length === 0 ? (
                <div className="p-6 text-center space-y-1.5">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    Catálogo sin productos
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Aquí aparecerán alertas cuando algún producto tenga 10 unidades o menos.
                  </p>
                </div>
              ) : lowStockProducts.length === 0 ? (
                <div className="p-6 text-center space-y-1.5">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    Stock saludable
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Todos los productos superan las 10 unidades en inventario.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {lowStockProducts.slice(0, 6).map((prod) => (
                    <div
                      key={prod.id}
                      className="px-5 py-3 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                          {prod.nombre}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                          Costo {formatUSD(prod.costoUSD)} · Venta {formatUSD(prod.precioUSD)}
                        </p>
                      </div>
                      <span
                        className={`text-xs font-mono tabular-nums font-semibold shrink-0 ${
                          prod.stock === 0
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-amber-700 dark:text-amber-400'
                        }`}
                      >
                        {formatQty(prod.stock, prod.unidad)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {catalogEnabled && (
        <CatalogExportModal open={catalogOpen} onClose={() => setCatalogOpen(false)} />
      )}
    </div>
  );
};
