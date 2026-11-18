import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_FEATURES, createEmptyState, createSeedState } from '../data/seedData';
import type {
  ActiveTab,
  CashClosingRecord,
  ExtraExpense,
  FeatureSettings,
  FixedExpenseTemplate,
  Product,
  ProductUnit,
  RateSource,
  Sale,
  SaleItem,
  SalePaymentSplit,
  StockfyState,
  StoreConfig,
  SupplierPayable,
  ThemeMode,
  WalletId,
} from '../types/stockfy';
import {
  WALLETS,
  addDaysToYMD,
  diffDaysFromTodayYMD,
  fetchDolarApiRates,
  generateDocNumber,
  generateId,
  getFrequencyIntervalDays,
  getLocalTodayYMD,
  round2,
  round3,
} from '../utils/formatters';

const STORAGE_KEY = 'stockfy_pro_mobile_state_v2';
const THEME_KEY = 'stockfy_theme_v1';
const CASHIER_LOCK_KEY = 'stockfy_cashier_locked_v1';

export interface TopProductStat {
  productId: string;
  nombre: string;
  unidad: ProductUnit;
  cantidadVendida: number;
  ingresosUSD: number;
  utilidadUSD: number;
}

export interface FixedExpenseReminder {
  template: FixedExpenseTemplate;
  diasRestantes: number;
}

interface ComputedMetrics {
  capitalNetoUSD: number;
  cajaLiquidaUSD: number;
  ahorroTotalUSD: number;
  valorInventarioCostoUSD: number;
  valorInventarioVentaUSD: number;
  gananciaPotencialInventarioUSD: number;
  fiadosPendientesUSD: number;
  fiadosPendientesCount: number;
  porPagarProveedoresUSD: number;
  porPagarProveedoresCount: number;
  ventasTotalesUSD: number;
  utilidadBrutaVentasUSD: number;
  utilidadNetaRealUSD: number;
  gastosTotalesUSD: number;
  perdidasTotalesUSD: number;
  walletBalances: Record<WalletId, number>;
  topProducts: TopProductStat[];
  upcomingFixedReminders: FixedExpenseReminder[];
}

interface StockfyContextValue {
  state: StockfyState;
  metrics: ComputedMetrics;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  theme: ThemeMode;
  toggleTheme: () => void;
  isSyncingRate: boolean;
  syncError: string | null;
  toastMessage: string | null;
  showToast: (msg: string) => void;
  selectedReceipt: ExtraExpense | null;
  setSelectedReceipt: (expense: ExtraExpense | null) => void;
  selectedSaleReceipt: Sale | null;
  setSelectedSaleReceipt: (sale: Sale | null) => void;

  // Cashier PIN Lock (Point 3)
  isCashierLocked: boolean;
  lockCashierMode: () => void;
  unlockCashierMode: (pin: string) => boolean;

  // Rate actions
  syncRatesNow: (silent?: boolean) => Promise<void>;
  setRateSource: (source: RateSource) => void;
  setManualRate: (newRate: number) => void;

  // Store & Feature Config
  updateStoreConfig: (config: StoreConfig) => void;
  updateFeatures: (updates: Partial<FeatureSettings>) => void;

  // Inventory actions
  addProduct: (input: {
    nombre: string;
    sku?: string;
    categoria?: string;
    unidad?: ProductUnit;
    stock: number;
    costoUSD: number;
    margenPct: number;
    precioUSD: number;
    descontarDeCaja: boolean;
    monederoId?: WalletId;
  }) => void;
  updateProduct: (
    id: string,
    updates: Partial<Omit<Product, 'id' | 'updatedAt'>>
  ) => void;
  restockProduct: (input: {
    productId: string;
    cantidad: number;
    nuevoCostoUSD?: number;
    descontarDeCaja: boolean;
    monederoId?: WalletId;
  }) => void;
  deleteProduct: (id: string) => void;

  // Sales & Credit (Fiados) actions
  processSale: (input: {
    items: Array<{ productId: string; cantidad: number }>;
    descuentoUSD?: number;
    tipo: 'contado' | 'credito';
    monederoId?: WalletId;
    pagos?: SalePaymentSplit[];
    cliente?: string;
    nota?: string;
  }) => Sale | null;
  settleCreditSale: (saleId: string, monederoId: WalletId, montoAbonoUSD?: number) => void;
  cancelSale: (saleId: string) => void;

  // Capital, Wallet Transfers, Savings & Shift Cash Closing actions
  injectCapital: (input: {
    montoUSD: number;
    concepto: string;
    monederoId: WalletId;
  }) => void;
  adjustCapital: (input: {
    mode: 'retiro' | 'fijar_monedero';
    montoUSD: number;
    monederoId: WalletId;
    concepto: string;
  }) => void;
  updateCapitalMovement: (
    movementId: string,
    updates: { montoUSD: number; monederoId: WalletId; concepto: string }
  ) => void;
  deleteCapitalMovement: (movementId: string) => void;
  transferBetweenWallets: (input: {
    fromWalletId: WalletId;
    toWalletId: WalletId;
    montoUSD: number;
    nota?: string;
  }) => boolean;
  transferToSavings: (input: {
    montoUSD: number;
    monederoId: WalletId;
    nota: string;
  }) => boolean;
  withdrawFromSavings: (input: {
    montoUSD: number;
    monederoId: WalletId;
    nota: string;
  }) => boolean;
  recordCashClosing: (input: {
    cajero: string;
    desgloseConteo: Partial<Record<WalletId, number>>;
    observacion?: string;
  }) => CashClosingRecord;

  // Fixed, Extra Expenses & Suppliers (Point 5)
  createFixedTemplate: (
    input: Omit<FixedExpenseTemplate, 'id' | 'vecesPagado' | 'ultimoPago'>
  ) => void;
  updateFixedTemplate: (
    id: string,
    updates: Partial<Omit<FixedExpenseTemplate, 'id' | 'vecesPagado' | 'ultimoPago'>>
  ) => void;
  deleteFixedTemplate: (id: string) => void;
  payFixedTemplate: (templateId: string, monederoIdOverride?: WalletId) => ExtraExpense | null;
  registerExtraExpense: (input: {
    concepto: string;
    categoria: string;
    beneficiario?: string;
    montoUSD: number;
    monederoId: WalletId;
    notas?: string;
  }) => ExtraExpense;
  addSupplierPayable: (input: {
    proveedor: string;
    concepto: string;
    montoTotalUSD: number;
    fechaVencimiento?: string;
    notas?: string;
  }) => void;
  paySupplierPayable: (payableId: string, monederoId: WalletId, montoAbonoUSD?: number) => void;
  deleteSupplierPayable: (payableId: string) => void;

  // Warranties & Losses actions
  registerWarranty: (input: {
    productId: string;
    cantidad: number;
    resolucion: 'perdida_total' | 'reingreso_stock';
    descontarDeStock: boolean;
    motivo: string;
  }) => void;

  // Backup / Reset
  exportDataJson: () => string;
  importDataJson: (raw: string) => boolean;
  resetToDemo: () => void;
  resetToEmpty: () => void;
}

const StockfyContext = createContext<StockfyContextValue | null>(null);

