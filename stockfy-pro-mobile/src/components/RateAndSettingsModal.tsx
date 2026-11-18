import React, { useEffect, useState } from 'react';
import {
  Check,
  Download,
  Lock,
  Moon,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sun,
  Trash2,
  Upload,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { useStockfy } from '../context/StockfyContext';
import { exportInventoryCsv, exportLedgerCsv, exportSalesCsv } from '../utils/csvExport';
import { formatDateTime, formatRate } from '../utils/formatters';
import { PWAInstallButton } from './PWAInstallButton';

interface RateAndSettingsModalProps {
  open: boolean;
  onClose: () => void;
  initialSection?: 'rates' | 'store' | 'modules';
}

export const RateAndSettingsModal: React.FC<RateAndSettingsModalProps> = ({
  open,
  onClose,
  initialSection = 'rates',
}) => {
  const {
    state,
    theme,
    toggleTheme,
    isSyncingRate,
    syncError,
    syncRatesNow,
    setRateSource,
    setManualRate,
    updateStoreConfig,
    updateFeatures,
    isCashierLocked,
    lockCashierMode,
    exportDataJson,
    importDataJson,
    resetToDemo,
    resetToEmpty,
    showToast,
  } = useStockfy();

  const [section, setSection] = useState<'rates' | 'store' | 'modules'>(initialSection);
  const [manualInput, setManualInput] = useState(String(state.rates.activeRate));
  const [storeName, setStoreName] = useState(state.store.nombreComercio);
  const [storeRif, setStoreRif] = useState(state.store.rif || '');
  const [storePhone, setStorePhone] = useState(state.store.telefono || '');
  const [pinDraft, setPinDraft] = useState(state.features.ownerPin || '1234');
  const [confirmResetMode, setConfirmResetMode] = useState<'none' | 'demo' | 'empty'>('none');

  useEffect(() => {
    if (open) {
      setSection(initialSection);
      setManualInput(String(state.rates.manualRate || state.rates.activeRate));
      setStoreName(state.store.nombreComercio);
      setStoreRif(state.store.rif || '');
      setStorePhone(state.store.telefono || '');
      setPinDraft(state.features.ownerPin || '1234');
      setConfirmResetMode('none');
    }
  }, [
    open,
    initialSection,
    state.rates.manualRate,
    state.rates.activeRate,
    state.store,
    state.features.ownerPin,
  ]);

  if (!open) return null;

  const handleSaveManualRate = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(manualInput.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      showToast('Ingresa una tasa válida mayor a 0');
      return;
    }
    setManualRate(parsed);
  };

  const handleSaveStore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim()) {
      showToast('El nombre del comercio es obligatorio');
      return;
    }
    updateStoreConfig({
      nombreComercio: storeName.trim(),
      rif: storeRif.trim() || undefined,
      telefono: storePhone.trim() || undefined,
    });
  };

  const handleSavePin = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = pinDraft.replace(/\D/g, '').slice(0, 6);
    if (clean.length < 4) {
      showToast('El PIN debe tener al menos 4 dígitos numéricos');
      return;
    }
    setPinDraft(clean);
    updateFeatures({ ownerPin: clean });
  };

  const handleExportBackup = () => {
    const json = exportDataJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stockfy-respaldo-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Respaldo local exportado');
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const ok = importDataJson(String(reader.result || ''));
      if (!ok) {
        showToast('El archivo no es un respaldo válido de Stockfy');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const featureItems = [
    {
      key: 'enableScannerAndShare' as const,
      title: 'Escáner de Cámara y Compartir WhatsApp (Punto 2)',
      desc: 'Activa el lector de códigos de barras con cámara en Inventario y POS, más botones de envío de tickets y recordatorios de cobro.',
      enabled: state.features.enableScannerAndShare,
    },
    {
      key: 'enableCashierPinAndShiftClose' as const,
      title: 'Modo Cajero con PIN y Arqueo de Caja (Punto 3)',
      desc: 'Protege utilidades, anulación de ventas y caja con PIN de dueño, y habilita el registro de arqueos al cierre de turno.',
      enabled: state.features.enableCashierPinAndShiftClose,
    },
    {
      key: 'enableSuppliersAndNetAnalytics' as const,
      title: 'Proveedores (Por Pagar), Utilidad Neta y Top 5 (Punto 5)',
      desc: 'Habilita el control de cuentas por pagar a distribuidores, utilidad neta real (restando gastos) y ranking de productos más vendidos.',
      enabled: state.features.enableSuppliersAndNetAnalytics,
    },
    {
      key: 'enablePublicCatalogExport' as const,
      title: 'Catálogo de Precios para Clientes (Punto 6)',
      desc: 'Activa la exportación e impresión de lista de precios en $ y Bs sin costos internos para difundir por WhatsApp.',
      enabled: state.features.enablePublicCatalogExport,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-xs p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rate-modal-title"
    >
      <div className="w-full sm:max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden max-h-[92dvh] flex flex-col">
        <div className="sm:hidden w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mt-3 mb-1 shrink-0" />

        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div>
            <h2
              id="rate-modal-title"
              className="text-base font-semibold text-slate-900 dark:text-slate-100"
            >
              Configuración y Tasa Cambiaria
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              DolarApi en tiempo real · Módulos activables
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Cerrar configuración"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 pt-4 shrink-0">
          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setSection('rates')}
              className={`min-h-[40px] px-2 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                section === 'rates'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              Tasa $/Bs
            </button>
            <button
              type="button"
              onClick={() => setSection('modules')}
              className={`min-h-[40px] px-2 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                section === 'modules'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              Módulos
            </button>
            <button
              type="button"
              onClick={() => setSection('store')}
              className={`min-h-[40px] px-2 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                section === 'store'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              Comercio
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-5 space-y-5 pb-safe">
          {section === 'rates' ? (
            <>
              <div className="flex items-center justify-between gap-3 p-4 rounded-xl bg-slate-900 dark:bg-slate-950 border border-slate-800 text-white">
                <div>
                  <p className="text-xs text-slate-300">
                    Tasa activa (
                    {state.rates.source === 'bcv'
                      ? 'BCV Oficial'
                      : state.rates.source === 'paralelo'
                      ? 'Paralelo'
                      : 'Manual'}
                    )
                  </p>
                  <p className="text-2xl font-bold font-mono tabular-nums mt-0.5">
                    {formatRate(state.rates.activeRate)}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                    {state.rates.syncStatus === 'offline' ? (
                      <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    ) : (
                      <Wifi className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    )}
                    <span>
                      {state.rates.syncStatus === 'offline'
                        ? 'Modo Offline · Última tasa guardada'
                        : state.rates.syncStatus === 'manual'
                        ? 'Edición manual fija'
                        : 'Sincronizado'}{' '}
                      · {formatDateTime(state.rates.lastUpdated)}
                    </span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => void syncRatesNow(false)}
                  disabled={isSyncingRate}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-xs font-semibold transition-colors flex items-center gap-2 shrink-0 whitespace-nowrap"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncingRate ? 'animate-spin' : ''}`} />
                  <span>{isSyncingRate ? 'Sincronizando' : 'Sincronizar'}</span>
                </button>
              </div>

              {syncError && (
                <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-800/70 bg-amber-50 dark:bg-amber-950/50 text-xs text-amber-900 dark:text-amber-200">
                  {syncError}
                </div>
              )}

              <div className="space-y-2.5">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Seleccionar fuente cambiaria predeterminada
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRateSource('bcv')}
                    className={`min-h-[64px] p-3.5 rounded-xl border text-left transition-colors flex items-center justify-between ${
                      state.rates.source === 'bcv'
                        ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/40'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                        BCV (Oficial)
                      </p>
                      <p className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-0.5">
                        {formatRate(state.rates.bcvRate)}
                      </p>
                    </div>
                    {state.rates.source === 'bcv' && (
                      <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setRateSource('paralelo')}
                    className={`min-h-[64px] p-3.5 rounded-xl border text-left transition-colors flex items-center justify-between ${
                      state.rates.source === 'paralelo'
                        ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/40'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                        Dólar Paralelo
                      </p>
                      <p className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-0.5">
                        {formatRate(state.rates.paraleloRate)}
                      </p>
                    </div>
                    {state.rates.source === 'paralelo' && (
                      <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    )}
                  </button>
                </div>
              </div>

              <form
                onSubmit={handleSaveManualRate}
                className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3"
              >
                <label
                  htmlFor="manual-rate-input"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Edición manual (Modo personalizado / Contingencia sin internet)
                </label>
                <div className="flex gap-2">
                  <input
                    id="manual-rate-input"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    className="flex-1 min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
                    placeholder="Ej. 46.50"
                  />
                  <button
                    type="submit"
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white text-sm font-medium hover:bg-slate-800 dark:hover:bg-emerald-500 transition-colors whitespace-nowrap"
                  >
                    Fijar tasa
                  </button>
                </div>
              </form>
            </>
          ) : section === 'modules' ? (
            <div className="space-y-4">
              {isCashierLocked ? (
                <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                  <Lock className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>
                    El Modo Cajero está activo. Desbloquea el Modo Dueño desde la barra superior
                    con tu PIN para activar o desactivar módulos opcionales.
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Activa o desactiva libremente las herramientas opcionales según el flujo de tu
                    negocio. Los pagos mixtos y ventas por peso/bulto están siempre activos.
                  </p>

                  <div className="space-y-3">
                    {featureItems.map((item) => (
                      <div
                        key={item.key}
                        className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950 flex items-start justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-slate-900 dark:text-white">
                            {item.title}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                            {item.desc}
                          </p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={item.enabled}
                          onClick={() => updateFeatures({ [item.key]: !item.enabled })}
                          className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${
                            item.enabled
                              ? 'bg-emerald-600'
                              : 'bg-slate-300 dark:bg-slate-700'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-xs transition-transform ${
                              item.enabled ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    ))}
                  </div>

                  {state.features.enableCashierPinAndShiftClose && (
                    <form
                      onSubmit={handleSavePin}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-xs font-semibold text-slate-900 dark:text-white">
                            PIN de Seguridad del Dueño
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            lockCashierMode();
                            onClose();
                          }}
                          className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>Activar Modo Cajero</span>
                        </button>
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="password"
                          inputMode="numeric"
                          maxLength={6}
                          value={pinDraft}
                          onChange={(e) => setPinDraft(e.target.value)}
                          placeholder="PIN (4-6 dígitos)"
                          className="flex-1 min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono tracking-widest text-slate-900 dark:text-white"
                        />
                        <button
                          type="submit"
                          className="min-h-[42px] px-4 py-2 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white text-xs font-semibold whitespace-nowrap"
                        >
                          Guardar PIN
                        </button>
                      </div>
                    </form>
                  )}
                </>
              )}
            </div>
          ) : (
            <>
              {/* Theme Switch Row */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    Apariencia de la interfaz
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {theme === 'dark' ? 'Modo Oscuro activo' : 'Modo Claro activo'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  {theme === 'dark' ? (
                    <>
                      <Sun className="w-4 h-4 text-amber-400" />
                      <span>Cambiar a Claro</span>
                    </>
                  ) : (
                    <>
                      <Moon className="w-4 h-4 text-slate-700" />
                      <span>Cambiar a Oscuro</span>
                    </>
                  )}
                </button>
              </div>

              {!isCashierLocked && (
                <form onSubmit={handleSaveStore} className="space-y-3">
                  <div>
                    <label
                      htmlFor="store-name"
                      className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                    >
                      Nombre del comercio (aparece en recibos)
                    </label>
                    <input
                      id="store-name"
                      type="text"
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="store-rif"
                        className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                      >
                        RIF / Documento (Opcional)
                      </label>
                      <input
                        id="store-rif"
                        type="text"
                        value={storeRif}
                        onChange={(e) => setStoreRif(e.target.value)}
                        placeholder="J-12345678-9"
                        className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="store-phone"
                        className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                      >
                        Teléfono (Opcional)
                      </label>
                      <input
                        id="store-phone"
                        type="text"
                        value={storePhone}
                        onChange={(e) => setStorePhone(e.target.value)}
                        placeholder="0414-000-0000"
                        className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors"
                  >
                    Guardar datos del comercio
                  </button>
                </form>
              )}

              <PWAInstallButton />

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Exportar reportes para Excel / Contador (CSV)
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      exportInventoryCsv(state);
                      showToast('CSV de inventario descargado');
                    }}
                    className="min-h-[42px] px-2.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Inventario
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      exportSalesCsv(state);
                      showToast('CSV de ventas descargado');
                    }}
                    className="min-h-[42px] px-2.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Ventas
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      exportLedgerCsv(state);
                      showToast('CSV de caja descargado');
                    }}
                    className="min-h-[42px] px-2.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Libro Caja
                  </button>
                </div>
              </div>

              {!isCashierLocked && (
                <>
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Almacenamiento local y respaldo (localStorage)
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={handleExportBackup}
                        className="min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        <span>Exportar JSON</span>
                      </button>
                      <label className="min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-2 cursor-pointer">
                        <Upload className="w-4 h-4" />
                        <span>Importar JSON</span>
                        <input
                          type="file"
                          accept="application/json,.json"
                          onChange={handleImportBackup}
                          className="sr-only"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Reiniciar datos del dispositivo
                    </p>

                    {confirmResetMode === 'none' ? (
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setConfirmResetMode('empty')}
                          className="min-h-[44px] px-3 py-2 rounded-xl border border-red-200 dark:border-red-900/70 text-red-700 dark:text-red-400 text-xs font-medium hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center justify-center gap-1.5"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Vaciar todo (En blanco)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmResetMode('demo')}
                          className="min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-1.5"
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span>Cargar ejemplo</span>
                        </button>
                      </div>
                    ) : (
                      <div className="p-3.5 rounded-xl border border-red-200 dark:border-red-900/70 bg-red-50 dark:bg-red-950/40 space-y-3">
                        <p className="text-xs text-red-900 dark:text-red-200 font-medium">
                          {confirmResetMode === 'empty'
                            ? '¿Seguro? Se borrarán inventario, ventas y movimientos actuales para iniciar tu comercio desde cero.'
                            : '¿Cargar datos de ejemplo? Se reemplazarán los registros actuales.'}
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (confirmResetMode === 'empty') resetToEmpty();
                              else resetToDemo();
                              setConfirmResetMode('none');
                              onClose();
                            }}
                            className="flex-1 min-h-[40px] px-3 py-2 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700"
                          >
                            Confirmar
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmResetMode('none')}
                            className="flex-1 min-h-[40px] px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
