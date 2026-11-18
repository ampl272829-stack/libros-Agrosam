import React, { useState } from 'react';
import {
  Landmark,
  LayoutDashboard,
  Lock,
  Moon,
  Package,
  Receipt,
  RefreshCw,
  Settings,
  ShoppingBag,
  Sun,
  Unlock,
  WifiOff,
  X,
} from 'lucide-react';
import { useStockfy } from '../context/StockfyContext';
import { useOnlineStatus } from '../hooks/usePWAInstall';
import type { ActiveTab } from '../types/stockfy';
import { formatRate, formatUSD } from '../utils/formatters';
import { PWAInstallButton } from './PWAInstallButton';
import { RateAndSettingsModal } from './RateAndSettingsModal';
import { ReceiptModal } from './ReceiptModal';

interface NavItem {
  id: ActiveTab;
  label: string;
  mobileLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Resumen', mobileLabel: 'Resumen', icon: LayoutDashboard },
  { id: 'sales', label: 'Vender y Fiados', mobileLabel: 'Vender', icon: ShoppingBag },
  { id: 'inventory', label: 'Inventario', mobileLabel: 'Stock', icon: Package },
  { id: 'finance', label: 'Capital y Ahorro', mobileLabel: 'Caja', icon: Landmark },
  { id: 'expenses', label: 'Gastos y Garantías', mobileLabel: 'Egresos', icon: Receipt },
];

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    state,
    metrics,
    activeTab,
    setActiveTab,
    theme,
    toggleTheme,
    isSyncingRate,
    toastMessage,
    isCashierLocked,
    lockCashierMode,
    unlockCashierMode,
  } = useStockfy();

  const [rateModalOpen, setRateModalOpen] = useState(false);
  const [rateModalSection, setRateModalSection] = useState<'rates' | 'store' | 'modules'>('rates');
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const isOnline = useOnlineStatus();

  const openModal = (sec: 'rates' | 'store' | 'modules') => {
    setRateModalSection(sec);
    setRateModalOpen(true);
  };

  const handleNavClick = (tab: ActiveTab) => {
    if (isCashierLocked && tab === 'finance') {
      setPinInput('');
      setPinModalOpen(true);
      return;
    }
    setActiveTab(tab);
  };

  const handleUnlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (unlockCashierMode(pinInput)) {
      setPinInput('');
      setPinModalOpen(false);
    }
  };

  const currentNav = NAV_ITEMS.find((n) => n.id === activeTab) || NAV_ITEMS[0];

  const rateSourceLabel =
    state.rates.source === 'bcv'
      ? 'BCV'
      : state.rates.source === 'paralelo'
      ? 'Paralelo'
      : 'Manual';

  const pinFeatureEnabled = state.features.enableCashierPinAndShiftClose;

  return (
    <div className="min-h-dvh bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col lg:flex-row transition-colors">
      {/* Desktop Sidebar (256px) */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-30">
        <div className="h-14 px-5 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
          <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white font-display whitespace-nowrap">
            Stockfy Pro
          </span>
          <div className="flex items-center gap-1">
            {pinFeatureEnabled && (
              <button
                type="button"
                onClick={() => {
                  if (isCashierLocked) {
                    setPinInput('');
                    setPinModalOpen(true);
                  } else {
                    lockCashierMode();
                  }
                }}
                title={isCashierLocked ? 'Desbloquear Modo Dueño' : 'Activar Modo Cajero'}
                className={`min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg transition-colors ${
                  isCashierLocked
                    ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                aria-label={isCashierLocked ? 'Desbloquear Modo Dueño' : 'Activar Modo Cajero'}
              >
                {isCashierLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
              </button>
            )}
            <button
              type="button"
              onClick={toggleTheme}
              className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label={theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>
            <button
              type="button"
              onClick={() => openModal('store')}
              className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Configuración del comercio"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Navegación principal">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const lockedTab = isCashierLocked && item.id === 'finance';
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl text-sm font-medium flex items-center justify-between transition-colors ${
                  isActive
                    ? 'bg-slate-900 dark:bg-emerald-600 text-white'
                    : lockedTab
                    ? 'text-slate-400 dark:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span className="flex items-center gap-3 whitespace-nowrap">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </span>
                {lockedTab ? (
                  <Lock className="w-3.5 h-3.5 shrink-0" />
                ) : item.id === 'sales' && metrics.fiadosPendientesCount > 0 ? (
                  <span
                    className={`text-xs font-mono tabular-nums ${
                      isActive ? 'text-amber-300 dark:text-amber-100' : 'text-amber-700 dark:text-amber-400'
                    }`}
                  >
                    {metrics.fiadosPendientesCount}
                  </span>
                ) : item.id === 'expenses' &&
                  !isCashierLocked &&
                  metrics.upcomingFixedReminders.length > 0 ? (
                  <span
                    className={`text-xs font-mono tabular-nums font-semibold ${
                      isActive ? 'text-amber-300 dark:text-amber-100' : 'text-amber-700 dark:text-amber-400'
                    }`}
                    title="Gastos fijos próximos a vencer"
                  >
                    {metrics.upcomingFixedReminders.length}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
          <button
            type="button"
            onClick={() => openModal('rates')}
            className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
          >
            <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>Tasa {rateSourceLabel}</span>
              <span className="flex items-center gap-1">
                {state.rates.syncStatus === 'offline' && (
                  <WifiOff className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                )}
                <RefreshCw className={`w-3 h-3 ${isSyncingRate ? 'animate-spin' : ''}`} />
              </span>
            </div>
            <p className="text-base font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
              {formatRate(state.rates.activeRate)}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              {state.store.nombreComercio}
            </p>
          </button>

          <PWAInstallButton compact />

          {!isOnline && (
            <div className="px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <WifiOff className="w-3.5 h-3.5 shrink-0" />
              <span>Modo sin conexión activo</span>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Mobile Compact Top Header (52px) */}
        <header className="lg:hidden sticky top-0 z-30 h-[52px] px-3.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white font-display truncate block">
              {currentNav.label}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {pinFeatureEnabled && (
              <button
                type="button"
                onClick={() => {
                  if (isCashierLocked) {
                    setPinInput('');
                    setPinModalOpen(true);
                  } else {
                    lockCashierMode();
                  }
                }}
                className={`min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg ${
                  isCashierLocked
                    ? 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                aria-label={isCashierLocked ? 'Desbloquear Modo Dueño' : 'Modo Cajero'}
              >
                {isCashierLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
              </button>
            )}

            <button
              type="button"
              onClick={() => openModal('rates')}
              className="min-h-[38px] px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 whitespace-nowrap"
            >
              {state.rates.syncStatus === 'offline' && (
                <WifiOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              )}
              <span>
                {rateSourceLabel} {state.rates.activeRate.toFixed(2)}
              </span>
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              className="min-h-[44px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label={theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>

            <button
              type="button"
              onClick={() => openModal('store')}
              className="min-h-[44px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Ajustes del comercio"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Desktop 3-Zone Top Bar */}
        <header className="hidden lg:flex h-14 px-8 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 items-center justify-between gap-8 sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-base font-semibold text-slate-900 dark:text-white whitespace-nowrap truncate">
              {currentNav.label}
            </h1>
            <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
              /
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {state.store.nombreComercio}
              {isCashierLocked ? ' · Modo Cajero' : ''}
            </span>
          </div>

          {!isCashierLocked ? (
            <div className="flex items-center gap-6 text-xs text-slate-600 dark:text-slate-400 shrink-0">
              <span className="whitespace-nowrap">
                Caja:{' '}
                <strong className="font-mono tabular-nums text-slate-900 dark:text-white">
                  {formatUSD(metrics.cajaLiquidaUSD)}
                </strong>
              </span>
              <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
                ·
              </span>
              <span className="whitespace-nowrap">
                Reserva:{' '}
                <strong className="font-mono tabular-nums text-slate-900 dark:text-white">
                  {formatUSD(metrics.ahorroTotalUSD)}
                </strong>
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setPinInput('');
                setPinModalOpen(true);
              }}
              className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5 whitespace-nowrap"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Modo Cajero · Desbloquear Dueño</span>
            </button>
          )}

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => openModal('rates')}
              className="min-h-[38px] px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2 whitespace-nowrap shrink-0"
            >
              <span>
                {rateSourceLabel} ·{' '}
                <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-white">
                  {formatRate(state.rates.activeRate)}
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('sales')}
              className="min-h-[38px] px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              Facturar Venta
            </button>
          </div>
        </header>

        {/* Main Scrollable Viewport */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 pb-24 lg:pb-10">
          {children}
        </main>
      </div>

      {/* Mobile Fixed Thumb-Zone Bottom Tab Bar (64px) */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pb-safe"
        aria-label="Navegación inferior"
      >
        <div className="grid grid-cols-5 h-16 items-center">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const lockedTab = isCashierLocked && item.id === 'finance';
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`min-h-[48px] flex flex-col items-center justify-center gap-1 px-1 transition-colors ${
                  isActive
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : lockedTab
                    ? 'text-slate-300 dark:text-slate-600'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <div className="relative">
                  <Icon className="w-[21px] h-[21px]" />
                  {item.id === 'sales' && metrics.fiadosPendientesCount > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 text-[10px] font-mono font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950 px-1 rounded">
                      {metrics.fiadosPendientesCount}
                    </span>
                  )}
                  {item.id === 'expenses' &&
                    !isCashierLocked &&
                    metrics.upcomingFixedReminders.length > 0 && (
                      <span className="absolute -top-1.5 -right-2.5 text-[10px] font-mono font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950 px-1 rounded">
                        {metrics.upcomingFixedReminders.length}
                      </span>
                    )}
                </div>
                <span className="text-[11px] font-medium tracking-tight whitespace-nowrap">
                  {item.mobileLabel}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-medium shadow-lg whitespace-nowrap max-w-[90vw] truncate"
        >
          {toastMessage}
        </div>
      )}

      {/* Owner PIN Unlock Modal */}
      {pinModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-xs p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full sm:max-w-sm bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Desbloquear Modo Dueño
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPinModalOpen(false)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleUnlockSubmit} className="p-5 space-y-4 pb-safe">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ingresa el PIN de seguridad del dueño para acceder a Capital, utilidades y
                configuración sensible.
              </p>
              <input
                type="password"
                inputMode="numeric"
                autoFocus
                maxLength={6}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="PIN de dueño"
                className="w-full min-h-[48px] px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-center text-lg font-mono tracking-widest text-slate-900 dark:text-white"
              />
              <button
                type="submit"
                className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors"
              >
                Desbloquear
              </button>
            </form>
          </div>
        </div>
      )}

      <RateAndSettingsModal
        open={rateModalOpen}
        onClose={() => setRateModalOpen(false)}
        initialSection={rateModalSection}
      />
      <ReceiptModal />
    </div>
  );
};
