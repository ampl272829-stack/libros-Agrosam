import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Calculator,
  CheckCircle2,
  FileText,
  Minus,
  Plus,
  RotateCcw,
  ScanBarcode,
  Search,
  Share2,
  ShoppingCart,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react';
import { useStockfy } from '../context/StockfyContext';
import type { Sale, WalletId } from '../types/stockfy';
import {
  WALLETS,
  formatDateTime,
  formatQty,
  formatUSD,
  formatVES,
  getWalletName,
  round2,
  round3,
  shareOrCopyText,
} from '../utils/formatters';
import { BarcodeScannerModal } from './BarcodeScannerModal';

interface CartLine {
  productId: string;
  cantidad: number;
}

interface SplitRow {
  monederoId: WalletId;
  montoInput: string;
}

export const SalesAndCreditsView: React.FC = () => {
  const {
    state,
    metrics,
    isCashierLocked,
    processSale,
    settleCreditSale,
    cancelSale,
    setSelectedSaleReceipt,
    showToast,
    setActiveTab,
  } = useStockfy();
  const rate = state.rates.activeRate;
  const canScanAndShare = state.features.enableScannerAndShare;

  const [subTab, setSubTab] = useState<'pos' | 'credits'>('pos');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [scannerOpen, setScannerOpen] = useState(false);

  const [cart, setCart] = useState<CartLine[]>([]);
  const [discountInput, setDiscountInput] = useState('');
  const [saleType, setSaleType] = useState<'contado' | 'credito'>('contado');
  const [selectedWallet, setSelectedWallet] = useState<WalletId>('pago_movil');

  // Split / Mixed Payment (Point 1)
  const [isMixedPayment, setIsMixedPayment] = useState(false);
  const [splitRows, setSplitRows] = useState<SplitRow[]>([
    { monederoId: 'efectivo_usd', montoInput: '' },
    { monederoId: 'pago_movil', montoInput: '' },
  ]);

  const [creditClient, setCreditClient] = useState('');
  const [creditNote, setCreditNote] = useState('');

  // Change calculator (Calculadora de vuelto)
  const [receivedCurrency, setReceivedCurrency] = useState<'USD' | 'VES'>('USD');
  const [receivedAmountInput, setReceivedAmountInput] = useState('');

  // Recent cash sales toggle & inline void confirmation
  const [showAllCashSales, setShowAllCashSales] = useState(false);
  const [confirmCancelSaleId, setConfirmCancelSaleId] = useState<string | null>(null);

  // Credits filter & settlement sheet
  const [creditFilter, setCreditFilter] = useState<'pendiente' | 'cobrado' | 'todos'>(
    'pendiente'
  );
  const [settlingSale, setSettlingSale] = useState<Sale | null>(null);
  const [settleWallet, setSettleWallet] = useState<WalletId>('pago_movil');
  const [settleAmountInput, setSettleAmountInput] = useState('');

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of state.products) {
      set.add(p.categoria?.trim() || 'General');
    }
    return ['Todas', ...Array.from(set).sort((a, b) => a.localeCompare(b, 'es'))];
  }, [state.products]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return state.products.filter((p) => {
      const prodCat = p.categoria?.trim() || 'General';
      if (selectedCategory !== 'Todas' && prodCat !== selectedCategory) return false;
      if (!q) return true;
      return (
        p.nombre.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.categoria && p.categoria.toLowerCase().includes(q))
      );
    });
  }, [state.products, search, selectedCategory]);

  const cartDetails = useMemo(() => {
    return cart
      .map((line) => {
        const prod = state.products.find((p) => p.id === line.productId);
        if (!prod) return null;
        return {
          ...line,
          product: prod,
          subtotalUSD: round2(prod.precioUSD * line.cantidad),
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [cart, state.products]);

  const cartSubtotalUSD = useMemo(
    () => round2(cartDetails.reduce((acc, item) => acc + item.subtotalUSD, 0)),
    [cartDetails]
  );

  const descuentoUSD = useMemo(() => {
    const raw = parseFloat(discountInput);
    if (!Number.isFinite(raw) || raw <= 0) return 0;
    return round2(Math.min(cartSubtotalUSD, raw));
  }, [discountInput, cartSubtotalUSD]);

  const cartTotalUSD = useMemo(
    () => round2(Math.max(0, cartSubtotalUSD - descuentoUSD)),
    [cartSubtotalUSD, descuentoUSD]
  );

  const splitAssignedUSD = useMemo(
    () =>
      round2(
        splitRows.reduce((acc, row) => {
          const val = parseFloat(row.montoInput);
          return acc + (Number.isFinite(val) && val > 0 ? val : 0);
        }, 0)
      ),
    [splitRows]
  );

  const splitRemainingUSD = useMemo(
    () => round2(cartTotalUSD - splitAssignedUSD),
    [cartTotalUSD, splitAssignedUSD]
  );

  const receivedInUSD = useMemo(() => {
    const raw = parseFloat(receivedAmountInput);
    if (!Number.isFinite(raw) || raw <= 0) return 0;
    return receivedCurrency === 'USD' ? round2(raw) : round2(raw / rate);
  }, [receivedAmountInput, receivedCurrency, rate]);

  const changeUSD = useMemo(() => {
    if (receivedInUSD <= 0) return 0;
    return round2(receivedInUSD - cartTotalUSD);
  }, [receivedInUSD, cartTotalUSD]);

  const addToCart = (productId: string) => {
    const prod = state.products.find((p) => p.id === productId);
    if (!prod || prod.stock <= 0) {
      showToast('Producto sin stock disponible');
      return;
    }
    const defaultStep = prod.unidad && prod.unidad !== 'u' && prod.stock < 1 ? prod.stock : 1;
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === productId);
      if (existing) {
        const nextQty = round3(existing.cantidad + 1);
        if (nextQty > prod.stock) {
          showToast(`Stock máximo alcanzado (${formatQty(prod.stock, prod.unidad)})`);
          return prev;
        }
        return prev.map((l) =>
          l.productId === productId ? { ...l, cantidad: nextQty } : l
        );
      }
      return [...prev, { productId, cantidad: round3(Math.min(defaultStep, prod.stock)) }];
    });
  };

  const handleBarcodeDetected = (code: string) => {
    const clean = code.trim().toLowerCase();
    const match = state.products.find((p) => p.sku && p.sku.trim().toLowerCase() === clean);
    if (match) {
      addToCart(match.id);
      showToast(`Escaneado: ${match.nombre}`);
    } else {
      setSearch(code.trim());
      showToast(`Código ${code.trim()} no coincide exactamente con ningún SKU`);
    }
  };

  const setCartQtyExact = (productId: string, rawQty: number) => {
    const prod = state.products.find((p) => p.id === productId);
    if (!prod) return;
    if (!Number.isFinite(rawQty) || rawQty <= 0) {
      setCart((prev) => prev.filter((l) => l.productId !== productId));
      return;
    }
    const clamped = round3(Math.min(prod.stock, rawQty));
    if (rawQty > prod.stock) {
      showToast(`Solo hay ${formatQty(prod.stock, prod.unidad)} en inventario`);
    }
    setCart((prev) =>
      prev.map((l) => (l.productId === productId ? { ...l, cantidad: clamped } : l))
    );
  };

  const updateCartQty = (productId: string, delta: number) => {
    const prod = state.products.find((p) => p.id === productId);
    if (!prod) return;
    setCart((prev) =>
      prev
        .map((l) => {
          if (l.productId !== productId) return l;
          const nextQty = round3(l.cantidad + delta);
          if (nextQty <= 0) return null;
          if (nextQty > prod.stock + 0.0001) {
            showToast(`Solo hay ${formatQty(prod.stock, prod.unidad)} en inventario`);
            return l;
          }
          return { ...l, cantidad: nextQty };
        })
        .filter((x): x is CartLine => x !== null)
    );
  };

  const handleCompleteSplitRow = (index: number) => {
    const otherTotal = splitRows.reduce((acc, r, idx) => {
      if (idx === index) return acc;
      const v = parseFloat(r.montoInput);
      return acc + (Number.isFinite(v) && v > 0 ? v : 0);
    }, 0);
    const needed = round2(Math.max(0, cartTotalUSD - otherTotal));
    setSplitRows((prev) =>
      prev.map((r, idx) => (idx === index ? { ...r, montoInput: needed.toFixed(2) } : r))
    );
  };

  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (cartDetails.length === 0) {
      showToast('Agrega al menos un producto al carrito');
      return;
    }
    if (saleType === 'credito' && !creditClient.trim()) {
      showToast('Indica el nombre del cliente para registrar el fiado');
      return;
    }

    let pagos: Array<{ monederoId: WalletId; montoUSD: number }> | undefined = undefined;
    if (saleType === 'contado' && isMixedPayment) {
      pagos = splitRows
        .map((r) => ({ monederoId: r.monederoId, montoUSD: round2(parseFloat(r.montoInput) || 0) }))
        .filter((r) => r.montoUSD > 0);
      if (pagos.length === 0) {
        showToast('Ingresa los montos en el pago mixto');
        return;
      }
    }

    const res = processSale({
      items: cartDetails.map((d) => ({ productId: d.productId, cantidad: d.cantidad })),
      descuentoUSD: descuentoUSD > 0 ? descuentoUSD : undefined,
      tipo: saleType,
      monederoId: saleType === 'contado' && !isMixedPayment ? selectedWallet : undefined,
      pagos,
      cliente: saleType === 'credito' ? creditClient : undefined,
      nota: saleType === 'credito' ? creditNote : undefined,
    });

    if (res) {
      setCart([]);
      setDiscountInput('');
      setReceivedAmountInput('');
      setSplitRows([
        { monederoId: 'efectivo_usd', montoInput: '' },
        { monederoId: 'pago_movil', montoInput: '' },
      ]);
      setCreditClient('');
      setCreditNote('');
      setSelectedSaleReceipt(res);
    }
  };

  const creditSales = useMemo(() => {
    const allCredits = state.sales.filter((s) => s.tipo === 'credito');
    if (creditFilter === 'todos') return allCredits;
    return allCredits.filter((s) => s.estadoCredito === creditFilter);
  }, [state.sales, creditFilter]);

  const allCashSales = useMemo(
    () => state.sales.filter((s) => s.tipo === 'contado'),
    [state.sales]
  );

  const recentCashSales = useMemo(
    () => (showAllCashSales ? allCashSales : allCashSales.slice(0, 6)),
    [allCashSales, showAllCashSales]
  );

  const openSettleModal = (sale: Sale) => {
    const paid = round2(sale.montoPagadoUSD || 0);
    const remaining = round2(Math.max(0, sale.totalUSD - paid));
    setSettlingSale(sale);
    setSettleWallet('pago_movil');
    setSettleAmountInput(remaining.toFixed(2));
  };

  const handleShareDebtReminder = async (sale: Sale) => {
    const paid = round2(sale.montoPagadoUSD || 0);
    const remaining = round2(Math.max(0, sale.totalUSD - paid));
    const text = [
      `Hola ${sale.cliente || 'estimado cliente'}, te saludamos de *${state.store.nombreComercio}*.`,
      `Te recordamos el saldo pendiente de tu nota *${sale.numeroFactura}*:`,
      `• Saldo pendiente: *${formatUSD(remaining)}* (${formatVES(remaining, rate)})`,
      paid > 0 ? `• Ya abonado: ${formatUSD(paid)}` : '',
      `Gracias por tu preferencia.`,
    ]
      .filter(Boolean)
      .join('\n');

    const res = await shareOrCopyText(`Recordatorio ${sale.numeroFactura}`, text);
    if (res === 'shared') showToast('Recordatorio compartido');
    else if (res === 'copied') showToast('Recordatorio copiado para enviar por WhatsApp');
    else showToast('No se pudo compartir');
  };

  return (
    <div className="space-y-6">
      {/* Sub-navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="inline-flex p-1 bg-slate-200/70 dark:bg-slate-800 rounded-xl self-start">
          <button
            type="button"
            onClick={() => setSubTab('pos')}
            className={`min-h-[40px] px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              subTab === 'pos'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Facturación Rápida
          </button>
          <button
            type="button"
            onClick={() => setSubTab('credits')}
            className={`min-h-[40px] px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap flex items-center gap-2 ${
              subTab === 'credits'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>Créditos (Fiados)</span>
            {metrics.fiadosPendientesCount > 0 && (
              <span className="font-mono tabular-nums text-amber-700 dark:text-amber-400">
                ({metrics.fiadosPendientesCount})
              </span>
            )}
          </button>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
          Total Fiados Pendientes:{' '}
          <strong className="text-slate-900 dark:text-white">
            {formatUSD(metrics.fiadosPendientesUSD)}
          </strong>{' '}
          · {formatVES(metrics.fiadosPendientesUSD, rate)}
        </p>
      </div>

      {subTab === 'pos' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Product Selector */}
          <div className="lg:col-span-7 space-y-4">
            <div className="space-y-2.5">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar producto por nombre o código SKU..."
                    className="w-full min-h-[44px] pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
                  />
                </div>
                {canScanAndShare && (
                  <button
                    type="button"
                    onClick={() => setScannerOpen(true)}
                    title="Escanear código para agregar al carrito"
                    className="min-h-[44px] min-w-[44px] px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center shrink-0"
                    aria-label="Escanear producto"
                  >
                    <ScanBarcode className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </button>
                )}
              </div>

              {categories.length > 2 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                        selectedCategory === cat
                          ? 'bg-slate-900 dark:bg-emerald-600 text-white'
                          : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {state.products.length === 0 ? (
              <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  No hay productos en el inventario
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Agrega tu primer producto para empezar a facturar en Dólares y Bolívares.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('inventory')}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700"
                >
                  Ir a Inventario
                </button>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Sin resultados para &ldquo;{search}&rdquo;
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredProducts.map((prod) => {
                  const inCart = cart.find((c) => c.productId === prod.id)?.cantidad || 0;
                  const outOfStock = prod.stock <= 0;
                  return (
                    <button
                      key={prod.id}
                      type="button"
                      disabled={outOfStock}
                      onClick={() => addToCart(prod.id)}
                      className={`min-h-[84px] p-4 rounded-2xl border text-left transition-colors flex flex-col justify-between gap-2 ${
                        outOfStock
                          ? 'bg-slate-100 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60 cursor-not-allowed'
                          : inCart > 0
                          ? 'bg-emerald-50/40 dark:bg-emerald-950/30 border-emerald-500'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 w-full">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                            {prod.nombre}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {prod.sku ? `SKU ${prod.sku} · ` : ''}
                            <span
                              className={
                                prod.stock <= 5
                                  ? 'text-amber-700 dark:text-amber-400 font-medium'
                                  : ''
                              }
                            >
                              {formatQty(prod.stock, prod.unidad)} en stock
                            </span>
                          </p>
                        </div>
                        {inCart > 0 && (
                          <span className="font-mono tabular-nums text-xs font-bold text-emerald-700 dark:text-emerald-400 shrink-0">
                            ×{formatQty(inCart, prod.unidad)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-baseline justify-between gap-2 w-full pt-1 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-base font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                          {formatUSD(prod.precioUSD)}
                          {prod.unidad && prod.unidad !== 'u' ? ` /${prod.unidad}` : ''}
                        </span>
                        <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                          {formatVES(prod.precioUSD, rate)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Recent Cash Sales List */}
            {recentCashSales.length > 0 && (
              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                  <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Ventas Recientes de Contado ({allCashSales.length})
                  </h3>
                  {allCashSales.length > 6 && (
                    <button
                      type="button"
                      onClick={() => setShowAllCashSales((v) => !v)}
                      className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline whitespace-nowrap"
                    >
                      {showAllCashSales ? 'Ver últimas 6' : `Ver todas (${allCashSales.length})`}
                    </button>
                  )}
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {recentCashSales.map((s) => {
                    const isConfirming = confirmCancelSaleId === s.id;
                    const walletDisplay =
                      s.pagos && s.pagos.length > 1
                        ? s.pagos.map((p) => getWalletName(p.monederoId)).join(' + ')
                        : getWalletName(s.monederoId);
                    return (
                      <div
                        key={s.id}
                        className="px-4 py-3 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-900 dark:text-white font-mono tabular-nums truncate">
                            {s.numeroFactura} · {walletDisplay}
                          </p>
                          <p className="text-slate-500 dark:text-slate-400 truncate">
                            {s.items
                              .map((i) => `${formatQty(i.cantidad, i.unidad)}× ${i.nombre}`)
                              .join(', ')}
                            {s.descuentoUSD ? ` · Desc. -${formatUSD(s.descuentoUSD)}` : ''} ·{' '}
                            {formatDateTime(s.fecha)}
                          </p>
                        </div>
                        <div className="text-right font-mono tabular-nums shrink-0">
                          <p className="font-semibold text-slate-900 dark:text-white">
                            {formatUSD(s.totalUSD)}
                          </p>
                          <p className="text-slate-500 dark:text-slate-400">
                            {formatVES(s.totalUSD, s.tasaAplicada)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => setSelectedSaleReceipt(s)}
                            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                            aria-label={`Ver ticket ${s.numeroFactura}`}
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>

                          {!isCashierLocked &&
                            (isConfirming ? (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    cancelSale(s.id);
                                    setConfirmCancelSaleId(null);
                                  }}
                                  className="min-h-[36px] px-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-semibold whitespace-nowrap"
                                >
                                  Confirmar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmCancelSaleId(null)}
                                  className="min-h-[36px] px-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-medium"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmCancelSaleId(s.id)}
                                title="Anular venta y devolver stock"
                                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                                aria-label={`Anular ${s.numeroFactura}`}
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Checkout Panel */}
          <form
            onSubmit={handleCheckout}
            className="lg:col-span-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden lg:sticky lg:top-20"
          >
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Ticket de Venta
                </h2>
              </div>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setCart([]);
                    setDiscountInput('');
                    setReceivedAmountInput('');
                  }}
                  className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 font-medium"
                >
                  Vaciar
                </button>
              )}
            </div>

            <div className="p-5 space-y-5">
              {cartDetails.length === 0 ? (
                <div className="py-8 text-center space-y-1">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    Carrito vacío
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Toca cualquier producto del catálogo o escanea su código para sumarlo.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-64 overflow-y-auto pr-1">
                  {cartDetails.map((line) => {
                    const stepDelta = line.product.unidad && line.product.unidad !== 'u' ? 0.5 : 1;
                    return (
                      <div
                        key={line.productId}
                        className="py-2.5 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                            {line.product.nombre}
                          </p>
                          <p className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                            {formatUSD(line.product.precioUSD)}/{line.product.unidad || 'u'} · Sub{' '}
                            {formatUSD(line.subtotalUSD)}
                          </p>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => updateCartQty(line.productId, -stepDelta)}
                            className="min-h-[36px] min-w-[34px] flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                            aria-label="Disminuir cantidad"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <input
                            type="number"
                            min="0.01"
                            max={line.product.stock}
                            step="any"
                            value={line.cantidad}
                            onChange={(e) =>
                              setCartQtyExact(line.productId, parseFloat(e.target.value))
                            }
                            aria-label="Cantidad"
                            className="w-14 min-h-[36px] px-1 text-center font-mono tabular-nums text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                          />
                          <button
                            type="button"
                            onClick={() => updateCartQty(line.productId, stepDelta)}
                            className="min-h-[36px] min-w-[34px] flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                            aria-label="Aumentar cantidad"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => updateCartQty(line.productId, -line.cantidad)}
                            className="min-h-[36px] min-w-[34px] flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                            aria-label="Quitar del carrito"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Optional Discount */}
              {cartDetails.length > 0 && (
                <div className="flex items-center justify-between gap-3">
                  <label
                    htmlFor="pos-discount"
                    className="text-xs font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap"
                  >
                    Descuento en $ (Opcional)
                  </label>
                  <div className="relative w-32">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">
                      $
                    </span>
                    <input
                      id="pos-discount"
                      type="number"
                      min="0"
                      max={cartSubtotalUSD}
                      step="0.01"
                      value={discountInput}
                      onChange={(e) => setDiscountInput(e.target.value)}
                      placeholder="0.00"
                      className="w-full min-h-[40px] pl-6 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-right text-xs font-mono tabular-nums text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
                    />
                  </div>
                </div>
              )}

              {/* Totals Box */}
              <div className="p-4 rounded-xl bg-slate-900 dark:bg-slate-950 border border-slate-800 text-white space-y-1.5">
                {descuentoUSD > 0 && (
                  <div className="flex items-baseline justify-between text-xs text-slate-400 font-mono tabular-nums">
                    <span>Subtotal: {formatUSD(cartSubtotalUSD)}</span>
                    <span className="text-amber-400">Desc: -{formatUSD(descuentoUSD)}</span>
                  </div>
                )}
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-slate-300">Total a cobrar ($)</span>
                  <span className="text-2xl font-bold font-mono tabular-nums">
                    {formatUSD(cartTotalUSD)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-slate-400">Equivalente en Bs.</span>
                  <span className="text-sm font-semibold font-mono tabular-nums text-emerald-400">
                    {formatVES(cartTotalUSD, rate)}
                  </span>
                </div>
              </div>

              {/* Sale Type Toggle */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Modalidad de Venta
                </p>
                <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setSaleType('contado')}
                    className={`min-h-[40px] px-3 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                      saleType === 'contado'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    De Contado
                  </button>
                  <button
                    type="button"
                    onClick={() => setSaleType('credito')}
                    className={`min-h-[40px] px-3 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                      saleType === 'credito'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Crédito (Fiado)
                  </button>
                </div>
              </div>

              {saleType === 'contado' ? (
                <div className="space-y-4">
                  {/* Single vs Split Payment Toggle (Point 1) */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Forma de Cobro
                      </p>
                      <div className="inline-flex p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-[11px] font-semibold">
                        <button
                          type="button"
                          onClick={() => setIsMixedPayment(false)}
                          className={`px-2.5 py-1 rounded-md transition-colors ${
                            !isMixedPayment
                              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          1 Monedero
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsMixedPayment(true)}
                          className={`px-2.5 py-1 rounded-md transition-colors ${
                            isMixedPayment
                              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          Pago Mixto
                        </button>
                      </div>
                    </div>

                    {!isMixedPayment ? (
                      <div className="grid grid-cols-2 gap-2">
                        {WALLETS.map((w) => (
                          <button
                            key={w.id}
                            type="button"
                            onClick={() => setSelectedWallet(w.id)}
                            className={`min-h-[42px] px-3 py-2 rounded-xl border text-xs font-medium text-left transition-colors truncate ${
                              selectedWallet === w.id
                                ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 font-semibold'
                                : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                          >
                            {w.nombre}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2.5">
                        <div className="flex items-center justify-between text-[11px] font-mono tabular-nums">
                          <span className="text-slate-500 dark:text-slate-400">
                            Asignado: {formatUSD(splitAssignedUSD)}
                          </span>
                          <span
                            className={`font-semibold ${
                              Math.abs(splitRemainingUSD) <= 0.01
                                ? 'text-emerald-700 dark:text-emerald-400'
                                : 'text-amber-700 dark:text-amber-400'
                            }`}
                          >
                            {Math.abs(splitRemainingUSD) <= 0.01
                              ? 'Cuadrado exacto'
                              : splitRemainingUSD > 0
                              ? `Falta: ${formatUSD(splitRemainingUSD)}`
                              : `Excede: ${formatUSD(Math.abs(splitRemainingUSD))}`}
                          </span>
                        </div>

                        {splitRows.map((row, idx) => (
                          <div key={idx} className="flex items-center gap-1.5">
                            <select
                              value={row.monederoId}
                              onChange={(e) =>
                                setSplitRows((prev) =>
                                  prev.map((r, i) =>
                                    i === idx ? { ...r, monederoId: e.target.value as WalletId } : r
                                  )
                                )
                              }
                              className="flex-1 min-h-[40px] px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                            >
                              {WALLETS.map((w) => (
                                <option key={w.id} value={w.id}>
                                  {w.nombre}
                                </option>
                              ))}
                            </select>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={row.montoInput}
                              onChange={(e) =>
                                setSplitRows((prev) =>
                                  prev.map((r, i) =>
                                    i === idx ? { ...r, montoInput: e.target.value } : r
                                  )
                                )
                              }
                              placeholder="$0.00"
                              className="w-24 min-h-[40px] px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono tabular-nums text-right text-slate-900 dark:text-white"
                            />
                            <button
                              type="button"
                              onClick={() => handleCompleteSplitRow(idx)}
                              title="Asignar el monto restante a este monedero"
                              className="min-h-[40px] px-2 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 whitespace-nowrap"
                            >
                              Resto
                            </button>
                            {splitRows.length > 2 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setSplitRows((prev) => prev.filter((_, i) => i !== idx))
                                }
                                className="min-h-[40px] min-w-[34px] flex items-center justify-center rounded-xl text-slate-400 hover:text-red-600"
                                aria-label="Quitar método"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}

                        {splitRows.length < 4 && (
                          <button
                            type="button"
                            onClick={() =>
                              setSplitRows((prev) => [
                                ...prev,
                                { monederoId: 'zelle', montoInput: '' },
                              ])
                            }
                            className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
                          >
                            + Agregar otro método de pago
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Change Calculator (Calculadora de Vuelto) */}
                  {cartTotalUSD > 0 && !isMixedPayment && (
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                          <Calculator className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>Calculadora de Vuelto</span>
                        </div>
                        <div className="inline-flex p-0.5 bg-slate-200/80 dark:bg-slate-800 rounded-lg text-[11px] font-semibold">
                          <button
                            type="button"
                            onClick={() => setReceivedCurrency('USD')}
                            className={`px-2.5 py-1 rounded-md transition-colors ${
                              receivedCurrency === 'USD'
                                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            $ USD
                          </button>
                          <button
                            type="button"
                            onClick={() => setReceivedCurrency('VES')}
                            className={`px-2.5 py-1 rounded-md transition-colors ${
                              receivedCurrency === 'VES'
                                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            Bs.
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={receivedAmountInput}
                          onChange={(e) => setReceivedAmountInput(e.target.value)}
                          placeholder={
                            receivedCurrency === 'USD'
                              ? 'Monto recibido en $...'
                              : 'Monto recibido en Bs...'
                          }
                          className="w-full min-h-[40px] px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono tabular-nums text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
                        />
                        {receivedAmountInput && (
                          <button
                            type="button"
                            onClick={() => setReceivedAmountInput('')}
                            className="min-h-[40px] px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs"
                          >
                            Limpiar
                          </button>
                        )}
                      </div>

                      {receivedInUSD > 0 && (
                        <div className="flex items-center justify-between text-xs font-mono tabular-nums pt-1 border-t border-slate-200 dark:border-slate-800">
                          <span
                            className={
                              changeUSD >= 0
                                ? 'font-semibold text-emerald-700 dark:text-emerald-400'
                                : 'font-semibold text-amber-700 dark:text-amber-400'
                            }
                          >
                            {changeUSD >= 0 ? 'Vuelto a entregar:' : 'Falta por pagar:'}
                          </span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {formatUSD(Math.abs(changeUSD))} ·{' '}
                            {formatVES(Math.abs(changeUSD), rate)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label
                      htmlFor="credit-client"
                      className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                    >
                      Nombre del Cliente (Fiado)
                    </label>
                    <input
                      id="credit-client"
                      type="text"
                      value={creditClient}
                      onChange={(e) => setCreditClient(e.target.value)}
                      placeholder="Ej. María Pérez / Taller Central"
                      className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="credit-note"
                      className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
                    >
                      Nota / Compromiso de pago (Opcional)
                    </label>
                    <input
                      id="credit-note"
                      type="text"
                      value={creditNote}
                      onChange={(e) => setCreditNote(e.target.value)}
                      placeholder="Ej. Cancela el sábado"
                      className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={cartDetails.length === 0}
                className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 text-white text-sm font-semibold transition-colors"
              >
                {saleType === 'contado'
                  ? isMixedPayment
                    ? 'Cobrar Pago Mixto'
                    : `Cobrar por ${getWalletName(selectedWallet)}`
                  : 'Registrar Venta a Crédito (Pendiente)'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Credits (Fiados) & Cobranza Tab */
        <div className="space-y-5">
          {metrics.fiadosPendientesCount > 0 && (
            <div className="p-4 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-950 dark:text-amber-200">
                    Tienes {metrics.fiadosPendientesCount}{' '}
                    {metrics.fiadosPendientesCount === 1
                      ? 'crédito pendiente de cobro'
                      : 'créditos pendientes de cobro'}
                  </p>
                  <p className="text-xs text-amber-800 dark:text-amber-300 font-mono tabular-nums mt-0.5">
                    Saldo por cobrar: {formatUSD(metrics.fiadosPendientesUSD)} ·{' '}
                    {formatVES(metrics.fiadosPendientesUSD, rate)}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="inline-flex p-1 bg-slate-200/70 dark:bg-slate-800 rounded-xl">
            {(
              [
                { id: 'pendiente', label: 'Pendientes' },
                { id: 'cobrado', label: 'Cobrados' },
                { id: 'todos', label: 'Todos' },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setCreditFilter(f.id)}
                className={`min-h-[38px] px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                  creditFilter === f.id
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {creditSales.length === 0 ? (
            <div className="p-10 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-2">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                No hay créditos en esta vista
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Cuando registres una venta en modalidad &ldquo;Crédito (Fiado)&rdquo; aparecerá aquí
                para su seguimiento y cobranza.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {creditSales.map((sale) => {
                const isPending = sale.estadoCredito === 'pendiente';
                const paid = round2(sale.montoPagadoUSD || 0);
                const remaining = round2(Math.max(0, sale.totalUSD - paid));
                return (
                  <div
                    key={sale.id}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-base font-semibold text-slate-900 dark:text-white truncate">
                            {sale.cliente || 'Cliente sin nombre'}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                            {sale.numeroFactura} · {formatDateTime(sale.fecha)}
                          </p>
                        </div>

                        <span
                          className={`text-xs font-semibold flex items-center gap-1 shrink-0 ${
                            isPending
                              ? 'text-amber-700 dark:text-amber-400'
                              : 'text-emerald-700 dark:text-emerald-400'
                          }`}
                        >
                          {isPending ? (
                            <AlertCircle className="w-3.5 h-3.5" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          <span>{isPending ? 'Pendiente' : 'Cobrado'}</span>
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        {sale.items
                          .map((it) => `${formatQty(it.cantidad, it.unidad)}× ${it.nombre}`)
                          .join(', ')}
                      </p>
                      {paid > 0 && isPending && (
                        <p className="text-xs font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                          Abonado: {formatUSD(paid)} de {formatUSD(sale.totalUSD)}
                        </p>
                      )}
                      {sale.nota && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                          Nota: {sale.nota}
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                      <div className="font-mono tabular-nums">
                        <p className="text-lg font-bold text-slate-900 dark:text-white">
                          {formatUSD(isPending ? remaining : sale.totalUSD)}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {formatVES(isPending ? remaining : sale.totalUSD, rate)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap justify-end">
                        <button
                          type="button"
                          onClick={() => setSelectedSaleReceipt(sale)}
                          className="min-h-[42px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium flex items-center gap-1"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Ticket</span>
                        </button>

                        {isPending && canScanAndShare && (
                          <button
                            type="button"
                            onClick={() => void handleShareDebtReminder(sale)}
                            title="Enviar recordatorio de cobro por WhatsApp"
                            className="min-h-[42px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium flex items-center gap-1 whitespace-nowrap"
                          >
                            <Share2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>Cobrar WA</span>
                          </button>
                        )}

                        {!isCashierLocked &&
                          (confirmCancelSaleId === sale.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  cancelSale(sale.id);
                                  setConfirmCancelSaleId(null);
                                }}
                                className="min-h-[42px] px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold whitespace-nowrap"
                              >
                                Anular
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmCancelSaleId(null)}
                                className="min-h-[42px] px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmCancelSaleId(sale.id)}
                              title="Anular crédito y devolver stock"
                              className="min-h-[42px] min-w-[42px] flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                              aria-label={`Anular ${sale.numeroFactura}`}
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          ))}

                        {isPending ? (
                          <button
                            type="button"
                            onClick={() => openSettleModal(sale)}
                            className="min-h-[42px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap"
                          >
                            <UserCheck className="w-4 h-4" />
                            <span>Cobrar / Abonar</span>
                          </button>
                        ) : (
                          <div className="text-right text-xs text-slate-500 dark:text-slate-400">
                            <p className="font-medium text-slate-700 dark:text-slate-200">
                              {getWalletName(sale.monederoCobroId)}
                            </p>
                            {sale.fechaCobro && <p>{formatDateTime(sale.fechaCobro)}</p>}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Settle / Partial Abono Credit Modal */}
      {settlingSale && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-xs p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
            <div className="sm:hidden w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mt-3 mb-1" />
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  Cobrar o Abonar Crédito
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {settlingSale.cliente} · {settlingSale.numeroFactura}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSettlingSale(null)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 pb-safe">
              {(() => {
                const paid = round2(settlingSale.montoPagadoUSD || 0);
                const remaining = round2(Math.max(0, settlingSale.totalUSD - paid));
                const abonoVal = parseFloat(settleAmountInput) || 0;
                return (
                  <>
                    <div className="p-4 rounded-xl bg-slate-900 dark:bg-slate-950 border border-slate-800 text-white flex items-baseline justify-between">
                      <div>
                        <span className="text-xs text-slate-300 block">Saldo pendiente</span>
                        {paid > 0 && (
                          <span className="text-[11px] text-slate-400">
                            Ya abonado: {formatUSD(paid)}
                          </span>
                        )}
                      </div>
                      <div className="text-right font-mono tabular-nums">
                        <p className="text-xl font-bold">{formatUSD(remaining)}</p>
                        <p className="text-xs text-emerald-400">
                          {formatVES(remaining, rate)}
                        </p>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label
                          htmlFor="abono-input"
                          className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                        >
                          Monto a cobrar ahora ($)
                        </label>
                        <button
                          type="button"
                          onClick={() => setSettleAmountInput(remaining.toFixed(2))}
                          className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400"
                        >
                          Finiquitar todo ({formatUSD(remaining)})
                        </button>
                      </div>
                      <input
                        id="abono-input"
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={remaining}
                        value={settleAmountInput}
                        onChange={(e) => setSettleAmountInput(e.target.value)}
                        className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-base font-bold font-mono tabular-nums text-slate-900 dark:text-white"
                      />
                      {abonoVal > 0 && (
                        <p className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 mt-1">
                          Equivalente: {formatVES(abonoVal, rate)}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Monedero donde ingresó el pago
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {WALLETS.map((w) => (
                          <button
                            key={w.id}
                            type="button"
                            onClick={() => setSettleWallet(w.id)}
                            className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-medium text-left transition-colors ${
                              settleWallet === w.id
                                ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 font-semibold'
                                : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                          >
                            {w.nombre}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={abonoVal <= 0}
                      onClick={() => {
                        settleCreditSale(settlingSale.id, settleWallet, abonoVal);
                        setSettlingSale(null);
                      }}
                      className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
                    >
                      Confirmar {abonoVal >= remaining - 0.01 ? 'Finiquito' : 'Abono'} en{' '}
                      {getWalletName(settleWallet)}
                    </button>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal in POS (Point 2) */}
      <BarcodeScannerModal
        open={scannerOpen}
        title="Escanear para Agregar al Ticket"
        onClose={() => setScannerOpen(false)}
        onDetected={handleBarcodeDetected}
      />
    </div>
  );
};
