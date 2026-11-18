import React, { useMemo, useState } from 'react';
import {
  BellRing,
  CalendarClock,
  CheckCircle2,
  Edit3,
  FileText,
  Plus,
  RotateCcw,
  ShieldAlert,
  Trash2,
  Truck,
  Zap,
} from 'lucide-react';
import { useStockfy } from '../context/StockfyContext';
import type { FixedExpenseFrequency, FixedExpenseTemplate, WalletId } from '../types/stockfy';
import {
  WALLETS,
  addDaysToYMD,
  diffDaysFromTodayYMD,
  formatDateTime,
  formatQty,
  formatShortDate,
  formatShortYMD,
  formatUSD,
  formatVES,
  formatVESDirect,
  getFrequencyIntervalDays,
  getFrequencyLabel,
  getLocalTodayYMD,
  getWalletName,
  round2,
  round3,
} from '../utils/formatters';

export const ExpensesAndWarrantiesView: React.FC = () => {
  const {
    state,
    metrics,
    isCashierLocked,
    createFixedTemplate,
    updateFixedTemplate,
    deleteFixedTemplate,
    payFixedTemplate,
    registerExtraExpense,
    addSupplierPayable,
    paySupplierPayable,
    deleteSupplierPayable,
    registerWarranty,
    setSelectedReceipt,
    showToast,
  } = useStockfy();

  const rate = state.rates.activeRate;
  const suppliersEnabled = state.features.enableSuppliersAndNetAnalytics;
  const [subTab, setSubTab] = useState<'fixed' | 'extra' | 'suppliers' | 'warranty'>('fixed');
  const effectiveSubTab =
    subTab === 'suppliers' && !suppliersEnabled ? 'fixed' : subTab;

  // Fixed Template Form (create or edit)
  const [editingTplId, setEditingTplId] = useState<string | null>(null);
  const [tplName, setTplName] = useState('');
  const [tplCat, setTplCat] = useState<FixedExpenseTemplate['categoria']>('Servicios');
  const [tplAmount, setTplAmount] = useState('');
  const [tplWallet, setTplWallet] = useState<WalletId>('pago_movil');
  const [tplFreq, setTplFreq] = useState<FixedExpenseFrequency>('mensual');
  const [tplCustomDays, setTplCustomDays] = useState('30');
  const [tplNextDue, setTplNextDue] = useState(() => addDaysToYMD(getLocalTodayYMD(), 30));
  const [tplNotes, setTplNotes] = useState('');

  // Extra Expense Form
  const [expConcept, setExpConcept] = useState('');
  const [expCategory, setExpCategory] = useState('Fletes y Envíos');
  const [expBeneficiary, setExpBeneficiary] = useState('');
  const [expCurrency, setExpCurrency] = useState<'USD' | 'VES'>('USD');
  const [expAmount, setExpAmount] = useState('');
  const [expWallet, setExpWallet] = useState<WalletId>('efectivo_bs');
  const [expNotes, setExpNotes] = useState('');

  // Supplier Payable Form (Point 5)
  const [supName, setSupName] = useState('');
  const [supConcept, setSupConcept] = useState('');
  const [supCurrency, setSupCurrency] = useState<'USD' | 'VES'>('USD');
  const [supAmount, setSupAmount] = useState('');
  const [supDueDate, setSupDueDate] = useState('');
  const [supNotes, setSupNotes] = useState('');
  const [supFilter, setSupFilter] = useState<'pendientes' | 'pagados' | 'todos'>('pendientes');
  const [payingSupId, setPayingSupId] = useState<string | null>(null);
  const [supPayWallet, setSupPayWallet] = useState<WalletId>('pago_movil');
  const [supPayAmount, setSupPayAmount] = useState('');

  // Warranty Form
  const [warProductId, setWarProductId] = useState(state.products[0]?.id || '');
  const [warQty, setWarQty] = useState('1');
  const [warResolution, setWarResolution] = useState<'perdida_total' | 'reingreso_stock'>(
    'perdida_total'
  );
  const [warDeductStock, setWarDeductStock] = useState(true);
  const [warReason, setWarReason] = useState('');

  const expAmountUSD = useMemo(() => {
    const val = parseFloat(expAmount);
    if (!Number.isFinite(val) || val <= 0) return 0;
    return expCurrency === 'USD' ? round2(val) : round2(val / rate);
  }, [expAmount, expCurrency, rate]);

  const supAmountUSD = useMemo(() => {
    const val = parseFloat(supAmount);
    if (!Number.isFinite(val) || val <= 0) return 0;
    return supCurrency === 'USD' ? round2(val) : round2(val / rate);
  }, [supAmount, supCurrency, rate]);

  const filteredSuppliers = useMemo(() => {
    if (supFilter === 'pendientes') return state.suppliers.filter((s) => s.estado === 'pendiente');
    if (supFilter === 'pagados') return state.suppliers.filter((s) => s.estado === 'pagado');
    return state.suppliers;
  }, [state.suppliers, supFilter]);

  const resetTplForm = () => {
    setEditingTplId(null);
    setTplName('');
    setTplCat('Servicios');
    setTplAmount('');
    setTplWallet('pago_movil');
    setTplFreq('mensual');
    setTplCustomDays('30');
    setTplNextDue(addDaysToYMD(getLocalTodayYMD(), 30));
    setTplNotes('');
  };

  const handleTplFreqChange = (nextFreq: FixedExpenseFrequency) => {
    setTplFreq(nextFreq);
    if (!editingTplId && nextFreq !== 'sin_recordatorio') {
      const interval = getFrequencyIntervalDays(nextFreq, parseInt(tplCustomDays, 10));
      setTplNextDue(addDaysToYMD(getLocalTodayYMD(), interval));
    }
  };

  const startEditTemplate = (tpl: FixedExpenseTemplate) => {
    setEditingTplId(tpl.id);
    setTplName(tpl.nombre);
    setTplCat(tpl.categoria);
    setTplAmount(String(tpl.montoUSD));
    setTplWallet(tpl.monederoPreferido);
    const freq = tpl.frecuencia || 'sin_recordatorio';
    setTplFreq(freq);
    setTplCustomDays(String(tpl.cadaDias || 30));
    setTplNextDue(
      tpl.proximoVencimiento ||
        addDaysToYMD(getLocalTodayYMD(), getFrequencyIntervalDays(freq, tpl.cadaDias) || 30)
    );
    setTplNotes(tpl.notas || '');
  };

  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(tplAmount);
    if (!tplName.trim() || !Number.isFinite(amount) || amount <= 0) {
      showToast('Completa el nombre y un monto válido');
      return;
    }
    const customDaysNum = Math.max(1, Math.round(parseFloat(tplCustomDays) || 30));
    const recurrencePayload =
      tplFreq === 'sin_recordatorio'
        ? {
            frecuencia: 'sin_recordatorio' as FixedExpenseFrequency,
            cadaDias: undefined,
            proximoVencimiento: undefined,
          }
        : {
            frecuencia: tplFreq,
            cadaDias: getFrequencyIntervalDays(tplFreq, customDaysNum),
            proximoVencimiento: tplNextDue || getLocalTodayYMD(),
          };

    if (editingTplId) {
      updateFixedTemplate(editingTplId, {
        nombre: tplName,
        categoria: tplCat,
        montoUSD: amount,
        monederoPreferido: tplWallet,
        notas: tplNotes.trim() || undefined,
        ...recurrencePayload,
      });
    } else {
      createFixedTemplate({
        nombre: tplName,
        categoria: tplCat,
        montoUSD: amount,
        monederoPreferido: tplWallet,
        notas: tplNotes.trim() || undefined,
        ...recurrencePayload,
      });
    }
    resetTplForm();
  };

  const handleRegisterExtra = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expConcept.trim() || expAmountUSD <= 0) {
      showToast('Ingresa el concepto y un monto mayor a 0');
      return;
    }
    const created = registerExtraExpense({
      concepto: expConcept,
      categoria: expCategory,
      beneficiario: expBeneficiary || undefined,
      montoUSD: expAmountUSD,
      monederoId: expWallet,
      notas: expNotes || undefined,
    });
    setExpConcept('');
    setExpBeneficiary('');
    setExpAmount('');
    setExpNotes('');
    setSelectedReceipt(created);
  };

  const handleAddSupplierPayable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName.trim() || !supConcept.trim() || supAmountUSD <= 0) {
      showToast('Completa proveedor, concepto y un monto válido');
      return;
    }
    addSupplierPayable({
      proveedor: supName,
      concepto: supConcept,
      montoTotalUSD: supAmountUSD,
      fechaVencimiento: supDueDate || undefined,
      notas: supNotes || undefined,
    });
    setSupName('');
    setSupConcept('');
    setSupAmount('');
    setSupDueDate('');
    setSupNotes('');
  };

  const selectedWarrantyProd = useMemo(
    () => state.products.find((p) => p.id === (warProductId || state.products[0]?.id)),
    [state.products, warProductId]
  );

  const handleRegisterWarranty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWarrantyProd) {
      showToast('Selecciona un producto del catálogo');
      return;
    }
    const qty = round3(parseFloat(warQty));
    if (!Number.isFinite(qty) || qty <= 0) {
      showToast('Ingresa una cantidad válida');
      return;
    }
    registerWarranty({
      productId: selectedWarrantyProd.id,
      cantidad: qty,
      resolucion: warResolution,
      descontarDeStock: warResolution === 'perdida_total' ? warDeductStock : false,
      motivo: warReason || 'Producto defectuoso / merma',
    });
    setWarQty('1');
    setWarReason('');
  };

  return (
    <div className="space-y-6">
      {/* Sub-tabs */}
      <div className="inline-flex flex-wrap p-1 bg-slate-200/70 dark:bg-slate-800 rounded-xl gap-1">
        <button
          type="button"
          onClick={() => setSubTab('fixed')}
          className={`min-h-[40px] px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
            effectiveSubTab === 'fixed'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Nómina, Alquiler y Fijos
        </button>
        <button
          type="button"
          onClick={() => setSubTab('extra')}
          className={`min-h-[40px] px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
            effectiveSubTab === 'extra'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Gastos Extras y Recibos
        </button>
        {suppliersEnabled && (
          <button
            type="button"
            onClick={() => setSubTab('suppliers')}
            className={`min-h-[40px] px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              effectiveSubTab === 'suppliers'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>Proveedores</span>
            {metrics.porPagarProveedoresCount > 0 && (
              <span className="font-mono tabular-nums text-[11px] font-bold text-amber-600 dark:text-amber-400">
                ({metrics.porPagarProveedoresCount})
              </span>
            )}
          </button>
        )}
        <button
          type="button"
          onClick={() => setSubTab('warranty')}
          className={`min-h-[40px] px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
            effectiveSubTab === 'warranty'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Garantías y Pérdidas
        </button>
      </div>

      {effectiveSubTab === 'fixed' && (
        <div className="space-y-6">
          {/* 2-Day Advance Fixed Payment Reminders */}
          {metrics.upcomingFixedReminders.length > 0 && (
            <div className="rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <BellRing className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Recordatorios de Pago Próximo (2 días de anticipación)
                  </h2>
                </div>
                <span className="text-xs font-mono tabular-nums font-semibold text-amber-700 dark:text-amber-300">
                  {metrics.upcomingFixedReminders.length}{' '}
                  {metrics.upcomingFixedReminders.length === 1 ? 'aviso activo' : 'avisos activos'}
                </span>
              </div>

              <div className="divide-y divide-amber-200/70 dark:divide-amber-900/50 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-amber-200/80 dark:border-amber-900/40">
                {metrics.upcomingFixedReminders.map(({ template: tpl, diasRestantes }) => {
                  const urgencyText =
                    diasRestantes < 0
                      ? `Vencido hace ${Math.abs(diasRestantes)} ${
                          Math.abs(diasRestantes) === 1 ? 'día' : 'días'
                        }`
                      : diasRestantes === 0
                      ? 'Vence hoy'
                      : diasRestantes === 1
                      ? 'Vence mañana'
                      : 'Vence en 2 días';

                  return (
                    <div
                      key={tpl.id}
                      className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span
                            className={`font-bold ${
                              diasRestantes <= 0
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-amber-700 dark:text-amber-400'
                            }`}
                          >
                            {urgencyText}
                          </span>
                          <span className="text-slate-400">·</span>
                          <span className="text-slate-500 dark:text-slate-400">
                            {tpl.proximoVencimiento ? formatShortYMD(tpl.proximoVencimiento) : ''}
                          </span>
                          <span className="text-slate-400">·</span>
                          <span className="text-slate-500 dark:text-slate-400">
                            {getFrequencyLabel(tpl.frecuencia, tpl.cadaDias)}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {tpl.nombre}
                        </p>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                        <div className="text-left sm:text-right font-mono tabular-nums">
                          <p className="text-sm font-bold text-slate-900 dark:text-white">
                            {formatUSD(tpl.montoUSD)}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {formatVES(tpl.montoUSD, rate)}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const receipt = payFixedTemplate(tpl.id);
                            if (receipt) setSelectedReceipt(receipt);
                          }}
                          className="min-h-[42px] px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors"
                        >
                          <Zap className="w-3.5 h-3.5 text-emerald-400 dark:text-white" />
                          <span>Pagar 1-Clic</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Fixed Templates Grid */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Plantillas Fijas Reutilizables (Ejecución con 1 Clic)
                </h2>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                  {state.fixedTemplates.length} plantillas
                </span>
              </div>

              {state.fixedTemplates.length === 0 ? (
                <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-4">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-800 dark:text-white">
                      Sin plantillas de gastos fijos aún
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Crea tus compromisos recurrentes (Nómina, Alquiler, Internet) con recordatorio
                      automático 2 días antes o usa un atajo:
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setTplName('Nómina de Empleados');
                        setTplCat('Nómina');
                        setTplAmount('100');
                        setTplWallet('pago_movil');
                        setTplFreq('semanal');
                        setTplNextDue(addDaysToYMD(getLocalTodayYMD(), 7));
                      }}
                      className="min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      + Nómina (Semanal)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTplName('Alquiler del Local');
                        setTplCat('Alquiler');
                        setTplAmount('150');
                        setTplWallet('zelle');
                        setTplFreq('mensual');
                        setTplNextDue(addDaysToYMD(getLocalTodayYMD(), 30));
                      }}
                      className="min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      + Alquiler (Mensual)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTplName('Internet Fibra / Servicios');
                        setTplCat('Servicios');
                        setTplAmount('30');
                        setTplWallet('pago_movil');
                        setTplFreq('mensual');
                        setTplNextDue(addDaysToYMD(getLocalTodayYMD(), 30));
                      }}
                      className="min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      + Internet (Mensual)
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {state.fixedTemplates.map((tpl) => {
                    const hasReminder =
                      tpl.frecuencia &&
                      tpl.frecuencia !== 'sin_recordatorio' &&
                      tpl.proximoVencimiento;
                    const daysLeft = hasReminder
                      ? diffDaysFromTodayYMD(tpl.proximoVencimiento!)
                      : 999;
                    const isDueSoon = hasReminder && daysLeft <= 2;

                    return (
                      <div
                        key={tpl.id}
                        className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                          isDueSoon
                            ? 'border-amber-300 dark:border-amber-800'
                            : 'border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {tpl.categoria}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{getWalletName(tpl.monederoPreferido)}</span>
                            <span aria-hidden="true">·</span>
                            <span>{getFrequencyLabel(tpl.frecuencia, tpl.cadaDias)}</span>
                          </div>
                          <p className="text-base font-semibold text-slate-900 dark:text-white truncate">
                            {tpl.nombre}
                          </p>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                            {hasReminder && (
                              <span
                                className={`inline-flex items-center gap-1 font-medium ${
                                  daysLeft <= 0
                                    ? 'text-red-600 dark:text-red-400'
                                    : daysLeft <= 2
                                    ? 'text-amber-700 dark:text-amber-400'
                                    : 'text-slate-500 dark:text-slate-400'
                                }`}
                              >
                                <CalendarClock className="w-3.5 h-3.5 shrink-0" />
                                <span>
                                  Próx: {formatShortYMD(tpl.proximoVencimiento!)}
                                  {daysLeft < 0
                                    ? ` (Vencido ${Math.abs(daysLeft)}d)`
                                    : daysLeft === 0
                                    ? ' (Hoy)'
                                    : daysLeft <= 2
                                    ? ` (En ${daysLeft}d)`
                                    : ''}
                                </span>
                              </span>
                            )}
                            {tpl.ultimoPago && (
                              <span>Último pago: {formatDateTime(tpl.ultimoPago)}</span>
                            )}
                          </div>
                          {tpl.notas && (
                            <p className="text-xs text-slate-500 dark:text-slate-400">{tpl.notas}</p>
                          )}
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                          <div className="text-left sm:text-right font-mono tabular-nums mr-1">
                            <p className="text-base font-bold text-slate-900 dark:text-white">
                              {formatUSD(tpl.montoUSD)}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {formatVES(tpl.montoUSD, rate)}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              const receipt = payFixedTemplate(tpl.id);
                              if (receipt) setSelectedReceipt(receipt);
                            }}
                            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors"
                          >
                            <Zap className="w-3.5 h-3.5 text-emerald-400 dark:text-white" />
                            <span>Pagar 1-Clic</span>
                          </button>

                          {!isCashierLocked && (
                            <>
                              <button
                                type="button"
                                onClick={() => startEditTemplate(tpl)}
                                className="min-h-[44px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                                aria-label={`Editar plantilla ${tpl.nombre}`}
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() => deleteFixedTemplate(tpl.id)}
                                className="min-h-[44px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
                                aria-label={`Eliminar plantilla ${tpl.nombre}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          {/* Create / Edit Fixed Template Form */}
          <form
            onSubmit={handleSaveTemplate}
            className="lg:col-span-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                {editingTplId
                  ? 'Editar Plantilla Fija'
                  : 'Nueva Plantilla de Compromiso Fijo'}
              </h3>
              {editingTplId && (
                <button
                  type="button"
                  onClick={resetTplForm}
                  className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white"
                >
                  Cancelar edición
                </button>
              )}
            </div>

            <div>
              <label
                htmlFor="tpl-name"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                Concepto *
              </label>
              <input
                id="tpl-name"
                type="text"
                required
                value={tplName}
                onChange={(e) => setTplName(e.target.value)}
                placeholder="Ej. Contador Mensual / Internet / Nómina"
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="tpl-cat"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                >
                  Categoría
                </label>
                <select
                  id="tpl-cat"
                  value={tplCat}
                  onChange={(e) =>
                    setTplCat(e.target.value as FixedExpenseTemplate['categoria'])
                  }
                  className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                >
                  <option value="Nómina">Nómina</option>
                  <option value="Alquiler">Alquiler</option>
                  <option value="Servicios">Servicios</option>
                  <option value="Fijo">Fijo Personalizado</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="tpl-amt"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                >
                  Monto USD ($) *
                </label>
                <input
                  id="tpl-amt"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={tplAmount}
                  onChange={(e) => setTplAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono tabular-nums text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="tpl-wal"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                Monedero predeterminado
              </label>
              <select
                id="tpl-wal"
                value={tplWallet}
                onChange={(e) => setTplWallet(e.target.value as WalletId)}
                className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
              >
                {WALLETS.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <CalendarClock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Frecuencia y Recordatorio (2 días antes)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="tpl-freq"
                    className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1"
                  >
                    Periodicidad de pago
                  </label>
                  <select
                    id="tpl-freq"
                    value={tplFreq}
                    onChange={(e) =>
                      handleTplFreqChange(e.target.value as FixedExpenseFrequency)
                    }
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="semanal">Semanal (c/ 7 días)</option>
                    <option value="quincenal">Quincenal (c/ 15 días)</option>
                    <option value="mensual">Mensual (c/ 30 días)</option>
                    <option value="personalizada">Personalizada (cada N días)</option>
                    <option value="sin_recordatorio">Sin recordatorio</option>
                  </select>
                </div>

                {tplFreq !== 'sin_recordatorio' && (
                  <div>
                    <label
                      htmlFor="tpl-next-due"
                      className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1"
                    >
                      Próximo vencimiento
                    </label>
                    <input
                      id="tpl-next-due"
                      type="date"
                      value={tplNextDue}
                      onChange={(e) => setTplNextDue(e.target.value)}
                      className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-mono text-slate-900 dark:text-white"
                    />
                  </div>
                )}
              </div>

              {tplFreq === 'personalizada' && (
                <div>
                  <label
                    htmlFor="tpl-custom-days"
                    className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1"
                  >
                    Repetir cada cuántos días *
                  </label>
                  <input
                    id="tpl-custom-days"
                    type="number"
                    min="1"
                    max="365"
                    step="1"
                    value={tplCustomDays}
                    onChange={(e) => setTplCustomDays(e.target.value)}
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-mono tabular-nums text-slate-900 dark:text-white"
                  />
                </div>
              )}

              {tplFreq !== 'sin_recordatorio' && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Recibirás una alerta en Resumen y en esta sección 2 días antes de la fecha, y al
                  pagar se reprogramará automáticamente.
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="tpl-note"
                className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
              >
                Notas (Opcional)
              </label>
              <input
                id="tpl-note"
                type="text"
                value={tplNotes}
                onChange={(e) => setTplNotes(e.target.value)}
                placeholder="Detalle o día de vencimiento"
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <button
              type="submit"
              className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>{editingTplId ? 'Actualizar Plantilla' : 'Guardar Plantilla Fija'}</span>
            </button>
          </form>
        </div>
        </div>
      )}

      {effectiveSubTab === 'extra' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Register Extra Expense */}
          <form
            onSubmit={handleRegisterExtra}
            className="lg:col-span-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4"
          >
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Registrar Gasto Extra / Egreso Menor
            </h2>

            <div>
              <label
                htmlFor="exp-concept"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                Concepto del egreso *
              </label>
              <input
                id="exp-concept"
                type="text"
                required
                value={expConcept}
                onChange={(e) => setExpConcept(e.target.value)}
                placeholder="Ej. Flete mercancía, bolsas, agua, reparación"
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="exp-cat"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                >
                  Categoría
                </label>
                <select
                  id="exp-cat"
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                >
                  <option value="Fletes y Envíos">Fletes y Envíos</option>
                  <option value="Empaques y Papelería">Empaques y Papelería</option>
                  <option value="Servicios Públicos">Servicios Públicos</option>
                  <option value="Mantenimiento">Mantenimiento</option>
                  <option value="Otros Egresos">Otros Egresos</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="exp-ben"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Beneficiario (Opcional)
                </label>
                <input
                  id="exp-ben"
                  type="text"
                  value={expBeneficiary}
                  onChange={(e) => setExpBeneficiary(e.target.value)}
                  placeholder="Proveedor / Técnico"
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="exp-amt"
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Monto del Egreso *
                </label>
                <div className="inline-flex p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setExpCurrency('USD')}
                    className={`px-2.5 py-1 rounded-md ${
                      expCurrency === 'USD'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    USD ($)
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpCurrency('VES')}
                    className={`px-2.5 py-1 rounded-md ${
                      expCurrency === 'VES'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    VES (Bs)
                  </button>
                </div>
              </div>

              <input
                id="exp-amt"
                type="number"
                step="0.01"
                min="0.01"
                required
                value={expAmount}
                onChange={(e) => setExpAmount(e.target.value)}
                placeholder={expCurrency === 'USD' ? 'Ej. 12.50' : 'Ej. 560.00'}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-base font-mono tabular-nums font-semibold text-slate-900 dark:text-white"
              />
              {expAmountUSD > 0 && (
                <p className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                  Equivalente: {formatUSD(expAmountUSD)} · {formatVES(expAmountUSD, rate)}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="exp-wal"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                Monedero de Pago
              </label>
              <select
                id="exp-wal"
                value={expWallet}
                onChange={(e) => setExpWallet(e.target.value as WalletId)}
                className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
              >
                {WALLETS.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="exp-notes"
                className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
              >
                Notas del comprobante (Opcional)
              </label>
              <input
                id="exp-notes"
                type="text"
                value={expNotes}
                onChange={(e) => setExpNotes(e.target.value)}
                placeholder="Detalle adicional"
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <button
              type="submit"
              className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white text-sm font-semibold transition-colors"
            >
              Registrar Egreso y Generar Recibo
            </button>
          </form>

          {/* Receipts History */}
          <div className="lg:col-span-7 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Comprobantes Digitales de Egreso
              </h2>
              <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                {state.extraExpenses.length} recibos
              </span>
            </div>

            {state.extraExpenses.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
                Aún no hay recibos emitidos. Registra un gasto extra o ejecuta un pago fijo.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {state.extraExpenses.map((exp) => (
                  <div
                    key={exp.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                        {exp.numeroRecibo} · {exp.origen === 'fijo' ? 'Pago Fijo' : 'Gasto Extra'} ·{' '}
                        {exp.categoria} · {formatDateTime(exp.fecha)}
                      </p>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {exp.concepto}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {getWalletName(exp.monederoId)}
                        {exp.beneficiario ? ` · ${exp.beneficiario}` : ''}
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                      <div className="text-left sm:text-right font-mono tabular-nums">
                        <p className="text-sm font-bold text-red-600 dark:text-red-400">
                          -{formatUSD(exp.montoUSD)}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {formatVESDirect(exp.montoVES)}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedReceipt(exp)}
                        className="min-h-[42px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Recibo</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Punto 5 Opcional: Cuentas por Pagar (Proveedores) */}
      {effectiveSubTab === 'suppliers' && suppliersEnabled && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={handleAddSupplierPayable}
            className="lg:col-span-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4"
          >
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Registrar Factura por Pagar (Proveedor)
              </h2>
            </div>

            <div>
              <label
                htmlFor="sup-name"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                Nombre del Proveedor *
              </label>
              <input
                id="sup-name"
                type="text"
                required
                value={supName}
                onChange={(e) => setSupName(e.target.value)}
                placeholder="Ej. Distribuidora Central / Mayorista"
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label
                htmlFor="sup-concept"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                Concepto / Nro. Factura *
              </label>
              <input
                id="sup-concept"
                type="text"
                required
                value={supConcept}
                onChange={(e) => setSupConcept(e.target.value)}
                placeholder="Ej. Lote bebidas Fact. #4021"
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="sup-amt"
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Monto Total Adeudado *
                </label>
                <div className="inline-flex p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setSupCurrency('USD')}
                    className={`px-2.5 py-1 rounded-md ${
                      supCurrency === 'USD'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    USD ($)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSupCurrency('VES')}
                    className={`px-2.5 py-1 rounded-md ${
                      supCurrency === 'VES'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    VES (Bs)
                  </button>
                </div>
              </div>

              <input
                id="sup-amt"
                type="number"
                step="0.01"
                min="0.01"
                required
                value={supAmount}
                onChange={(e) => setSupAmount(e.target.value)}
                placeholder={supCurrency === 'USD' ? 'Ej. 240.00' : 'Ej. 10800.00'}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-base font-mono tabular-nums font-semibold text-slate-900 dark:text-white"
              />
              {supAmountUSD > 0 && (
                <p className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                  Equivalente: {formatUSD(supAmountUSD)} · {formatVES(supAmountUSD, rate)}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="sup-due"
                  className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
                >
                  Fecha límite (Opcional)
                </label>
                <input
                  id="sup-due"
                  type="date"
                  value={supDueDate}
                  onChange={(e) => setSupDueDate(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label
                  htmlFor="sup-notes"
                  className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
                >
                  Notas (Opcional)
                </label>
                <input
                  id="sup-notes"
                  type="text"
                  value={supNotes}
                  onChange={(e) => setSupNotes(e.target.value)}
                  placeholder="Crédito a 15 días"
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Cuenta por Pagar</span>
            </button>
          </form>

          <div className="lg:col-span-7 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Cuentas por Pagar a Proveedores
                </h2>
                <p className="text-xs font-mono tabular-nums text-amber-700 dark:text-amber-400 font-semibold mt-0.5">
                  Saldo pendiente total: {formatUSD(metrics.porPagarProveedoresUSD)} (
                  {formatVES(metrics.porPagarProveedoresUSD, rate)})
                </p>
              </div>
              <div className="inline-flex p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
                {(
                  [
                    { id: 'pendientes', label: 'Pendientes' },
                    { id: 'pagados', label: 'Pagados' },
                    { id: 'todos', label: 'Todos' },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSupFilter(f.id)}
                    className={`px-3 py-1 rounded-md font-medium transition-colors ${
                      supFilter === f.id
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredSuppliers.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
                No hay cuentas por pagar en esta vista.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredSuppliers.map((sup) => {
                  const restante = round2(Math.max(0, sup.montoTotalUSD - sup.montoPagadoUSD));
                  const isPaid = sup.estado === 'pagado';
                  const isPaying = payingSupId === sup.id;

                  return (
                    <div key={sup.id} className="p-4 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span
                              className={`font-semibold ${
                                isPaid
                                  ? 'text-emerald-700 dark:text-emerald-400'
                                  : 'text-amber-700 dark:text-amber-400'
                              }`}
                            >
                              {isPaid ? 'Pagado' : 'Pendiente'}
                            </span>
                            <span className="text-slate-400">·</span>
                            <span className="text-slate-500 dark:text-slate-400">
                              Emisión: {formatShortDate(sup.fechaEmision)}
                            </span>
                            {sup.fechaVencimiento && (
                              <>
                                <span className="text-slate-400">·</span>
                                <span className="text-slate-500 dark:text-slate-400">
                                  Vence: {formatShortDate(sup.fechaVencimiento)}
                                </span>
                              </>
                            )}
                          </div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                            {sup.proveedor}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-300">
                            {sup.concepto}
                            {sup.notas ? ` — ${sup.notas}` : ''}
                          </p>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                          <div className="text-left sm:text-right font-mono tabular-nums">
                            <p className="text-sm font-bold text-slate-900 dark:text-white">
                              {isPaid ? formatUSD(sup.montoTotalUSD) : `Debe ${formatUSD(restante)}`}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              Total {formatUSD(sup.montoTotalUSD)} · Abonado{' '}
                              {formatUSD(sup.montoPagadoUSD)}
                            </p>
                          </div>

                          {!isPaid && (
                            <button
                              type="button"
                              onClick={() => {
                                if (isPaying) {
                                  setPayingSupId(null);
                                } else {
                                  setPayingSupId(sup.id);
                                  setSupPayAmount(String(restante));
                                }
                              }}
                              className="min-h-[40px] px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white text-xs font-semibold whitespace-nowrap"
                            >
                              {isPaying ? 'Cerrar' : 'Abonar / Pagar'}
                            </button>
                          )}

                          {!isCashierLocked && (
                            <button
                              type="button"
                              onClick={() => deleteSupplierPayable(sup.id)}
                              className="min-h-[40px] min-w-[38px] flex items-center justify-center rounded-xl text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
                              aria-label={`Eliminar cuenta de ${sup.proveedor}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {isPaying && !isPaid && (
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-center">
                          <select
                            value={supPayWallet}
                            onChange={(e) => setSupPayWallet(e.target.value as WalletId)}
                            className="min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                          >
                            {WALLETS.map((w) => (
                              <option key={w.id} value={w.id}>
                                Pagar con: {w.nombre}
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            max={restante}
                            value={supPayAmount}
                            onChange={(e) => setSupPayAmount(e.target.value)}
                            placeholder="Monto USD"
                            className="min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono tabular-nums text-slate-900 dark:text-white"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const abono = parseFloat(supPayAmount);
                              paySupplierPayable(
                                sup.id,
                                supPayWallet,
                                Number.isFinite(abono) && abono > 0 ? abono : undefined
                              );
                              setPayingSupId(null);
                            }}
                            className="min-h-[40px] px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold whitespace-nowrap"
                          >
                            Confirmar Pago
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {effectiveSubTab === 'warranty' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Register Warranty / Loss */}
          <form
            onSubmit={handleRegisterWarranty}
            className="lg:col-span-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4"
          >
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Control de Garantías y Mermas
            </h2>

            {state.products.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Agrega productos al inventario primero para registrar garantías o devoluciones.
              </p>
            ) : (
              <>
                <div>
                  <label
                    htmlFor="war-prod"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Producto afectado
                  </label>
                  <select
                    id="war-prod"
                    value={selectedWarrantyProd?.id || ''}
                    onChange={(e) => setWarProductId(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                  >
                    {state.products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} (Stock: {formatQty(p.stock, p.unidad)}
                        {!isCashierLocked ? ` · Costo ${formatUSD(p.costoUSD)}` : ''})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="war-qty"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Cantidad afectada ({selectedWarrantyProd?.unidad || 'u'})
                  </label>
                  <input
                    id="war-qty"
                    type="number"
                    min="0.001"
                    step="any"
                    required
                    value={warQty}
                    onChange={(e) => setWarQty(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono tabular-nums text-slate-900 dark:text-white"
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Resolución
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      type="button"
                      onClick={() => setWarResolution('perdida_total')}
                      className={`p-3 rounded-xl border text-left transition-colors ${
                        warResolution === 'perdida_total'
                          ? 'border-red-600 bg-red-50/60 dark:bg-red-950/30'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <p className="text-xs font-semibold text-slate-900 dark:text-white">
                        Pérdida Total (Descuenta del Capital Neto)
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Artículo dañado sin reparación. Registra pérdida neta al costo de
                        adquisición.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setWarResolution('reingreso_stock')}
                      className={`p-3 rounded-xl border text-left transition-colors ${
                        warResolution === 'reingreso_stock'
                          ? 'border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/30'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <p className="text-xs font-semibold text-slate-900 dark:text-white">
                        Reingreso a Stock (Reparado / Recuperado)
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Devuelve las unidades al inventario disponible sin afectar el capital.
                      </p>
                    </button>
                  </div>
                </div>

                {warResolution === 'perdida_total' && (
                  <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={warDeductStock}
                      onChange={(e) => setWarDeductStock(e.target.checked)}
                      className="w-4 h-4 rounded accent-red-600"
                    />
                    <span>Descontar estas unidades del stock actual del catálogo</span>
                  </label>
                )}

                <div>
                  <label
                    htmlFor="war-reason"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Motivo / Observación
                  </label>
                  <input
                    id="war-reason"
                    type="text"
                    value={warReason}
                    onChange={(e) => setWarReason(e.target.value)}
                    placeholder="Ej. Empaque roto, falla de fábrica, reparado"
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                  />
                </div>

                {selectedWarrantyProd && (
                  <div className="p-3.5 rounded-xl bg-slate-900 dark:bg-slate-950 border border-slate-800 text-white text-xs flex items-center justify-between">
                    <span className="text-slate-300">
                      {warResolution === 'perdida_total'
                        ? 'Pérdida neta en capital'
                        : 'Cantidad a sumar al stock'}
                    </span>
                    <span className="font-mono tabular-nums font-bold text-sm">
                      {warResolution === 'perdida_total'
                        ? `-${formatUSD(
                            round3(parseFloat(warQty) || 0) * selectedWarrantyProd.costoUSD
                          )}`
                        : `+${formatQty(
                            round3(parseFloat(warQty) || 0),
                            selectedWarrantyProd.unidad
                          )}`}
                    </span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white text-sm font-semibold transition-colors"
                >
                  Registrar Resolución de Garantía
                </button>
              </>
            )}
          </form>

          {/* Warranties History */}
          <div className="lg:col-span-7 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Historial de Garantías y Pérdidas
              </h2>
              <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                {state.warranties.length} registros
              </span>
            </div>

            {state.warranties.length === 0 ? (
              <div className="p-8 text-center space-y-1.5">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mx-auto" />
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Sin mermas ni garantías
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Cuando reportes un producto defectuoso o reingresado aparecerá aquí.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {state.warranties.map((w) => {
                  const isLoss = w.resolucion === 'perdida_total';
                  const prodUnit = state.products.find((p) => p.id === w.productId)?.unidad;
                  return (
                    <div
                      key={w.id}
                      className="p-4 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <span
                          className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isLoss
                              ? 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400'
                              : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                          }`}
                        >
                          {isLoss ? (
                            <ShieldAlert className="w-4 h-4" />
                          ) : (
                            <RotateCcw className="w-4 h-4" />
                          )}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                            {w.productoNombre} ({formatQty(w.cantidad, prodUnit)})
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {isLoss ? 'Pérdida Total' : 'Reingreso a Stock'} · {w.motivo} ·{' '}
                            {formatDateTime(w.fecha)}
                          </p>
                        </div>
                      </div>

                      <div className="text-right font-mono tabular-nums shrink-0">
                        {isLoss ? (
                          <>
                            <p className="text-sm font-bold text-red-600 dark:text-red-400">
                              -{formatUSD(w.perdidaTotalUSD)}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {formatVES(w.perdidaTotalUSD, rate)}
                            </p>
                          </>
                        ) : (
                          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                            +{formatQty(w.cantidad, prodUnit)} en stock
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