function normalizeState(parsed: StockfyState): StockfyState {
  return {
    ...parsed,
    store: {
      nombreComercio: parsed.store?.nombreComercio || 'Mi Comercio',
      rif: parsed.store?.rif,
      telefono: parsed.store?.telefono,
    },
    features: {
      ...DEFAULT_FEATURES,
      ...(parsed.features || {}),
      ownerPin: parsed.features?.ownerPin || DEFAULT_FEATURES.ownerPin,
    },
    products: Array.isArray(parsed.products) ? parsed.products : [],
    sales: Array.isArray(parsed.sales) ? parsed.sales : [],
    ledger: Array.isArray(parsed.ledger) ? parsed.ledger : [],
    fixedTemplates: Array.isArray(parsed.fixedTemplates) ? parsed.fixedTemplates : [],
    extraExpenses: Array.isArray(parsed.extraExpenses) ? parsed.extraExpenses : [],
    warranties: Array.isArray(parsed.warranties) ? parsed.warranties : [],
    savingsMovements: Array.isArray(parsed.savingsMovements) ? parsed.savingsMovements : [],
    suppliers: Array.isArray(parsed.suppliers) ? parsed.suppliers : [],
    cashClosings: Array.isArray(parsed.cashClosings) ? parsed.cashClosings : [],
  };
}

function loadInitialState(): StockfyState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StockfyState;
      if (parsed && Array.isArray(parsed.products) && parsed.rates?.activeRate > 0) {
        return normalizeState(parsed);
      }
    }
  } catch {
    // Fallback to clean empty state
  }
  return createEmptyState();
}

function loadInitialTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  } catch {
    // ignore
  }
  return 'light';
}

function loadInitialCashierLock(initialState: StockfyState): boolean {
  try {
    if (!initialState.features.enableCashierPinAndShiftClose) return false;
    return localStorage.getItem(CASHIER_LOCK_KEY) === 'true';
  } catch {
    return false;
  }
}

