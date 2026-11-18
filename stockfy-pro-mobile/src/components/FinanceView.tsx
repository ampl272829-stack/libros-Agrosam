import React, { useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowLeftRight,
  ArrowUpRight,
  CheckCircle2,
  ClipboardCheck,
  Edit3,
  Landmark,
  Minus,
  PiggyBank,
  Plus,
  SlidersHorizontal,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';
import { useStockfy } from '../context/StockfyContext';
import type { LedgerMovement, WalletId } from '../types/stockfy';
import {
  WALLETS,
  formatDateTime,
  formatUSD,
  formatVES,
  getWalletName,
  round2,
} from '../utils/formatters';

export const FinanceView: React.FC = () => {
  const {
    state,
    metrics,
    injectCapital,
    adjustCapital,
    updateCapitalMovement,
    deleteCapitalMovement,
    transferBetweenWallets,
    transferToSavings,
    withdrawFromSavings,
    recordCashClosing,
    showToast,
  } = useStockfy();

  const rate = state.rates.activeRate;

  // Capital Management Form (Inyectar / Retirar / Corregir Saldo)
  const [capActionMode, setCapActionMode] = useState<'inyectar' | 'retirar' | 'corregir'>('inyectar');
  const [injCurrency, setInjCurrency] = useState<'USD' | 'VES'>('USD');
  const [injAmount, setInjAmount] = useState('');
  const [injConcept, setInjConcept] = useState('');
  const [injWallet, setInjWallet] = useState<WalletId>('efectivo_usd');

  // Ledger edit / delete state for capital movements
  const [editingMovId, setEditingMovId] = useState<string | null>(null);
  const [editMovAmount, setEditMovAmount] = useState('');
  const [editMovWallet, setEditMovWallet] = useState<WalletId>('efectivo_usd');
  const [editMovConcept, setEditMovConcept] = useState('');
  const [confirmDeleteMovId, setConfirmDeleteMovId] = useState<string | null>(null);

  // Savings Form
  const [savMode, setSavMode] = useState<'deposito' | 'retiro'>('deposito');
  const [savCurrency, setSavCurrency] = useState<'USD' | 'VES'>('USD');
  const [savAmount, setSavAmount] = useState('');
  const [savWallet, setSavWallet] = useState<WalletId>('efectivo_usd');
  const [savNote, setSavNote] = useState('');

  // Internal Wallet Transfer Form
  const [trFrom, setTrFrom] = useState<WalletId>('pago_movil');
  const [trTo, setTrTo] = useState<WalletId>('efectivo_usd');
  const [trAmount, setTrAmount] = useState('');
  const [trNote, setTrNote] = useState('');

  // Shift Cash Closing / Arqueo (Point 3)
  const [closingCashier, setClosingCashier] = useState('Propietario / Turno');
  const [closingObs, setClosingObs] = useState('');
  const [walletCounts, setWalletCounts] = useState<Record<WalletId, string>>(() => ({
    pago_movil: '',
    zelle: '',
    binance: '',
    efectivo_usd: '',
    efectivo_bs: '',
    punto_venta: '',
    transferencia: '',
  }));

  // Ledger filter
  const [ledgerFilter, setLedgerFilter] = useState<'todos' | 'capital' | 'ingresos' | 'egresos'>(
    'todos'
  );

  const injAmountUSD = useMemo(() => {
    const val = parseFloat(injAmount);
    if (!Number.isFinite(val)) return 0;
    if (capActionMode === 'corregir' && val < 0) return 0;
    if (capActionMode !== 'corregir' && val <= 0) return 0;
    return injCurrency === 'USD' ? round2(val) : round2(val / rate);
  }, [injAmount, injCurrency, rate, capActionMode]);

  const selectedWalletCurrentBal = round2(metrics.walletBalances[injWallet] || 0);
  const corregirDiffUSD = useMemo(() => {
    if (capActionMode !== 'corregir' || injAmount.trim() === '') return 0;
    return round2(injAmountUSD - selectedWalletCurrentBal);
  }, [capActionMode, injAmount, injAmountUSD, selectedWalletCurrentBal]);

  const savAmountUSD = useMemo(() => {
    const val = parseFloat(savAmount);
    if (!Number.isFinite(val) || val <= 0) return 0;
    return savCurrency === 'USD' ? round2(val) : round2(val / rate);
  }, [savAmount, savCurrency, rate]);

  const countedTotalUSD = useMemo(() => {
    let total = 0;
    for (const w of WALLETS) {
      const val = parseFloat(walletCounts[w.id]);
      if (Number.isFinite(val)) total += val;
    }
    return round2(total);
  }, [walletCounts]);

  const closingDiffUSD = useMemo(
    () => round2(countedTotalUSD - metrics.cajaLiquidaUSD),
    [countedTotalUSD, metrics.cajaLiquidaUSD]
  );

  const handleEqualizeCountToSystem = () => {
    const next = {} as Record<WalletId, string>;
    for (const w of WALLETS) {
      next[w.id] = String(round2(metrics.walletBalances[w.id] || 0));
    }
    setWalletCounts(next);
  };

  const handleClearCount = () => {
    setWalletCounts({
      pago_movil: '',
      zelle: '',
      binance: '',
      efectivo_usd: '',
      efectivo_bs: '',
      punto_venta: '',
      transferencia: '',
    });
  };

  const handleSaveCashClosing = (e: React.FormEvent) => {
    e.preventDefault();
    const desgloseConteo: Partial<Record<WalletId, number>> = {};
    for (const w of WALLETS) {
      const val = parseFloat(walletCounts[w.id]);
      desgloseConteo[w.id] = Number.isFinite(val) ? round2(val) : 0;
    }
    recordCashClosing({
      cajero: closingCashier,
      desgloseConteo,
      observacion: closingObs.trim() || undefined,
    });
    setClosingObs('');
  };

  const handleCapitalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (capActionMode === 'inyectar') {
      if (injAmountUSD <= 0) {
        showToast('Ingresa un monto válido mayor a 0');
        return;
      }
      injectCapital({
        montoUSD: injAmountUSD,
        concepto: injConcept || 'Aporte de capital a caja operativa',
        monederoId: injWallet,
      });
    } else if (capActionMode === 'retirar') {
      if (injAmountUSD <= 0) {
        showToast('Ingresa un monto mayor a 0 para retirar');
        return;
      }
      adjustCapital({
        mode: 'retiro',
        montoUSD: injAmountUSD,
        monederoId: injWallet,
        concepto: injConcept || 'Retiro / corrección de capital',
      });
    } else {
      const parsed = parseFloat(injAmount);
      if (!Number.isFinite(parsed) || parsed < 0) {
        showToast('Ingresa el saldo real (0 o mayor)');
        return;
      }
      adjustCapital({
        mode: 'fijar_monedero',
        montoUSD: injAmountUSD,
        monederoId: injWallet,
        concepto: injConcept || `Corrección de saldo (${getWalletName(injWallet)})`,
      });
    }
    setInjAmount('');
    setInjConcept('');
  };

  const startEditMov = (mov: LedgerMovement) => {
    setEditingMovId(mov.id);
    setEditMovAmount(String(mov.montoUSD));
    setEditMovWallet(mov.monederoId || 'efectivo_usd');
    setEditMovConcept(mov.concepto);
    setConfirmDeleteMovId(null);
  };

  const handleSaveEditMov = (e: React.FormEvent, movId: string) => {
    e.preventDefault();
    const val = parseFloat(editMovAmount);
    if (!Number.isFinite(val) || val === 0) {
      showToast('Ingresa un monto válido distinto de 0');
      return;
    }
    updateCapitalMovement(movId, {
      montoUSD: val,
      monederoId: editMovWallet,
      concepto: editMovConcept,
    });
    setEditingMovId(null);
  };

  const handleSavingsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (savAmountUSD <= 0) {
      showToast('Ingresa un monto válido para el fondo de ahorro');
      return;
    }
    const ok =
      savMode === 'deposito'
        ? transferToSavings({
            montoUSD: savAmountUSD,
            monederoId: savWallet,
            nota: savNote || 'Apartado a Fondo de Reserva',
          })
        : withdrawFromSavings({
            montoUSD: savAmountUSD,
            monederoId: savWallet,
            nota: savNote || 'Retiro hacia Caja Operativa',
          });
    if (ok) {
      setSavAmount('');
      setSavNote('');
    }
  };

  const handleWalletTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(trAmount);
    if (!Number.isFinite(val) || val <= 0) {
      showToast('Ingresa un monto válido a trasladar');
      return;
    }
    const ok = transferBetweenWallets({
      fromWalletId: trFrom,
      toWalletId: trTo,
      montoUSD: val,
      nota: trNote,
    });
    if (ok) {
      setTrAmount('');
      setTrNote('');
    }
  };

  const filteredLedger = useMemo(() => {
    if (ledgerFilter === 'capital') {
      return state.ledger.filter(
        (m) => m.tipo === 'inyeccion' || m.tipo === 'ajuste_capital'
      );
    }
    if (ledgerFilter === 'ingresos') return state.ledger.filter((m) => m.montoUSD >= 0);
    if (ledgerFilter === 'egresos') return state.ledger.filter((m) => m.montoUSD < 0);
    return state.ledger;
  }, [state.ledger, ledgerFilter]);

  const breakdown = useMemo(() => {
    let inyecciones = 0;
    let ventas = 0;
    let compras = 0;
    let gastos = 0;
    let ahorroNetoEnCaja = 0;
    let perdidas = 0;

    for (const m of state.ledger) {
      if (m.tipo === 'inyeccion' || m.tipo === 'ajuste_capital') inyecciones += m.montoUSD;
      else if (m.tipo === 'venta_contado' || m.tipo === 'cobro_credito') ventas += m.montoUSD;
      else if (m.tipo === 'compra_mercancia') compras += Math.abs(m.montoUSD);
      else if (
        m.tipo === 'gasto_extra' ||
        m.tipo === 'pago_fijo' ||
        m.tipo === 'pago_proveedor'
      )
        gastos += Math.abs(m.montoUSD);
      else if (m.tipo === 'deposito_ahorro' || m.tipo === 'retiro_ahorro')
        ahorroNetoEnCaja += m.montoUSD;
      else if (m.tipo === 'perdida_garantia') perdidas += Math.abs(m.montoUSD);
    }

    return {
      inyecciones: round2(inyecciones),
      ventas: round2(ventas),
      compras: round2(compras),
      gastos: round2(gastos),
      ahorroNetoEnCaja: round2(ahorroNetoEnCaja),
      perdidas: round2(perdidas),
    };
  }, [state.ledger]);

  return (
    <div className="space-y-6">
      {/* Top 2-Column Financial Core: Capital Neto & Fondo de Ahorro */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Capital Neto & Inyección */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between gap-5">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Capital Neto Operativo en Tiempo Real
                </p>
                <p className="text-3xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
                  {formatUSD(metrics.capitalNetoUSD)}
                </p>
                <p className="text-sm font-mono tabular-nums text-emerald-700 dark:text-emerald-400 font-semibold">
                  {formatVES(metrics.capitalNetoUSD, rate)}
                </p>
              </div>
              <Landmark className="w-5 h-5 text-slate-500 dark:text-slate-400 shrink-0" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs font-mono tabular-nums">
              <div>
                <p className="text-slate-500 dark:text-slate-400 font-sans">Aportes / Ajustes</p>
                <p
                  className={`font-semibold ${
                    breakdown.inyecciones < 0
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-emerald-700 dark:text-emerald-400'
                  }`}
                >
                  {breakdown.inyecciones >= 0 ? '+' : ''}
                  {formatUSD(breakdown.inyecciones)}
                </p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400 font-sans">Ventas cobradas</p>
                <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                  +{formatUSD(breakdown.ventas)}
                </p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400 font-sans">Compras stock</p>
                <p className="font-semibold text-red-600 dark:text-red-400">
                  -{formatUSD(breakdown.compras)}
                </p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400 font-sans">Gastos y pagos</p>
                <p className="font-semibold text-red-600 dark:text-red-400">
                  -{formatUSD(breakdown.gastos)}
                </p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400 font-sans">Flujo ahorro</p>
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  {formatUSD(breakdown.ahorroNetoEnCaja)}
                </p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400 font-sans">Pérdidas mermas</p>
                <p className="font-semibold text-red-600 dark:text-red-400">
                  -{formatUSD(breakdown.perdidas)}
                </p>
              </div>
            </div>
          </div>

          <form
            onSubmit={handleCapitalSubmit}
            className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setCapActionMode('inyectar')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    capActionMode === 'inyectar'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  Inyectar (+)
                </button>
                <button
                  type="button"
                  onClick={() => setCapActionMode('retirar')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    capActionMode === 'retirar'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  Retirar (-)
                </button>
                <button
                  type="button"
                  onClick={() => setCapActionMode('corregir')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    capActionMode === 'corregir'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  Corregir Saldo
                </button>
              </div>

              <div className="inline-flex p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setInjCurrency('USD')}
                  className={`px-2 py-1 rounded-md ${
                    injCurrency === 'USD'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  $
                </button>
                <button
                  type="button"
                  onClick={() => setInjCurrency('VES')}
                  className={`px-2 py-1 rounded-md ${
                    injCurrency === 'VES'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  Bs
                </button>
              </div>
            </div>

            {capActionMode === 'corregir' && (
              <div className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] flex flex-wrap items-center justify-between gap-2">
                <span className="text-slate-600 dark:text-slate-400">
                  Saldo actual en {getWalletName(injWallet)}:{' '}
                  <strong className="font-mono tabular-nums text-slate-900 dark:text-white">
                    {formatUSD(selectedWalletCurrentBal)}
                  </strong>
                </span>
                {injAmount.trim() !== '' && (
                  <span
                    className={`font-mono tabular-nums font-semibold ${
                      corregirDiffUSD >= 0
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    Ajuste: {corregirDiffUSD >= 0 ? '+' : ''}
                    {formatUSD(corregirDiffUSD)}
                  </span>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <input
                type="number"
                step="0.01"
                min={capActionMode === 'corregir' ? '0' : '0.01'}
                required
                value={injAmount}
                onChange={(e) => setInjAmount(e.target.value)}
                placeholder={
                  capActionMode === 'corregir'
                    ? injCurrency === 'USD'
                      ? 'Saldo real en $'
                      : 'Saldo real en Bs.'
                    : injCurrency === 'USD'
                    ? 'Monto en $'
                    : 'Monto en Bs.'
                }
                className="min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono tabular-nums text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
              />
              <select
                value={injWallet}
                onChange={(e) => setInjWallet(e.target.value as WalletId)}
                className="min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
              >
                {WALLETS.map((w) => (
                  <option key={w.id} value={w.id}>
                    {capActionMode === 'retirar'
                      ? `Origen: ${w.nombre}`
                      : capActionMode === 'corregir'
                      ? `Monedero: ${w.nombre}`
                      : `Destino: ${w.nombre}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                value={injConcept}
                onChange={(e) => setInjConcept(e.target.value)}
                placeholder={
                  capActionMode === 'retirar'
                    ? 'Motivo del retiro o corrección'
                    : capActionMode === 'corregir'
                    ? 'Motivo de corrección de saldo'
                    : 'Descripción (ej. Reinversión / Capital inicial)'
                }
                className="flex-1 min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
              />
              <button
                type="submit"
                className={`min-h-[44px] px-4 py-2 rounded-xl text-white text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors ${
                  capActionMode === 'retirar'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500'
                }`}
              >
                {capActionMode === 'inyectar' ? (
                  <Plus className="w-4 h-4" />
                ) : capActionMode === 'retirar' ? (
                  <Minus className="w-4 h-4" />
                ) : (
                  <SlidersHorizontal className="w-4 h-4" />
                )}
                <span>
                  {capActionMode === 'inyectar'
                    ? `Inyectar ${injAmountUSD > 0 ? formatUSD(injAmountUSD) : ''}`
                    : capActionMode === 'retirar'
                    ? `Retirar ${injAmountUSD > 0 ? formatUSD(injAmountUSD) : ''}`
                    : 'Fijar Saldo Real'}
                </span>
              </button>
            </div>
          </form>
        </div>

        {/* Moneda de Ahorro (Alcancia Digital) */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between gap-5">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Moneda de Ahorro (Fondo de Reserva Protegido)
                </p>
                <p className="text-3xl font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400 mt-1">
                  {formatUSD(metrics.ahorroTotalUSD)}
                </p>
                <p className="text-sm font-mono tabular-nums text-slate-600 dark:text-slate-300 font-medium">
                  {formatVES(metrics.ahorroTotalUSD, rate)}
                </p>
              </div>
              <PiggyBank className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Este fondo está aislado de tu caja operativa diaria. Úsalo para resguardar ganancias
              o emergencias sin mezclarlas con gastos corrientes.
            </p>
          </div>

          <form
            onSubmit={handleSavingsSubmit}
            className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl flex-1">
                <button
                  type="button"
                  onClick={() => setSavMode('deposito')}
                  className={`min-h-[38px] px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                    savMode === 'deposito'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Apartar a Reserva
                </button>
                <button
                  type="button"
                  onClick={() => setSavMode('retiro')}
                  className={`min-h-[38px] px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                    savMode === 'retiro'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Retirar a Caja
                </button>
              </div>

              <div className="inline-flex p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setSavCurrency('USD')}
                  className={`px-2 py-1.5 rounded-md ${
                    savCurrency === 'USD'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  $
                </button>
                <button
                  type="button"
                  onClick={() => setSavCurrency('VES')}
                  className={`px-2 py-1.5 rounded-md ${
                    savCurrency === 'VES'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  Bs
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={savAmount}
                onChange={(e) => setSavAmount(e.target.value)}
                placeholder={savCurrency === 'USD' ? 'Monto en USD ($)' : 'Monto en Bs.'}
                className="min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono tabular-nums text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
              />
              <select
                value={savWallet}
                onChange={(e) => setSavWallet(e.target.value as WalletId)}
                className="min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
              >
                {WALLETS.map((w) => (
                  <option key={w.id} value={w.id}>
                    {savMode === 'deposito' ? `Desde: ${w.nombre}` : `Hacia: ${w.nombre}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                value={savNote}
                onChange={(e) => setSavNote(e.target.value)}
                placeholder="Motivo del movimiento"
                className="flex-1 min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
              />
              <button
                type="submit"
                className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold whitespace-nowrap"
              >
                {savMode === 'deposito' ? 'Depositar' : 'Retirar'}{' '}
                {savAmountUSD > 0 ? formatUSD(savAmountUSD) : ''}
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Auditoría de Monederos + Traslado Interno */}
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Auditoría de Monederos (7 Métodos de Pago)
            </h2>
          </div>
          <span className="text-xs font-mono tabular-nums text-slate-600 dark:text-slate-400">
            Total en Monederos:{' '}
            <strong className="text-slate-900 dark:text-white">
              {formatUSD(metrics.cajaLiquidaUSD)}
            </strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-800">
          {WALLETS.map((w) => {
            const bal = metrics.walletBalances[w.id] || 0;
            const txCount = state.ledger.filter((m) => m.monederoId === w.id).length;
            return (
              <div
                key={w.id}
                className="p-4 space-y-1.5 border-b border-slate-100 dark:border-slate-800"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {w.nombre}
                  </p>
                  <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    {txCount} mov.
                  </span>
                </div>
                <p
                  className={`text-xl font-bold font-mono tabular-nums ${
                    bal < 0
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-slate-900 dark:text-white'
                  }`}
                >
                  {formatUSD(bal)}
                </p>
                <p className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                  {formatVES(bal, rate)} · {w.descripcion}
                </p>
              </div>
            );
          })}
        </div>

        {/* Traslado entre Monederos */}
        <form
          onSubmit={handleWalletTransfer}
          className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center gap-3"
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0">
            <ArrowLeftRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Mover entre Monederos:</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 flex-1">
            <select
              value={trFrom}
              onChange={(e) => setTrFrom(e.target.value as WalletId)}
              className="min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
            >
              {WALLETS.map((w) => (
                <option key={w.id} value={w.id}>
                  De: {w.nombre}
                </option>
              ))}
            </select>
            <select
              value={trTo}
              onChange={(e) => setTrTo(e.target.value as WalletId)}
              className="min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
            >
              {WALLETS.map((w) => (
                <option key={w.id} value={w.id}>
                  A: {w.nombre}
                </option>
              ))}
            </select>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={trAmount}
              onChange={(e) => setTrAmount(e.target.value)}
              placeholder="Monto ($)"
              className="min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono tabular-nums text-slate-900 dark:text-white"
            />
            <input
              type="text"
              value={trNote}
              onChange={(e) => setTrNote(e.target.value)}
              placeholder="Nota (ej. Cambio de divisas)"
              className="min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
            />
          </div>

          <button
            type="submit"
            className="min-h-[42px] px-4 py-2 rounded-xl bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white text-xs font-semibold whitespace-nowrap shrink-0"
          >
            Trasladar
          </button>
        </form>
      </section>

      {/* Punto 3 Opcional: Arqueo de Caja y Cierre de Turno */}
      {state.features.enableCashierPinAndShiftClose && (
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={handleSaveCashClosing}
            className="lg:col-span-7 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Arqueo de Caja y Cierre de Turno
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Compara el conteo físico real de cada billetera contra lo calculado por el sistema.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleEqualizeCountToSystem}
                  className="min-h-[34px] px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap"
                >
                  Igualar al sistema
                </button>
                <button
                  type="button"
                  onClick={handleClearCount}
                  className="min-h-[34px] px-2.5 py-1 rounded-lg text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  Limpiar
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="closing-cashier"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                >
                  Responsable / Turno *
                </label>
                <input
                  id="closing-cashier"
                  type="text"
                  required
                  value={closingCashier}
                  onChange={(e) => setClosingCashier(e.target.value)}
                  placeholder="Ej. María / Turno Tarde"
                  className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label
                  htmlFor="closing-obs"
                  className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
                >
                  Observación del arqueo (Opcional)
                </label>
                <input
                  id="closing-obs"
                  type="text"
                  value={closingObs}
                  onChange={(e) => setClosingObs(e.target.value)}
                  placeholder="Ej. Sin novedades / Billetes deteriorados"
                  className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {WALLETS.map((w) => {
                const sysBal = round2(metrics.walletBalances[w.id] || 0);
                return (
                  <div
                    key={w.id}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {w.nombre}
                      </p>
                      <p className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                        Sistema: {formatUSD(sysBal)}
                      </p>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      value={walletCounts[w.id]}
                      onChange={(e) =>
                        setWalletCounts((prev) => ({ ...prev, [w.id]: e.target.value }))
                      }
                      placeholder="0.00"
                      aria-label={`Conteo físico ${w.nombre} en USD`}
                      className="w-28 min-h-[38px] px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono tabular-nums text-right font-semibold text-slate-900 dark:text-white"
                    />
                  </div>
                );
              })}
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 dark:bg-slate-950 border border-slate-800 text-white grid grid-cols-3 gap-2 text-xs">
              <div>
                <p className="text-slate-400">Esperado Sistema</p>
                <p className="font-mono tabular-nums font-bold text-sm mt-0.5">
                  {formatUSD(metrics.cajaLiquidaUSD)}
                </p>
              </div>
              <div>
                <p className="text-slate-400">Contado Físico</p>
                <p className="font-mono tabular-nums font-bold text-sm mt-0.5">
                  {formatUSD(countedTotalUSD)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-slate-400">Diferencia</p>
                <p
                  className={`font-mono tabular-nums font-bold text-sm mt-0.5 ${
                    Math.abs(closingDiffUSD) < 0.01
                      ? 'text-emerald-400'
                      : closingDiffUSD > 0
                      ? 'text-sky-400'
                      : 'text-red-400'
                  }`}
                >
                  {closingDiffUSD > 0 ? '+' : ''}
                  {formatUSD(closingDiffUSD)}{' '}
                  <span className="text-[10px] font-sans font-semibold">
                    {Math.abs(closingDiffUSD) < 0.01
                      ? '(Cuadrado)'
                      : closingDiffUSD > 0
                      ? '(Sobrante)'
                      : '(Faltante)'}
                  </span>
                </p>
              </div>
            </div>

            <button
              type="submit"
              className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Guardar Arqueo de Caja</span>
            </button>
          </form>

          {/* Saved Cash Closings History */}
          <div className="lg:col-span-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Historial de Arqueos
              </h3>
              <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                {state.cashClosings.length} cierres
              </span>
            </div>

            {state.cashClosings.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
                Aún no has guardado arqueos de turno. Registra tu primer conteo físico al finalizar
                la jornada.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[440px] overflow-y-auto">
                {state.cashClosings.map((c) => {
                  const balanced = Math.abs(c.diferenciaUSD) < 0.01;
                  return (
                    <div key={c.id} className="p-4 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                          {c.cajero}
                        </p>
                        <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                          {formatDateTime(c.fecha)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-xs font-mono tabular-nums">
                        <span className="text-slate-500 dark:text-slate-400">
                          Sist: {formatUSD(c.esperadoSistemaUSD)} · Físico:{' '}
                          <strong className="text-slate-900 dark:text-slate-100">
                            {formatUSD(c.contadoFisicoUSD)}
                          </strong>
                        </span>
                        <span
                          className={`font-bold ${
                            balanced
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : c.diferenciaUSD > 0
                              ? 'text-sky-600 dark:text-sky-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {c.diferenciaUSD > 0 ? '+' : ''}
                          {formatUSD(c.diferenciaUSD)}{' '}
                          {balanced ? 'Cuadrado' : c.diferenciaUSD > 0 ? 'Sobrante' : 'Faltante'}
                        </span>
                      </div>
                      {c.observacion && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {c.observacion}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Savings History & Complete Ledger */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Historial Fondo de Ahorro
            </h2>
          </div>
          {state.savingsMovements.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
              Aún no hay depósitos o retiros en la alcancía digital.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {state.savingsMovements.slice(0, 8).map((sm) => {
                const isDep = sm.tipo === 'deposito';
                return (
                  <div key={sm.id} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {sm.nota}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {isDep ? 'Depósito' : 'Retiro'} · {getWalletName(sm.monederoId)} ·{' '}
                        {formatDateTime(sm.fecha)}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-mono tabular-nums font-bold shrink-0 ${
                        isDep
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-amber-700 dark:text-amber-400'
                      }`}
                    >
                      {isDep ? '+' : '-'}
                      {formatUSD(sm.montoUSD)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Libro Mayor de Caja y Capital
            </h2>
            <div className="inline-flex p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
              {(
                [
                  { id: 'todos', label: 'Todos' },
                  { id: 'capital', label: 'Capital' },
                  { id: 'ingresos', label: 'Ingresos' },
                  { id: 'egresos', label: 'Egresos' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setLedgerFilter(f.id)}
                  className={`px-3 py-1 rounded-md font-medium transition-colors ${
                    ledgerFilter === f.id
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {filteredLedger.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
              Sin movimientos registrados para este filtro.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[420px] overflow-y-auto">
              {filteredLedger.map((mov) => {
                const isPos = mov.montoUSD >= 0;
                const isEditableCapital =
                  mov.tipo === 'inyeccion' || mov.tipo === 'ajuste_capital';
                const isEditing = editingMovId === mov.id;
                const isConfirmDel = confirmDeleteMovId === mov.id;

                if (isEditing) {
                  return (
                    <form
                      key={mov.id}
                      onSubmit={(e) => handleSaveEditMov(e, mov.id)}
                      className="p-4 bg-slate-50 dark:bg-slate-950 space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                          Editar registro de capital
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditingMovId(null)}
                          className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Cancelar</span>
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={editMovAmount}
                          onChange={(e) => setEditMovAmount(e.target.value)}
                          placeholder="Monto USD"
                          className="min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono tabular-nums text-slate-900 dark:text-white"
                        />
                        <select
                          value={editMovWallet}
                          onChange={(e) => setEditMovWallet(e.target.value as WalletId)}
                          className="min-h-[38px] px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                        >
                          {WALLETS.map((w) => (
                            <option key={w.id} value={w.id}>
                              {w.nombre}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={editMovConcept}
                          onChange={(e) => setEditMovConcept(e.target.value)}
                          placeholder="Concepto"
                          className="min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                        />
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          className="min-h-[36px] px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                        >
                          Guardar Cambio
                        </button>
                      </div>
                    </form>
                  );
                }

                return (
                  <div
                    key={mov.id}
                    className="px-5 py-3 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <span
                        className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          isPos
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                            : 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-400'
                        }`}
                      >
                        {isPos ? (
                          <ArrowUpRight className="w-4 h-4" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                          {mov.concepto}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {mov.monederoId ? getWalletName(mov.monederoId) : 'Capital Neto'} ·{' '}
                          {formatDateTime(mov.fecha)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right font-mono tabular-nums">
                        <p
                          className={`text-sm font-semibold ${
                            isPos
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {isPos ? '+' : ''}
                          {formatUSD(mov.montoUSD)}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {formatVES(mov.montoUSD, mov.tasaAplicada)}
                        </p>
                      </div>

                      {isEditableCapital && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => startEditMov(mov)}
                            title="Editar capital"
                            aria-label={`Editar ${mov.concepto}`}
                            className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          {isConfirmDel ? (
                            <button
                              type="button"
                              onClick={() => {
                                deleteCapitalMovement(mov.id);
                                setConfirmDeleteMovId(null);
                              }}
                              className="min-h-[34px] px-2 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-semibold whitespace-nowrap"
                            >
                              Borrar
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteMovId(mov.id)}
                              title="Eliminar registro de capital"
                              aria-label={`Eliminar ${mov.concepto}`}
                              className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