export const StockfyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<StockfyState>(loadInitialState);
  const [theme, setTheme] = useState<ThemeMode>(loadInitialTheme);
  const [isCashierLocked, setIsCashierLocked] = useState<boolean>(() =>
    loadInitialCashierLock(loadInitialState())
  );
  const [activeTab, setActiveTabState] = useState<ActiveTab>('dashboard');
  const [isSyncingRate, setIsSyncingRate] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<ExtraExpense | null>(null);
  const [selectedSaleReceipt, setSelectedSaleReceipt] = useState<Sale | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  const setActiveTab = useCallback(
    (tab: ActiveTab) => {
      if (isCashierLocked && tab === 'finance') {
        showToast('Modo Cajero activo: ingresa el PIN de dueño para acceder a Capital');
        return;
      }
      setActiveTabState(tab);
    },
    [isCashierLocked, showToast]
  );

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem(CASHIER_LOCK_KEY, isCashierLocked ? 'true' : 'false');
    } catch {
      // ignore
    }
  }, [isCashierLocked]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const t = window.setTimeout(() => setToastMessage(null), 3200);
    return () => window.clearTimeout(t);
  }, [toastMessage]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota errors gracefully
    }
  }, [state]);

  const lockCashierMode = useCallback(() => {
    if (!state.features.enableCashierPinAndShiftClose) return;
    setIsCashierLocked(true);
    setActiveTabState((curr) => (curr === 'finance' ? 'sales' : curr));
    showToast('Modo Cajero activado · Funciones administrativas bloqueadas');
  }, [state.features.enableCashierPinAndShiftClose, showToast]);

  const unlockCashierMode = useCallback(
    (pin: string): boolean => {
      const expected = state.features.ownerPin || '1234';
      if (pin.trim() === expected) {
        setIsCashierLocked(false);
        showToast('Modo Dueño desbloqueado');
        return true;
      }
      showToast('PIN incorrecto');
      return false;
    },
    [state.features.ownerPin, showToast]
  );

  const syncRatesNow = useCallback(
    async (silent = false) => {
      setIsSyncingRate(true);
      setSyncError(null);
      try {
        const res = await fetchDolarApiRates();
        setState((prev) => {
          const nextBcv = res.bcvRate > 0 ? res.bcvRate : prev.rates.bcvRate;
          const nextPar = res.paraleloRate > 0 ? res.paraleloRate : prev.rates.paraleloRate;
          const nextActive =
            prev.rates.source === 'bcv'
              ? nextBcv
              : prev.rates.source === 'paralelo'
              ? nextPar
              : prev.rates.manualRate;

          return {
            ...prev,
            rates: {
              ...prev.rates,
              bcvRate: nextBcv,
              paraleloRate: nextPar,
              activeRate: nextActive,
              lastUpdated: res.updatedAt || new Date().toISOString(),
              syncStatus: prev.rates.source === 'manual' ? 'manual' : 'online',
            },
          };
        });
        if (!silent) {
          showToast('Tasa cambiaria actualizada desde DolarApi');
        }
      } catch {
        setState((prev) => ({
          ...prev,
          rates: {
            ...prev.rates,
            syncStatus: prev.rates.source === 'manual' ? 'manual' : 'offline',
          },
        }));
        setSyncError('Sin conexión: usando última tasa guardada en dispositivo');
        if (!silent) {
          showToast('Modo Offline: usando última tasa guardada');
        }
      } finally {
        setIsSyncingRate(false);
      }
    },
    [showToast]
  );

  useEffect(() => {
    void syncRatesNow(true);
  }, [syncRatesNow]);

  const setRateSource = useCallback(
    (source: RateSource) => {
      setState((prev) => {
        const activeRate =
          source === 'bcv'
            ? prev.rates.bcvRate
            : source === 'paralelo'
            ? prev.rates.paraleloRate
            : prev.rates.manualRate;
        return {
          ...prev,
          rates: {
            ...prev.rates,
            source,
            activeRate,
            syncStatus: source === 'manual' ? 'manual' : prev.rates.syncStatus,
          },
        };
      });
      showToast(
        source === 'bcv'
          ? 'Tasa activa cambiada a BCV Oficial'
          : source === 'paralelo'
          ? 'Tasa activa cambiada a Paralelo'
          : 'Tasa manual activada'
      );
    },
    [showToast]
  );

  const setManualRate = useCallback(
    (newRate: number) => {
      if (!Number.isFinite(newRate) || newRate <= 0) return;
      const clean = round2(newRate);
      setState((prev) => ({
        ...prev,
        rates: {
          ...prev.rates,
          source: 'manual',
          manualRate: clean,
          activeRate: clean,
          lastUpdated: new Date().toISOString(),
          syncStatus: 'manual',
        },
      }));
      showToast(`Tasa manual fijada en Bs. ${clean.toFixed(2)}`);
    },
    [showToast]
  );

  const updateStoreConfig = useCallback(
    (config: StoreConfig) => {
      setState((prev) => ({ ...prev, store: config }));
      showToast('Datos del comercio actualizados');
    },
    [showToast]
  );

  const updateFeatures = useCallback(
    (updates: Partial<FeatureSettings>) => {
      setState((prev) => {
        const nextFeatures = {
          ...prev.features,
          ...updates,
        };
        if (!nextFeatures.enableCashierPinAndShiftClose) {
          setIsCashierLocked(false);
        }
        return {
          ...prev,
          features: nextFeatures,
        };
      });
      showToast('Preferencias de módulos actualizadas');
    },
    [showToast]
  );

  const addProduct = useCallback(
    (input: {
      nombre: string;
      sku?: string;
      categoria?: string;
      unidad?: ProductUnit;
      stock: number;
      costoUSD: number;
      margenPct: number;
      precioUSD: number;
      descontarDeCaja: boolean;
      monederoId?: WalletId;
    }) => {
      const nowIso = new Date().toISOString();
      const unit: ProductUnit = input.unidad || 'u';
      const normalizedStock =
        unit === 'u'
          ? Math.max(0, round3(input.stock))
          : Math.max(0, round3(input.stock));
      const newProduct: Product = {
        id: generateId('PRD'),
        nombre: input.nombre.trim(),
        sku: input.sku?.trim() || undefined,
        categoria: input.categoria?.trim() || 'General',
        unidad: unit,
        stock: normalizedStock,
        costoUSD: round2(Math.max(0, input.costoUSD)),
        margenPct: round2(input.margenPct),
        precioUSD: round2(Math.max(0, input.precioUSD)),
        updatedAt: nowIso,
      };

      const totalCompra = round2(newProduct.stock * newProduct.costoUSD);

      setState((prev) => {
        const nextLedger = [...prev.ledger];
        if (input.descontarDeCaja && totalCompra > 0) {
          nextLedger.unshift({
            id: generateId('MOV'),
            fecha: nowIso,
            tipo: 'compra_mercancia',
            concepto: `Compra lote: ${newProduct.nombre} (${newProduct.stock} ${unit})`,
            montoUSD: -totalCompra,
            tasaAplicada: prev.rates.activeRate,
            monederoId: input.monederoId || 'efectivo_usd',
          });
        }
        return {
          ...prev,
          products: [newProduct, ...prev.products],
          ledger: nextLedger,
        };
      });

      showToast(`Producto "${newProduct.nombre}" agregado`);
    },
    [showToast]
  );

  const updateProduct = useCallback(
    (id: string, updates: Partial<Omit<Product, 'id' | 'updatedAt'>>) => {
      setState((prev) => ({
        ...prev,
        products: prev.products.map((p) =>
          p.id === id
            ? {
                ...p,
                ...updates,
                stock: updates.stock !== undefined ? Math.max(0, round3(updates.stock)) : p.stock,
                sku: updates.sku !== undefined ? updates.sku?.trim() || undefined : p.sku,
                updatedAt: new Date().toISOString(),
              }
            : p
        ),
      }));
      showToast('Producto actualizado');
    },
    [showToast]
  );

  const restockProduct = useCallback(
    (input: {
      productId: string;
      cantidad: number;
      nuevoCostoUSD?: number;
      descontarDeCaja: boolean;
      monederoId?: WalletId;
    }) => {
      const qty = Math.max(0.01, round3(input.cantidad));
      const nowIso = new Date().toISOString();

      setState((prev) => {
        const target = prev.products.find((p) => p.id === input.productId);
        if (!target) return prev;
        const unitCost =
          input.nuevoCostoUSD !== undefined && input.nuevoCostoUSD >= 0
            ? round2(input.nuevoCostoUSD)
            : target.costoUSD;
        const nextPrecio =
          input.nuevoCostoUSD !== undefined
            ? round2(unitCost * (1 + target.margenPct / 100))
            : target.precioUSD;
        const totalCompra = round2(qty * unitCost);

        const nextLedger = [...prev.ledger];
        if (input.descontarDeCaja && totalCompra > 0) {
          nextLedger.unshift({
            id: generateId('MOV'),
            fecha: nowIso,
            tipo: 'compra_mercancia',
            concepto: `Reabastecimiento: ${target.nombre} (+${qty} ${target.unidad || 'u'})`,
            montoUSD: -totalCompra,
            tasaAplicada: prev.rates.activeRate,
            monederoId: input.monederoId || 'efectivo_usd',
          });
        }

        return {
          ...prev,
          products: prev.products.map((p) =>
            p.id === input.productId
              ? {
                  ...p,
                  stock: round3(p.stock + qty),
                  costoUSD: unitCost,
                  precioUSD: nextPrecio,
                  updatedAt: nowIso,
                }
              : p
          ),
          ledger: nextLedger,
        };
      });
      showToast(`Stock incrementado (+${qty})`);
    },
    [showToast]
  );

  const deleteProduct = useCallback(
    (id: string) => {
      setState((prev) => ({
        ...prev,
        products: prev.products.filter((p) => p.id !== id),
      }));
      showToast('Producto eliminado del catálogo');
    },
    [showToast]
  );

  const processSale = useCallback(
    (input: {
      items: Array<{ productId: string; cantidad: number }>;
      descuentoUSD?: number;
      tipo: 'contado' | 'credito';
      monederoId?: WalletId;
      pagos?: SalePaymentSplit[];
      cliente?: string;
      nota?: string;
    }): Sale | null => {
      if (input.items.length === 0) return null;

      let createdSale: Sale | null = null;
      let splitMismatch = false;

      setState((prev) => {
        const saleItems: SaleItem[] = [];
        for (const reqItem of input.items) {
          const prod = prev.products.find((p) => p.id === reqItem.productId);
          const qty = round3(reqItem.cantidad);
          if (!prod || qty <= 0 || prod.stock + 0.0001 < qty) {
            return prev;
          }
          const subtotalUSD = round2(prod.precioUSD * qty);
          saleItems.push({
            productId: prod.id,
            nombre: prod.nombre,
            unidad: prod.unidad || 'u',
            cantidad: qty,
            costoUnitarioUSD: prod.costoUSD,
            precioUnitarioUSD: prod.precioUSD,
            subtotalUSD,
          });
        }

        const grossTotalUSD = round2(saleItems.reduce((acc, it) => acc + it.subtotalUSD, 0));
        const discount = round2(
          Math.max(0, Math.min(grossTotalUSD, input.descuentoUSD || 0))
        );
        const totalUSD = round2(Math.max(0, grossTotalUSD - discount));
        const rate = prev.rates.activeRate;
        const totalVES = round2(totalUSD * rate);
        const nowIso = new Date().toISOString();
        const numeroFactura = generateDocNumber('FAC');

        let cleanSplits: SalePaymentSplit[] | undefined = undefined;
        if (input.tipo === 'contado') {
          if (input.pagos && input.pagos.length > 0) {
            const validSplits = input.pagos
              .map((sp) => ({ monederoId: sp.monederoId, montoUSD: round2(sp.montoUSD) }))
              .filter((sp) => sp.montoUSD > 0);
            const sumSplits = round2(validSplits.reduce((acc, s) => acc + s.montoUSD, 0));
            if (Math.abs(sumSplits - totalUSD) > 0.02) {
              splitMismatch = true;
              return prev;
            }
            cleanSplits = validSplits;
          } else if (totalUSD > 0) {
            cleanSplits = [{ monederoId: input.monederoId || 'pago_movil', montoUSD: totalUSD }];
          }
        }

        const primaryWallet =
          input.tipo === 'contado'
            ? cleanSplits?.[0]?.monederoId || input.monederoId || 'pago_movil'
            : undefined;

        const newSale: Sale = {
          id: generateId('VTA'),
          numeroFactura,
          fecha: nowIso,
          items: saleItems,
          descuentoUSD: discount > 0 ? discount : undefined,
          totalUSD,
          totalVES,
          tasaAplicada: rate,
          tipo: input.tipo,
          monederoId: primaryWallet,
          pagos: cleanSplits,
          cliente:
            input.tipo === 'credito'
              ? input.cliente?.trim() || 'Cliente General'
              : input.cliente?.trim(),
          nota: input.nota?.trim() || undefined,
          estadoCredito: input.tipo === 'credito' ? 'pendiente' : undefined,
          montoPagadoUSD: input.tipo === 'credito' ? 0 : totalUSD,
          abonos: input.tipo === 'credito' ? [] : undefined,
        };

        createdSale = newSale;

        const qtyMap = new Map<string, number>();
        for (const it of saleItems) {
          qtyMap.set(it.productId, round3((qtyMap.get(it.productId) || 0) + it.cantidad));
        }

        const nextProducts = prev.products.map((p) => {
          const sold = qtyMap.get(p.id);
          if (!sold) return p;
          return {
            ...p,
            stock: Math.max(0, round3(p.stock - sold)),
            updatedAt: nowIso,
          };
        });

        const nextLedger = [...prev.ledger];
        if (input.tipo === 'contado' && totalUSD > 0 && cleanSplits) {
          const isMixed = cleanSplits.length > 1;
          for (const split of cleanSplits) {
            nextLedger.unshift({
              id: generateId('MOV'),
              fecha: nowIso,
              tipo: 'venta_contado',
              concepto: isMixed ? `Venta ${numeroFactura} (Pago mixto)` : `Venta ${numeroFactura}`,
              montoUSD: split.montoUSD,
              tasaAplicada: rate,
              monederoId: split.monederoId,
              referencia: numeroFactura,
            });
          }
        }

        return {
          ...prev,
          products: nextProducts,
          sales: [newSale, ...prev.sales],
          ledger: nextLedger,
        };
      });

      if (splitMismatch) {
        showToast('La suma de los pagos mixtos debe coincidir con el total');
        return null;
      }

      if (createdSale) {
        showToast(
          input.tipo === 'contado'
            ? `Venta ${(createdSale as Sale).numeroFactura} cobrada`
            : `Crédito (Fiado) ${(createdSale as Sale).numeroFactura} registrado`
        );
      } else {
        showToast('Verifica el stock disponible antes de procesar');
      }

      return createdSale;
    },
    [showToast]
  );

  const settleCreditSale = useCallback(
    (saleId: string, monederoId: WalletId, montoAbonoUSD?: number) => {
      const nowIso = new Date().toISOString();
      let settledFully = false;
      let appliedAmount = 0;

      setState((prev) => {
        const target = prev.sales.find((s) => s.id === saleId);
        if (!target || target.tipo !== 'credito' || target.estadoCredito === 'cobrado') {
          return prev;
        }

        const paidSoFar = round2(target.montoPagadoUSD || 0);
        const remaining = round2(Math.max(0, target.totalUSD - paidSoFar));
        if (remaining <= 0) return prev;

        const payNow =
          montoAbonoUSD !== undefined && montoAbonoUSD > 0
            ? round2(Math.min(remaining, montoAbonoUSD))
            : remaining;

        const nextPaid = round2(paidSoFar + payNow);
        const isComplete = nextPaid >= round2(target.totalUSD - 0.009);
        settledFully = isComplete;
        appliedAmount = payNow;

        const newPayment = {
          id: generateId('ABN'),
          fecha: nowIso,
          montoUSD: payNow,
          monederoId,
          tasaAplicada: prev.rates.activeRate,
        };

        return {
          ...prev,
          sales: prev.sales.map((s) =>
            s.id === saleId
              ? {
                  ...s,
                  montoPagadoUSD: isComplete ? target.totalUSD : nextPaid,
                  abonos: [...(s.abonos || []), newPayment],
                  estadoCredito: isComplete ? 'cobrado' : 'pendiente',
                  fechaCobro: isComplete ? nowIso : s.fechaCobro,
                  monederoCobroId: monederoId,
                }
              : s
          ),
          ledger: [
            {
              id: generateId('MOV'),
              fecha: nowIso,
              tipo: 'cobro_credito',
              concepto: `${isComplete ? 'Finiquito' : 'Abono'} fiado ${target.numeroFactura} (${
                target.cliente || 'Cliente'
              })`,
              montoUSD: payNow,
              tasaAplicada: prev.rates.activeRate,
              monederoId,
              referencia: target.numeroFactura,
            },
            ...prev.ledger,
          ],
        };
      });

      if (appliedAmount > 0) {
        showToast(
          settledFully
            ? `Crédito finiquitado ($${appliedAmount.toFixed(2)}) y sumado al monedero`
            : `Abono de $${appliedAmount.toFixed(2)} registrado en monedero`
        );
      }
    },
    [showToast]
  );

  const cancelSale = useCallback(
    (saleId: string) => {
      let cancelledDoc = '';
      setState((prev) => {
        const target = prev.sales.find((s) => s.id === saleId);
        if (!target) return prev;
        cancelledDoc = target.numeroFactura;
        const nowIso = new Date().toISOString();

        const qtyMap = new Map<string, number>();
        for (const it of target.items) {
          qtyMap.set(it.productId, round3((qtyMap.get(it.productId) || 0) + it.cantidad));
        }

        const nextProducts = prev.products.map((p) => {
          const restore = qtyMap.get(p.id);
          if (!restore) return p;
          return { ...p, stock: round3(p.stock + restore), updatedAt: nowIso };
        });

        const nextLedger = prev.ledger.filter((m) => m.referencia !== target.numeroFactura);

        return {
          ...prev,
          products: nextProducts,
          sales: prev.sales.filter((s) => s.id !== saleId),
          ledger: nextLedger,
        };
      });

      if (cancelledDoc) {
        showToast(`Venta ${cancelledDoc} anulada y stock restaurado`);
      }
    },
    [showToast]
  );

  const injectCapital = useCallback(
    (input: { montoUSD: number; concepto: string; monederoId: WalletId }) => {
      const amount = round2(Math.max(0, input.montoUSD));
      if (amount <= 0) return;
      const nowIso = new Date().toISOString();

      setState((prev) => ({
        ...prev,
        ledger: [
          {
            id: generateId('MOV'),
            fecha: nowIso,
            tipo: 'inyeccion',
            concepto: input.concepto.trim() || 'Inyección de capital operativo',
            montoUSD: amount,
            tasaAplicada: prev.rates.activeRate,
            monederoId: input.monederoId,
          },
          ...prev.ledger,
        ],
      }));
      showToast(`Inyección de $${amount.toFixed(2)} registrada en caja`);
    },
    [showToast]
  );

  const adjustCapital = useCallback(
    (input: {
      mode: 'retiro' | 'fijar_monedero';
      montoUSD: number;
      monederoId: WalletId;
      concepto: string;
    }) => {
      const targetOrWithdraw = round2(input.montoUSD);
      if (input.mode === 'retiro' && targetOrWithdraw <= 0) {
        showToast('Ingresa un monto mayor a 0 para retirar');
        return;
      }
      if (input.mode === 'fijar_monedero' && targetOrWithdraw < 0) {
        showToast('El saldo objetivo del monedero no puede ser negativo');
        return;
      }

      const nowIso = new Date().toISOString();
      let appliedDiff = 0;
      let noChange = false;

      setState((prev) => {
        if (input.mode === 'retiro') {
          appliedDiff = -targetOrWithdraw;
          return {
            ...prev,
            ledger: [
              {
                id: generateId('MOV'),
                fecha: nowIso,
                tipo: 'ajuste_capital',
                concepto: input.concepto.trim() || 'Retiro / reducción de capital',
                montoUSD: appliedDiff,
                tasaAplicada: prev.rates.activeRate,
                monederoId: input.monederoId,
              },
              ...prev.ledger,
            ],
          };
        }

        let currentBal = 0;
        for (const m of prev.ledger) {
          if (m.monederoId === input.monederoId) {
            currentBal += m.montoUSD;
          }
        }
        const diff = round2(targetOrWithdraw - currentBal);
        if (Math.abs(diff) < 0.01) {
          noChange = true;
          return prev;
        }
        appliedDiff = diff;
        return {
          ...prev,
          ledger: [
            {
              id: generateId('MOV'),
              fecha: nowIso,
              tipo: 'ajuste_capital',
              concepto:
                input.concepto.trim() ||
                `Ajuste directo de saldo (${diff > 0 ? '+' : ''}$${diff.toFixed(2)})`,
              montoUSD: diff,
              tasaAplicada: prev.rates.activeRate,
              monederoId: input.monederoId,
            },
            ...prev.ledger,
          ],
        };
      });

      if (noChange) {
        showToast('El monedero ya tiene exactamente ese saldo');
      } else if (appliedDiff !== 0) {
        showToast(
          input.mode === 'retiro'
            ? `Retiro de capital ($${Math.abs(appliedDiff).toFixed(2)}) registrado`
            : `Saldo corregido (${appliedDiff > 0 ? '+' : '-'}$${Math.abs(appliedDiff).toFixed(2)})`
        );
      }
    },
    [showToast]
  );

  const updateCapitalMovement = useCallback(
    (
      movementId: string,
      updates: { montoUSD: number; monederoId: WalletId; concepto: string }
    ) => {
      const nextAmount = round2(updates.montoUSD);
      if (!Number.isFinite(nextAmount) || nextAmount === 0) {
        showToast('Ingresa un monto válido distinto de 0');
        return;
      }
      let updated = false;
      setState((prev) => ({
        ...prev,
        ledger: prev.ledger.map((m) => {
          if (m.id !== movementId) return m;
          if (m.tipo !== 'inyeccion' && m.tipo !== 'ajuste_capital') return m;
          updated = true;
          return {
            ...m,
            montoUSD: m.tipo === 'inyeccion' ? Math.abs(nextAmount) : nextAmount,
            monederoId: updates.monederoId,
            concepto: updates.concepto.trim() || m.concepto,
          };
        }),
      }));
      if (updated) {
        showToast('Movimiento de capital actualizado');
      }
    },
    [showToast]
  );

  const deleteCapitalMovement = useCallback(
    (movementId: string) => {
      let deleted = false;
      setState((prev) => {
        const target = prev.ledger.find((m) => m.id === movementId);
        if (!target || (target.tipo !== 'inyeccion' && target.tipo !== 'ajuste_capital')) {
          return prev;
        }
        deleted = true;
        return {
          ...prev,
          ledger: prev.ledger.filter((m) => m.id !== movementId),
        };
      });
      if (deleted) {
        showToast('Registro de capital eliminado y saldo recalculado');
      }
    },
    [showToast]
  );

  const transferBetweenWallets = useCallback(
    (input: {
      fromWalletId: WalletId;
      toWalletId: WalletId;
      montoUSD: number;
      nota?: string;
    }): boolean => {
      const amount = round2(input.montoUSD);
      if (amount <= 0 || input.fromWalletId === input.toWalletId) {
        showToast('Selecciona monederos distintos y un monto válido');
        return false;
      }
      const nowIso = new Date().toISOString();
      const fromName = WALLETS.find((w) => w.id === input.fromWalletId)?.nombre || input.fromWalletId;
      const toName = WALLETS.find((w) => w.id === input.toWalletId)?.nombre || input.toWalletId;
      const suffix = input.nota?.trim() ? ` · ${input.nota.trim()}` : '';

      setState((prev) => ({
        ...prev,
        ledger: [
          {
            id: generateId('MOV'),
            fecha: nowIso,
            tipo: 'transferencia_interna',
            concepto: `Traslado recibido desde ${fromName}${suffix}`,
            montoUSD: amount,
            tasaAplicada: prev.rates.activeRate,
            monederoId: input.toWalletId,
          },
          {
            id: generateId('MOV'),
            fecha: nowIso,
            tipo: 'transferencia_interna',
            concepto: `Traslado enviado hacia ${toName}${suffix}`,
            montoUSD: -amount,
            tasaAplicada: prev.rates.activeRate,
            monederoId: input.fromWalletId,
          },
          ...prev.ledger,
        ],
      }));
      showToast(`$${amount.toFixed(2)} transferidos de ${fromName} a ${toName}`);
      return true;
    },
    [showToast]
  );

  const metrics = useMemo<ComputedMetrics>(() => {
    const walletBalances: Record<WalletId, number> = {
      pago_movil: 0,
      zelle: 0,
      binance: 0,
      efectivo_usd: 0,
      efectivo_bs: 0,
      punto_venta: 0,
      transferencia: 0,
    };

    let capitalNetoUSD = 0;
    let cajaLiquidaUSD = 0;
    let perdidasTotalesUSD = 0;
    let gastosTotalesUSD = 0;

    for (const mov of state.ledger) {
      capitalNetoUSD += mov.montoUSD;
      if (mov.monederoId && mov.monederoId in walletBalances) {
        walletBalances[mov.monederoId] = round2(walletBalances[mov.monederoId] + mov.montoUSD);
        cajaLiquidaUSD += mov.montoUSD;
      }
      if (mov.tipo === 'perdida_garantia') {
        perdidasTotalesUSD += Math.abs(mov.montoUSD);
      }
      if (mov.tipo === 'gasto_extra' || mov.tipo === 'pago_fijo') {
        gastosTotalesUSD += Math.abs(mov.montoUSD);
      }
    }

    let ahorroTotalUSD = 0;
    for (const sm of state.savingsMovements) {
      ahorroTotalUSD += sm.tipo === 'deposito' ? sm.montoUSD : -sm.montoUSD;
    }

    let valorInventarioCostoUSD = 0;
    let valorInventarioVentaUSD = 0;
    for (const p of state.products) {
      valorInventarioCostoUSD += p.stock * p.costoUSD;
      valorInventarioVentaUSD += p.stock * p.precioUSD;
    }

    let fiadosPendientesUSD = 0;
    let fiadosPendientesCount = 0;
    let ventasTotalesUSD = 0;
    let utilidadBrutaVentasUSD = 0;

    const productStatsMap = new Map<string, TopProductStat>();

    for (const s of state.sales) {
      ventasTotalesUSD += s.totalUSD;
      for (const it of s.items) {
        const lineProfit = (it.precioUnitarioUSD - it.costoUnitarioUSD) * it.cantidad;
        utilidadBrutaVentasUSD += lineProfit;

        const existing = productStatsMap.get(it.productId);
        if (existing) {
          existing.cantidadVendida = round3(existing.cantidadVendida + it.cantidad);
          existing.ingresosUSD = round2(existing.ingresosUSD + it.subtotalUSD);
          existing.utilidadUSD = round2(existing.utilidadUSD + lineProfit);
        } else {
          productStatsMap.set(it.productId, {
            productId: it.productId,
            nombre: it.nombre,
            unidad: it.unidad || 'u',
            cantidadVendida: round3(it.cantidad),
            ingresosUSD: round2(it.subtotalUSD),
            utilidadUSD: round2(lineProfit),
          });
        }
      }
      if (s.descuentoUSD) {
        utilidadBrutaVentasUSD -= s.descuentoUSD;
      }
      if (s.tipo === 'credito' && s.estadoCredito === 'pendiente') {
        const pending = Math.max(0, s.totalUSD - (s.montoPagadoUSD || 0));
        fiadosPendientesUSD += pending;
        fiadosPendientesCount += 1;
      }
    }

    let porPagarProveedoresUSD = 0;
    let porPagarProveedoresCount = 0;
    for (const sup of state.suppliers) {
      if (sup.estado === 'pendiente') {
        const pending = Math.max(0, sup.montoTotalUSD - sup.montoPagadoUSD);
        porPagarProveedoresUSD += pending;
        porPagarProveedoresCount += 1;
      }
    }

    const topProducts = Array.from(productStatsMap.values())
      .sort((a, b) => b.ingresosUSD - a.ingresosUSD)
      .slice(0, 5);

    const utilidadNetaRealUSD = round2(
      utilidadBrutaVentasUSD - gastosTotalesUSD - perdidasTotalesUSD
    );

    const upcomingFixedReminders: FixedExpenseReminder[] = state.fixedTemplates
      .filter((t) => t.frecuencia && t.frecuencia !== 'sin_recordatorio' && t.proximoVencimiento)
      .map((t) => ({
        template: t,
        diasRestantes: diffDaysFromTodayYMD(t.proximoVencimiento!),
      }))
      .filter((r) => r.diasRestantes <= 2)
      .sort((a, b) => a.diasRestantes - b.diasRestantes);

    return {
      capitalNetoUSD: round2(capitalNetoUSD),
      cajaLiquidaUSD: round2(cajaLiquidaUSD),
      ahorroTotalUSD: round2(Math.max(0, ahorroTotalUSD)),
      valorInventarioCostoUSD: round2(valorInventarioCostoUSD),
      valorInventarioVentaUSD: round2(valorInventarioVentaUSD),
      gananciaPotencialInventarioUSD: round2(valorInventarioVentaUSD - valorInventarioCostoUSD),
      fiadosPendientesUSD: round2(fiadosPendientesUSD),
      fiadosPendientesCount,
      porPagarProveedoresUSD: round2(porPagarProveedoresUSD),
      porPagarProveedoresCount,
      ventasTotalesUSD: round2(ventasTotalesUSD),
      utilidadBrutaVentasUSD: round2(utilidadBrutaVentasUSD),
      utilidadNetaRealUSD,
      gastosTotalesUSD: round2(gastosTotalesUSD),
      perdidasTotalesUSD: round2(perdidasTotalesUSD),
      walletBalances,
      topProducts,
      upcomingFixedReminders,
    };
  }, [
    state.fixedTemplates,
    state.ledger,
    state.products,
    state.sales,
    state.savingsMovements,
    state.suppliers,
  ]);

  const recordCashClosing = useCallback(
    (input: {
      cajero: string;
      desgloseConteo: Partial<Record<WalletId, number>>;
      observacion?: string;
    }): CashClosingRecord => {
      const esperado = round2(metrics.cajaLiquidaUSD);
      const contado = round2(
        Object.values(input.desgloseConteo).reduce((acc, v) => acc + (v || 0), 0)
      );
      const diff = round2(contado - esperado);

      const record: CashClosingRecord = {
        id: generateId('ARQ'),
        fecha: new Date().toISOString(),
        cajero: input.cajero.trim() || 'Turno Actual',
        esperadoSistemaUSD: esperado,
        contadoFisicoUSD: contado,
        diferenciaUSD: diff,
        tasaAplicada: state.rates.activeRate,
        desgloseConteo: input.desgloseConteo,
        observacion: input.observacion?.trim() || undefined,
      };

      setState((prev) => ({
        ...prev,
        cashClosings: [record, ...prev.cashClosings],
      }));
      showToast(
        Math.abs(diff) < 0.01
          ? 'Arqueo guardado: Caja cuadrada exacta'
          : diff > 0
          ? `Arqueo guardado: Sobrante de +$${diff.toFixed(2)}`
          : `Arqueo guardado: Faltante de -$${Math.abs(diff).toFixed(2)}`
      );
      return record;
    },
    [metrics.cajaLiquidaUSD, state.rates.activeRate, showToast]
  );

  const transferToSavings = useCallback(
    (input: { montoUSD: number; monederoId: WalletId; nota: string }): boolean => {
      const amount = round2(input.montoUSD);
      if (amount <= 0) return false;
      const nowIso = new Date().toISOString();

      setState((prev) => ({
        ...prev,
        savingsMovements: [
          {
            id: generateId('AHO'),
            fecha: nowIso,
            tipo: 'deposito',
            montoUSD: amount,
            tasaAplicada: prev.rates.activeRate,
            monederoId: input.monederoId,
            nota: input.nota.trim() || 'Apartado a Fondo de Reserva',
          },
          ...prev.savingsMovements,
        ],
        ledger: [
          {
            id: generateId('MOV'),
            fecha: nowIso,
            tipo: 'deposito_ahorro',
            concepto: `Traslado a Moneda de Ahorro: ${input.nota.trim() || 'Reserva'}`,
            montoUSD: -amount,
            tasaAplicada: prev.rates.activeRate,
            monederoId: input.monederoId,
          },
          ...prev.ledger,
        ],
      }));
      showToast(`$${amount.toFixed(2)} resguardados en Fondo de Ahorro`);
      return true;
    },
    [showToast]
  );

  const withdrawFromSavings = useCallback(
    (input: { montoUSD: number; monederoId: WalletId; nota: string }): boolean => {
      const amount = round2(input.montoUSD);
      if (amount <= 0 || amount > metrics.ahorroTotalUSD) {
        showToast('Saldo insuficiente en Fondo de Ahorro');
        return false;
      }
      const nowIso = new Date().toISOString();

      setState((prev) => ({
        ...prev,
        savingsMovements: [
          {
            id: generateId('AHO'),
            fecha: nowIso,
            tipo: 'retiro',
            montoUSD: amount,
            tasaAplicada: prev.rates.activeRate,
            monederoId: input.monederoId,
            nota: input.nota.trim() || 'Retiro hacia Caja Operativa',
          },
          ...prev.savingsMovements,
        ],
        ledger: [
          {
            id: generateId('MOV'),
            fecha: nowIso,
            tipo: 'retiro_ahorro',
            concepto: `Retiro de Ahorro a Caja: ${input.nota.trim() || 'Liquidez'}`,
            montoUSD: amount,
            tasaAplicada: prev.rates.activeRate,
            monederoId: input.monederoId,
          },
          ...prev.ledger,
        ],
      }));
      showToast(`$${amount.toFixed(2)} retornados a Caja Operativa`);
      return true;
    },
    [metrics.ahorroTotalUSD, showToast]
  );

  const createFixedTemplate = useCallback(
    (input: Omit<FixedExpenseTemplate, 'id' | 'vecesPagado' | 'ultimoPago'>) => {
      const newTpl: FixedExpenseTemplate = {
        ...input,
        id: generateId('FIJ'),
        nombre: input.nombre.trim(),
        montoUSD: round2(Math.max(0.01, input.montoUSD)),
        vecesPagado: 0,
      };
      setState((prev) => ({
        ...prev,
        fixedTemplates: [newTpl, ...prev.fixedTemplates],
      }));
      showToast(`Plantilla fija "${newTpl.nombre}" creada`);
    },
    [showToast]
  );

  const updateFixedTemplate = useCallback(
    (
      id: string,
      updates: Partial<Omit<FixedExpenseTemplate, 'id' | 'vecesPagado' | 'ultimoPago'>>
    ) => {
      setState((prev) => ({
        ...prev,
        fixedTemplates: prev.fixedTemplates.map((t) =>
          t.id === id
            ? {
                ...t,
                ...updates,
                nombre: updates.nombre !== undefined ? updates.nombre.trim() : t.nombre,
                montoUSD:
                  updates.montoUSD !== undefined
                    ? round2(Math.max(0.01, updates.montoUSD))
                    : t.montoUSD,
              }
            : t
        ),
      }));
      showToast('Plantilla fija actualizada');
    },
    [showToast]
  );

  const deleteFixedTemplate = useCallback(
    (id: string) => {
      setState((prev) => ({
        ...prev,
        fixedTemplates: prev.fixedTemplates.filter((t) => t.id !== id),
      }));
      showToast('Plantilla eliminada');
    },
    [showToast]
  );

  const payFixedTemplate = useCallback(
    (templateId: string, monederoIdOverride?: WalletId): ExtraExpense | null => {
      let generatedExpense: ExtraExpense | null = null;
      const nowIso = new Date().toISOString();

      setState((prev) => {
        const tpl = prev.fixedTemplates.find((t) => t.id === templateId);
        if (!tpl) return prev;
        const wallet = monederoIdOverride || tpl.monederoPreferido;
        const rate = prev.rates.activeRate;
        const numeroRecibo = generateDocNumber('REC');

        const expense: ExtraExpense = {
          id: generateId('GAS'),
          numeroRecibo,
          fecha: nowIso,
          concepto: tpl.nombre,
          categoria: tpl.categoria,
          beneficiario: tpl.categoria === 'Nómina' ? 'Personal del Comercio' : tpl.categoria,
          montoUSD: tpl.montoUSD,
          montoVES: round2(tpl.montoUSD * rate),
          tasaAplicada: rate,
          monederoId: wallet,
          notas: tpl.notas,
          origen: 'fijo',
        };
        generatedExpense = expense;

        return {
          ...prev,
          fixedTemplates: prev.fixedTemplates.map((t) => {
            if (t.id !== templateId) return t;
            const intervalDays = getFrequencyIntervalDays(t.frecuencia, t.cadaDias);
            let nextDue = t.proximoVencimiento;
            if (t.frecuencia && t.frecuencia !== 'sin_recordatorio' && intervalDays > 0) {
              const todayYmd = getLocalTodayYMD();
              let candidate = addDaysToYMD(t.proximoVencimiento || todayYmd, intervalDays);
              let guard = 0;
              while (candidate <= todayYmd && guard < 60) {
                candidate = addDaysToYMD(candidate, intervalDays);
                guard += 1;
              }
              nextDue = candidate;
            }
            return {
              ...t,
              ultimoPago: nowIso,
              vecesPagado: t.vecesPagado + 1,
              proximoVencimiento: nextDue,
            };
          }),
          extraExpenses: [expense, ...prev.extraExpenses],
          ledger: [
            {
              id: generateId('MOV'),
              fecha: nowIso,
              tipo: 'pago_fijo',
              concepto: `Pago fijo (${tpl.categoria}): ${tpl.nombre}`,
              montoUSD: -tpl.montoUSD,
              tasaAplicada: rate,
              monederoId: wallet,
              referencia: numeroRecibo,
            },
            ...prev.ledger,
          ],
        };
      });

      if (generatedExpense) {
        showToast(`Pago fijo ejecutado · ${(generatedExpense as ExtraExpense).numeroRecibo}`);
      }
      return generatedExpense;
    },
    [showToast]
  );

  const registerExtraExpense = useCallback(
    (input: {
      concepto: string;
      categoria: string;
      beneficiario?: string;
      montoUSD: number;
      monederoId: WalletId;
      notas?: string;
    }): ExtraExpense => {
      const nowIso = new Date().toISOString();
      const amount = round2(Math.max(0.01, input.montoUSD));
      const numeroRecibo = generateDocNumber('REC');
      const rate = state.rates.activeRate;

      const expense: ExtraExpense = {
        id: generateId('GAS'),
        numeroRecibo,
        fecha: nowIso,
        concepto: input.concepto.trim(),
        categoria: input.categoria.trim() || 'Operativo',
        beneficiario: input.beneficiario?.trim() || undefined,
        montoUSD: amount,
        montoVES: round2(amount * rate),
        tasaAplicada: rate,
        monederoId: input.monederoId,
        notas: input.notas?.trim() || undefined,
        origen: 'extra',
      };

      setState((prev) => ({
        ...prev,
        extraExpenses: [expense, ...prev.extraExpenses],
        ledger: [
          {
            id: generateId('MOV'),
            fecha: nowIso,
            tipo: 'gasto_extra',
            concepto: `Gasto extra: ${expense.concepto}`,
            montoUSD: -amount,
            tasaAplicada: prev.rates.activeRate,
            monederoId: input.monederoId,
            referencia: numeroRecibo,
          },
          ...prev.ledger,
        ],
      }));

      showToast(`Egreso registrado · Recibo ${numeroRecibo}`);
      return expense;
    },
    [state.rates.activeRate, showToast]
  );

  const addSupplierPayable = useCallback(
    (input: {
      proveedor: string;
      concepto: string;
      montoTotalUSD: number;
      fechaVencimiento?: string;
      notas?: string;
    }) => {
      const amount = round2(Math.max(0.01, input.montoTotalUSD));
      const item: SupplierPayable = {
        id: generateId('PRV'),
        proveedor: input.proveedor.trim(),
        concepto: input.concepto.trim(),
        fechaEmision: new Date().toISOString(),
        fechaVencimiento: input.fechaVencimiento || undefined,
        montoTotalUSD: amount,
        montoPagadoUSD: 0,
        estado: 'pendiente',
        tasaRegistro: state.rates.activeRate,
        notas: input.notas?.trim() || undefined,
      };
      setState((prev) => ({
        ...prev,
        suppliers: [item, ...prev.suppliers],
      }));
      showToast(`Cuenta por pagar a "${item.proveedor}" registrada`);
    },
    [state.rates.activeRate, showToast]
  );

  const paySupplierPayable = useCallback(
    (payableId: string, monederoId: WalletId, montoAbonoUSD?: number) => {
      const nowIso = new Date().toISOString();
      let paidAmt = 0;
      let fullyPaid = false;

      setState((prev) => {
        const target = prev.suppliers.find((s) => s.id === payableId);
        if (!target || target.estado === 'pagado') return prev;
        const remaining = round2(Math.max(0, target.montoTotalUSD - target.montoPagadoUSD));
        if (remaining <= 0) return prev;

        const payNow =
          montoAbonoUSD !== undefined && montoAbonoUSD > 0
            ? round2(Math.min(remaining, montoAbonoUSD))
            : remaining;
        const nextPaid = round2(target.montoPagadoUSD + payNow);
        const isComplete = nextPaid >= round2(target.montoTotalUSD - 0.009);
        paidAmt = payNow;
        fullyPaid = isComplete;

        return {
          ...prev,
          suppliers: prev.suppliers.map((s) =>
            s.id === payableId
              ? {
                  ...s,
                  montoPagadoUSD: isComplete ? target.montoTotalUSD : nextPaid,
                  estado: isComplete ? 'pagado' : 'pendiente',
                }
              : s
          ),
          ledger: [
            {
              id: generateId('MOV'),
              fecha: nowIso,
              tipo: 'pago_proveedor',
              concepto: `${isComplete ? 'Pago total' : 'Abono'} proveedor: ${target.proveedor} (${
                target.concepto
              })`,
              montoUSD: -payNow,
              tasaAplicada: prev.rates.activeRate,
              monederoId,
              referencia: target.id,
            },
            ...prev.ledger,
          ],
        };
      });

      if (paidAmt > 0) {
        showToast(
          fullyPaid
            ? `Factura a proveedor saldada ($${paidAmt.toFixed(2)})`
            : `Abono de $${paidAmt.toFixed(2)} pagado al proveedor`
        );
      }
    },
    [showToast]
  );

  const deleteSupplierPayable = useCallback(
    (payableId: string) => {
      setState((prev) => ({
        ...prev,
        suppliers: prev.suppliers.filter((s) => s.id !== payableId),
      }));
      showToast('Registro de proveedor eliminado');
    },
    [showToast]
  );

  const registerWarranty = useCallback(
    (input: {
      productId: string;
      cantidad: number;
      resolucion: 'perdida_total' | 'reingreso_stock';
      descontarDeStock: boolean;
      motivo: string;
    }) => {
      const qty = Math.max(0.01, round3(input.cantidad));
      const nowIso = new Date().toISOString();

      setState((prev) => {
        const prod = prev.products.find((p) => p.id === input.productId);
        if (!prod) return prev;

        const lossUSD =
          input.resolucion === 'perdida_total' ? round2(qty * prod.costoUSD) : 0;

        const nextProducts = prev.products.map((p) => {
          if (p.id !== prod.id) return p;
          if (input.resolucion === 'reingreso_stock') {
            return { ...p, stock: round3(p.stock + qty), updatedAt: nowIso };
          }
          if (input.descontarDeStock) {
            return { ...p, stock: Math.max(0, round3(p.stock - qty)), updatedAt: nowIso };
          }
          return p;
        });

        const nextLedger = [...prev.ledger];
        if (input.resolucion === 'perdida_total' && lossUSD > 0) {
          nextLedger.unshift({
            id: generateId('MOV'),
            fecha: nowIso,
            tipo: 'perdida_garantia',
            concepto: `Pérdida por garantía: ${prod.nombre} (${qty} ${prod.unidad || 'u'})`,
            montoUSD: -lossUSD,
            tasaAplicada: prev.rates.activeRate,
          });
        }

        return {
          ...prev,
          products: nextProducts,
          ledger: nextLedger,
          warranties: [
            {
              id: generateId('GAR'),
              fecha: nowIso,
              productId: prod.id,
              productoNombre: prod.nombre,
              cantidad: qty,
              costoUnitarioUSD: prod.costoUSD,
              perdidaTotalUSD: lossUSD,
              resolucion: input.resolucion,
              descontadoDeStock: input.descontarDeStock,
              motivo: input.motivo.trim() || 'Garantía / merma reportada',
            },
            ...prev.warranties,
          ],
        };
      });

      showToast(
        input.resolucion === 'perdida_total'
          ? 'Pérdida neta descontada del capital'
          : 'Unidades reingresadas al inventario'
      );
    },
    [showToast]
  );

  const exportDataJson = useCallback(() => {
    return JSON.stringify(state, null, 2);
  }, [state]);

  const importDataJson = useCallback(
    (raw: string): boolean => {
      try {
        const parsed = JSON.parse(raw) as StockfyState;
        if (!parsed || !Array.isArray(parsed.products) || !parsed.rates?.activeRate) {
          return false;
        }
        setState(normalizeState(parsed));
        showToast('Respaldo importado correctamente');
        return true;
      } catch {
        return false;
      }
    },
    [showToast]
  );

  const resetToDemo = useCallback(() => {
    setState((prev) => {
      const demo = createSeedState();
      return { ...demo, rates: prev.rates, features: prev.features };
    });
    showToast('Datos de demostración cargados');
  }, [showToast]);

  const resetToEmpty = useCallback(() => {
    setState((prev) => ({ ...createEmptyState(prev.rates), features: prev.features }));
    showToast('Comercio iniciado en blanco');
  }, [showToast]);

  const value = useMemo<StockfyContextValue>(
    () => ({
      state,
      metrics,
      activeTab,
      setActiveTab,
      theme,
      toggleTheme,
      isSyncingRate,
      syncError,
      toastMessage,
      showToast,
      selectedReceipt,
      setSelectedReceipt,
      selectedSaleReceipt,
      setSelectedSaleReceipt,
      isCashierLocked,
      lockCashierMode,
      unlockCashierMode,
      syncRatesNow,
      setRateSource,
      setManualRate,
      updateStoreConfig,
      updateFeatures,
      addProduct,
      updateProduct,
      restockProduct,
      deleteProduct,
      processSale,
      settleCreditSale,
      cancelSale,
      injectCapital,
      adjustCapital,
      updateCapitalMovement,
      deleteCapitalMovement,
      transferBetweenWallets,
      transferToSavings,
      withdrawFromSavings,
      recordCashClosing,
      createFixedTemplate,
      updateFixedTemplate,
      deleteFixedTemplate,
      payFixedTemplate,
      registerExtraExpense,
      addSupplierPayable,
      paySupplierPayable,
      deleteSupplierPayable,
      registerWarranty,
      exportDataJson,
      importDataJson,
      resetToDemo,
      resetToEmpty,
    }),
    [
      state,
      metrics,
      activeTab,
      setActiveTab,
      theme,
      toggleTheme,
      isSyncingRate,
      syncError,
      toastMessage,
      showToast,
      selectedReceipt,
      selectedSaleReceipt,
      isCashierLocked,
      lockCashierMode,
      unlockCashierMode,
      syncRatesNow,
      setRateSource,
      setManualRate,
      updateStoreConfig,
      updateFeatures,
      addProduct,
      updateProduct,
      restockProduct,
      deleteProduct,
      processSale,
      settleCreditSale,
      cancelSale,
      injectCapital,
      adjustCapital,
      updateCapitalMovement,
      deleteCapitalMovement,
      transferBetweenWallets,
      transferToSavings,
      withdrawFromSavings,
      recordCashClosing,
      createFixedTemplate,
      updateFixedTemplate,
      deleteFixedTemplate,
      payFixedTemplate,
      registerExtraExpense,
      addSupplierPayable,
      paySupplierPayable,
      deleteSupplierPayable,
      registerWarranty,
      exportDataJson,
      importDataJson,
      resetToDemo,
      resetToEmpty,
    ]
  );

  return <StockfyContext.Provider value={value}>{children}</StockfyContext.Provider>;
};

export function useStockfy(): StockfyContextValue {
  const ctx = useContext(StockfyContext);
  if (!ctx) throw new Error('useStockfy debe usarse dentro de StockfyProvider');
  return ctx;
}
