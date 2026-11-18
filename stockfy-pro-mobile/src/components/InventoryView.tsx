import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  Download,
  Edit3,
  PackagePlus,
  Plus,
  ScanBarcode,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useStockfy } from '../context/StockfyContext';
import type { Product, ProductUnit, WalletId } from '../types/stockfy';
import { exportInventoryCsv } from '../utils/csvExport';
import { WALLETS, formatQty, formatUSD, formatVES, round2, round3 } from '../utils/formatters';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { CatalogExportModal } from './CatalogExportModal';

const UNIT_OPTIONS: Array<{ id: ProductUnit; label: string }> = [
  { id: 'u', label: 'Unidad (u.)' },
  { id: 'kg', label: 'Kilogramo (kg)' },
  { id: 'L', label: 'Litro (L)' },
  { id: 'm', label: 'Metro (m)' },
];

export const InventoryView: React.FC = () => {
  const {
    state,
    metrics,
    isCashierLocked,
    addProduct,
    updateProduct,
    restockProduct,
    deleteProduct,
    showToast,
  } = useStockfy();

  const rate = state.rates.activeRate;
  const canScan = state.features.enableScannerAndShare;
  const canExportCatalog = state.features.enablePublicCatalogExport;

  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<'todos' | 'bajo' | 'agotado'>('todos');
  const [categoryFilter, setCategoryFilter] = useState<string>('Todas');

  // Scanner & Public Catalog Modals
  const [scannerTarget, setScannerTarget] = useState<'search' | 'form' | null>(null);
  const [catalogModalOpen, setCatalogModalOpen] = useState(false);

  // Product Form Modal State
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [sku, setSku] = useState('');
  const [categoria, setCategoria] = useState('');
  const [unidad, setUnidad] = useState<ProductUnit>('u');
  const [stock, setStock] = useState('10');
  const [costInputCurrency, setCostInputCurrency] = useState<'USD' | 'VES'>('USD');
  const [costoInput, setCostoInput] = useState('1.00');
  const [margenPct, setMargenPct] = useState('30');
  const [precioUSD, setPrecioUSD] = useState('1.30');
  const [descontarCaja, setDescontarCaja] = useState(false);
  const [walletId, setWalletId] = useState<WalletId>('efectivo_usd');

  // Bulk Box (Bulto) mode on Create Product
  const [bulkModeCreate, setBulkModeCreate] = useState(false);
  const [bulkBoxesCreate, setBulkBoxesCreate] = useState('1');
  const [bulkUnitsPerBoxCreate, setBulkUnitsPerBoxCreate] = useState('12');
  const [bulkBoxCostUSDCreate, setBulkBoxCostUSDCreate] = useState('12.00');

  // Restock Sheet State
  const [restockTarget, setRestockTarget] = useState<Product | null>(null);
  const [restockQty, setRestockQty] = useState('10');
  const [restockCost, setRestockCost] = useState('');
  const [restockDeduct, setRestockDeduct] = useState(true);
  const [restockWallet, setRestockWallet] = useState<WalletId>('efectivo_usd');
  const [restockBulkMode, setRestockBulkMode] = useState(false);
  const [restockBoxes, setRestockBoxes] = useState('1');
  const [restockUnitsPerBox, setRestockUnitsPerBox] = useState('12');
  const [restockBoxCostUSD, setRestockBoxCostUSD] = useState('');

  const computedCostUSD = useMemo(() => {
    const raw = parseFloat(costoInput);
    if (!Number.isFinite(raw) || raw < 0) return 0;
    return costInputCurrency === 'USD' ? round2(raw) : round2(raw / rate);
  }, [costoInput, costInputCurrency, rate]);

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
      if (stockFilter === 'bajo' && p.stock > 10) return false;
      if (stockFilter === 'agotado' && p.stock !== 0) return false;
      const prodCat = p.categoria?.trim() || 'General';
      if (categoryFilter !== 'Todas' && prodCat !== categoryFilter) return false;
      if (!q) return true;
      return (
        p.nombre.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.categoria && p.categoria.toLowerCase().includes(q))
      );
    });
  }, [state.products, search, stockFilter, categoryFilter]);

  const syncPriceFromCostAndMargin = (costUsdVal: number, marginVal: number) => {
    if (Number.isFinite(costUsdVal) && costUsdVal >= 0 && Number.isFinite(marginVal)) {
      setPrecioUSD(round2(costUsdVal * (1 + marginVal / 100)).toFixed(2));
    }
  };

  const openCreateModal = () => {
    setEditingId(null);
    setNombre('');
    setSku('');
    setCategoria('General');
    setUnidad('u');
    setStock('1');
    setCostInputCurrency('USD');
    setCostoInput('1.00');
    setMargenPct('30');
    setPrecioUSD('1.30');
    setDescontarCaja(false);
    setWalletId('efectivo_usd');
    setBulkModeCreate(false);
    setBulkBoxesCreate('1');
    setBulkUnitsPerBoxCreate('12');
    setBulkBoxCostUSDCreate('12.00');
    setFormOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingId(p.id);
    setNombre(p.nombre);
    setSku(p.sku || '');
    setCategoria(p.categoria || 'General');
    setUnidad(p.unidad || 'u');
    setStock(String(p.stock));
    setCostInputCurrency('USD');
    setCostoInput(String(p.costoUSD));
    setMargenPct(String(p.margenPct));
    setPrecioUSD(String(p.precioUSD));
    setDescontarCaja(false);
    setBulkModeCreate(false);
    setFormOpen(true);
  };

  const applyCreateBulkCalculation = (boxesStr: string, unitsStr: string, boxCostStr: string) => {
    const boxes = parseFloat(boxesStr) || 0;
    const perBox = parseFloat(unitsStr) || 0;
    const boxCost = parseFloat(boxCostStr) || 0;
    const totalStock = round3(Math.max(0, boxes * perBox));
    const unitCost = perBox > 0 ? round2(boxCost / perBox) : 0;
    setStock(String(totalStock));
    setCostInputCurrency('USD');
    setCostoInput(unitCost.toFixed(2));
    const m = parseFloat(margenPct);
    syncPriceFromCostAndMargin(unitCost, m);
  };

  const handleCostChange = (val: string) => {
    setCostoInput(val);
    const raw = parseFloat(val);
    const cUsd =
      Number.isFinite(raw) && raw >= 0
        ? costInputCurrency === 'USD'
          ? raw
          : raw / rate
        : NaN;
    const m = parseFloat(margenPct);
    syncPriceFromCostAndMargin(cUsd, m);
  };

  const handleCurrencyToggle = (nextCurr: 'USD' | 'VES') => {
    if (nextCurr === costInputCurrency) return;
    const currentUsd = computedCostUSD;
    setCostInputCurrency(nextCurr);
    if (currentUsd > 0) {
      setCostoInput(
        nextCurr === 'USD' ? currentUsd.toFixed(2) : round2(currentUsd * rate).toFixed(2)
      );
    }
  };

  const handleMarginChange = (val: string) => {
    setMargenPct(val);
    const m = parseFloat(val);
    syncPriceFromCostAndMargin(computedCostUSD, m);
  };

  const handlePriceChange = (val: string) => {
    setPrecioUSD(val);
    const c = computedCostUSD;
    const p = parseFloat(val);
    if (Number.isFinite(c) && c > 0 && Number.isFinite(p) && p >= 0) {
      setMargenPct(round2(((p - c) / c) * 100).toFixed(2));
    }
  };

  const handleSubmitProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = nombre.trim();
    const numStock = parseFloat(stock);
    const numCost = computedCostUSD;
    const numMargin = parseFloat(margenPct);
    const numPrice = parseFloat(precioUSD);

    if (!cleanName) {
      showToast('El nombre del producto es obligatorio');
      return;
    }
    if (!Number.isFinite(numCost) || numCost < 0 || !Number.isFinite(numPrice) || numPrice < 0) {
      showToast('Verifica costo y precio de venta válidos');
      return;
    }

    if (editingId) {
      updateProduct(editingId, {
        nombre: cleanName,
        sku: sku.trim() || undefined,
        categoria: categoria.trim() || 'General',
        unidad,
        stock: Number.isFinite(numStock) ? Math.max(0, round3(numStock)) : 0,
        costoUSD: round2(numCost),
        margenPct: Number.isFinite(numMargin) ? round2(numMargin) : 0,
        precioUSD: round2(numPrice),
      });
    } else {
      addProduct({
        nombre: cleanName,
        sku: sku.trim() || undefined,
        categoria: categoria.trim() || 'General',
        unidad,
        stock: Number.isFinite(numStock) ? Math.max(0, round3(numStock)) : 0,
        costoUSD: round2(numCost),
        margenPct: Number.isFinite(numMargin) ? round2(numMargin) : 0,
        precioUSD: round2(numPrice),
        descontarDeCaja: descontarCaja,
        monederoId: walletId,
      });
    }
    setFormOpen(false);
  };

  const openRestockModal = (p: Product) => {
    setRestockTarget(p);
    setRestockQty('10');
    setRestockCost(String(p.costoUSD));
    setRestockDeduct(true);
    setRestockBulkMode(false);
    setRestockBoxes('1');
    setRestockUnitsPerBox('12');
    setRestockBoxCostUSD(round2(p.costoUSD * 12).toFixed(2));
  };

  const applyRestockBulkCalculation = (boxesStr: string, unitsStr: string, boxCostStr: string) => {
    const boxes = parseFloat(boxesStr) || 0;
    const perBox = parseFloat(unitsStr) || 0;
    const boxCost = parseFloat(boxCostStr) || 0;
    const totalQty = round3(Math.max(0, boxes * perBox));
    const unitCost = perBox > 0 ? round2(boxCost / perBox) : 0;
    setRestockQty(String(totalQty));
    setRestockCost(unitCost.toFixed(2));
  };

  const handleConfirmRestock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockTarget) return;
    const qty = parseFloat(restockQty);
    const cost = parseFloat(restockCost);
    if (!Number.isFinite(qty) || qty <= 0) {
      showToast('Ingresa una cantidad mayor a 0');
      return;
    }
    restockProduct({
      productId: restockTarget.id,
      cantidad: round3(qty),
      nuevoCostoUSD: Number.isFinite(cost) && cost >= 0 ? cost : undefined,
      descontarDeCaja: restockDeduct,
      monederoId: restockWallet,
    });
    setRestockTarget(null);
  };

  const parsedPricePreview = parseFloat(precioUSD) || 0;
  const parsedMarginPreview = parseFloat(margenPct) || 0;

  return (
    <div className="space-y-6">
      {/* Inventory Valuation Header Strip (Protected in Cashier Mode) */}
      {!isCashierLocked && (
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Valor en Costo de Adquisición
            </p>
            <p className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
              {formatUSD(metrics.valorInventarioCostoUSD)}
            </p>
            <p className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
              {formatVES(metrics.valorInventarioCostoUSD, rate)}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Valor Proyectado de Venta
            </p>
            <p className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
              {formatUSD(metrics.valorInventarioVentaUSD)}
            </p>
            <p className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
              {formatVES(metrics.valorInventarioVentaUSD, rate)}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Ganancia Neta Proyectada
            </p>
            <p className="text-xl font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
              {formatUSD(metrics.gananciaPotencialInventarioUSD)}
            </p>
            <p className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
              {formatVES(metrics.gananciaPotencialInventarioUSD, rate)}
            </p>
          </div>
        </section>
      )}

      {/* Search + Filter + Primary Action */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex gap-2 flex-1">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar producto, categoría o código de barras..."
                className="w-full min-h-[44px] pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
              />
            </div>

            {canScan && (
              <button
                type="button"
                onClick={() => setScannerTarget('search')}
                title="Escanear código con cámara"
                className="min-h-[44px] min-w-[44px] px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center shrink-0"
                aria-label="Escanear código de barras"
              >
                <ScanBarcode className="w-5 h-5" />
              </button>
            )}
          </div>

          <div className="inline-flex p-1 bg-slate-200/70 dark:bg-slate-800 rounded-xl self-start">
            {(
              [
                { id: 'todos', label: 'Todos' },
                { id: 'bajo', label: 'Stock Bajo' },
                { id: 'agotado', label: 'Agotados' },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStockFilter(f.id)}
                className={`min-h-[36px] px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                  stockFilter === f.id
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {canExportCatalog && state.products.length > 0 && (
              <button
                type="button"
                onClick={() => setCatalogModalOpen(true)}
                className="min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
              >
                <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Catálogo Clientes</span>
              </button>
            )}

            {state.products.length > 0 && !isCashierLocked && (
              <button
                type="button"
                onClick={() => {
                  exportInventoryCsv(state);
                  showToast('CSV de inventario descargado');
                }}
                className="min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
              >
                <Download className="w-4 h-4" />
                <span>Exportar CSV</span>
              </button>
            )}

            {!isCashierLocked && (
              <button
                type="button"
                onClick={openCreateModal}
                className="flex-1 md:flex-none min-h-[44px] px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>Nuevo Producto</span>
              </button>
            )}
          </div>
        </div>

        {categories.length > 2 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  categoryFilter === cat
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

      {/* Product List / Desktop Table */}
      {state.products.length === 0 ? (
        <div className="p-10 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3">
          <p className="text-base font-semibold text-slate-800 dark:text-white">
            Tu catálogo está vacío
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Registra tus productos con costo, porcentaje de ganancia, unidad de medida (unidad, kg,
            litro o metro) y stock inicial.
          </p>
          {!isCashierLocked && (
            <button
              type="button"
              onClick={openCreateModal}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700"
            >
              Agregar Primer Producto
            </button>
          )}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
          No hay productos que coincidan con este filtro.
        </div>
      ) : (
        <>
          {/* Desktop Data Table */}
          <div className="hidden md:block rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-semibold text-slate-600 dark:text-slate-400">
                  <th className="py-3 px-4">Producto / SKU opcional</th>
                  <th className="py-3 px-4 text-right">Stock</th>
                  {!isCashierLocked && <th className="py-3 px-4 text-right">Costo ($ / Bs)</th>}
                  {!isCashierLocked && <th className="py-3 px-4 text-right">Margen</th>}
                  <th className="py-3 px-4 text-right">Venta ($ / Bs)</th>
                  {!isCashierLocked && <th className="py-3 px-4 text-right">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {filteredProducts.map((p) => {
                  const unitProfit = round2(p.precioUSD - p.costoUSD);
                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-900 dark:text-white">{p.nombre}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {p.categoria || 'General'}
                          {p.sku ? ` · SKU ${p.sku}` : ' · Sin código'}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        <span
                          className={`font-semibold ${
                            p.stock === 0
                              ? 'text-red-600 dark:text-red-400'
                              : p.stock <= 10
                              ? 'text-amber-700 dark:text-amber-400'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {formatQty(p.stock, p.unidad)}
                        </span>
                      </td>
                      {!isCashierLocked && (
                        <td className="py-3 px-4 text-right font-mono tabular-nums">
                          <p className="text-slate-900 dark:text-slate-100">
                            {formatUSD(p.costoUSD)}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {formatVES(p.costoUSD, rate)}
                          </p>
                        </td>
                      )}
                      {!isCashierLocked && (
                        <td className="py-3 px-4 text-right font-mono tabular-nums">
                          <p className="text-emerald-700 dark:text-emerald-400 font-semibold">
                            +{p.margenPct.toFixed(1)}%
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            +{formatUSD(unitProfit)}
                          </p>
                        </td>
                      )}
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        <p className="font-bold text-slate-900 dark:text-white">
                          {formatUSD(p.precioUSD)}
                          {p.unidad && p.unidad !== 'u' ? ` /${p.unidad}` : ''}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {formatVES(p.precioUSD, rate)}
                        </p>
                      </td>
                      {!isCashierLocked && (
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openRestockModal(p)}
                              className="min-h-[38px] px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1 whitespace-nowrap"
                            >
                              <PackagePlus className="w-3.5 h-3.5" />
                              <span>Reponer</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditModal(p)}
                              className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                              aria-label={`Editar ${p.nombre}`}
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteProduct(p.id)}
                              className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
                              aria-label={`Eliminar ${p.nombre}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List */}
          <div className="md:hidden space-y-3">
            {filteredProducts.map((p) => (
              <div
                key={p.id}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {p.nombre}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {p.categoria || 'General'}
                      {p.sku ? ` · SKU ${p.sku}` : ''}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-mono tabular-nums font-bold shrink-0 ${
                      p.stock === 0
                        ? 'text-red-600 dark:text-red-400'
                        : p.stock <= 10
                        ? 'text-amber-700 dark:text-amber-400'
                        : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {formatQty(p.stock, p.unidad)}
                  </span>
                </div>

                <div
                  className={`grid gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs font-mono tabular-nums ${
                    isCashierLocked ? 'grid-cols-1' : 'grid-cols-2'
                  }`}
                >
                  {!isCashierLocked && (
                    <div>
                      <p className="text-slate-500 dark:text-slate-400 font-sans">Costo</p>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">
                        {formatUSD(p.costoUSD)}
                      </p>
                      <p className="text-slate-500 dark:text-slate-400">
                        {formatVES(p.costoUSD, rate)}
                      </p>
                    </div>
                  )}
                  <div className={isCashierLocked ? 'flex items-baseline justify-between' : 'text-right'}>
                    <p className="text-slate-500 dark:text-slate-400 font-sans">
                      Venta {!isCashierLocked ? `(+${p.margenPct.toFixed(0)}%)` : ''}
                    </p>
                    <div className={isCashierLocked ? 'text-right' : ''}>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {formatUSD(p.precioUSD)}
                        {p.unidad && p.unidad !== 'u' ? ` /${p.unidad}` : ''}
                      </p>
                      <p className="text-emerald-700 dark:text-emerald-400">
                        {formatVES(p.precioUSD, rate)}
                      </p>
                    </div>
                  </div>
                </div>

                {!isCashierLocked && (
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => openRestockModal(p)}
                      className="flex-1 min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-1.5"
                    >
                      <PackagePlus className="w-4 h-4" />
                      <span>Reponer Lote</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditModal(p)}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                      aria-label="Editar producto"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteProduct(p.id)}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
                      aria-label="Eliminar producto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Add / Edit Product Modal */}
      {formOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-xs p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full sm:max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden max-h-[92dvh] flex flex-col">
            <div className="sm:hidden w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mt-3 mb-1 shrink-0" />
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                {editingId ? 'Editar Producto' : 'Registrar Producto'}
              </h3>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitProduct} className="overflow-y-auto p-5 space-y-4 pb-safe">
              <div>
                <label
                  htmlFor="prod-name"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                >
                  Nombre del producto *
                </label>
                <input
                  id="prod-name"
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. Arroz Blanco 1kg / Queso Duro"
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label
                    htmlFor="prod-sku"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                  >
                    SKU / Código
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      id="prod-sku"
                      type="text"
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                      placeholder="Opcional"
                      className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
                    />
                    {canScan && (
                      <button
                        type="button"
                        onClick={() => setScannerTarget('form')}
                        title="Escanear código con cámara"
                        className="min-h-[44px] min-w-[40px] px-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center shrink-0"
                        aria-label="Escanear código para SKU"
                      >
                        <ScanBarcode className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="prod-cat"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Categoría
                  </label>
                  <input
                    id="prod-cat"
                    type="text"
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    placeholder="Víveres..."
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label
                    htmlFor="prod-unit"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Unidad de Venta
                  </label>
                  <select
                    id="prod-unit"
                    value={unidad}
                    onChange={(e) => setUnidad(e.target.value as ProductUnit)}
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                  >
                    {UNIT_OPTIONS.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {!editingId && (
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-2.5">
                  <label className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
                    <span>¿Compraste por Bulto / Caja? (Calcula unidades y costo unitario)</span>
                    <input
                      type="checkbox"
                      checked={bulkModeCreate}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setBulkModeCreate(checked);
                        if (checked) {
                          applyCreateBulkCalculation(
                            bulkBoxesCreate,
                            bulkUnitsPerBoxCreate,
                            bulkBoxCostUSDCreate
                          );
                        }
                      }}
                      className="w-4 h-4 rounded accent-emerald-600"
                    />
                  </label>

                  {bulkModeCreate && (
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <div>
                        <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-0.5">
                          Bultos / Cajas
                        </label>
                        <input
                          type="number"
                          min="0.1"
                          step="any"
                          value={bulkBoxesCreate}
                          onChange={(e) => {
                            setBulkBoxesCreate(e.target.value);
                            applyCreateBulkCalculation(
                              e.target.value,
                              bulkUnitsPerBoxCreate,
                              bulkBoxCostUSDCreate
                            );
                          }}
                          className="w-full min-h-[38px] px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-0.5">
                          {unidad === 'u' ? 'Unid. x bulto' : `${unidad} x bulto`}
                        </label>
                        <input
                          type="number"
                          min="0.1"
                          step="any"
                          value={bulkUnitsPerBoxCreate}
                          onChange={(e) => {
                            setBulkUnitsPerBoxCreate(e.target.value);
                            applyCreateBulkCalculation(
                              bulkBoxesCreate,
                              e.target.value,
                              bulkBoxCostUSDCreate
                            );
                          }}
                          className="w-full min-h-[38px] px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-0.5">
                          Costo bulto ($)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={bulkBoxCostUSDCreate}
                          onChange={(e) => {
                            setBulkBoxCostUSDCreate(e.target.value);
                            applyCreateBulkCalculation(
                              bulkBoxesCreate,
                              bulkUnitsPerBoxCreate,
                              e.target.value
                            );
                          }}
                          className="w-full min-h-[38px] px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label
                    htmlFor="prod-stock"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Stock ({unidad}) *
                  </label>
                  <input
                    id="prod-stock"
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono tabular-nums text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label
                      htmlFor="prod-cost"
                      className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                    >
                      Costo *
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        handleCurrencyToggle(costInputCurrency === 'USD' ? 'VES' : 'USD')
                      }
                      className="text-[11px] font-mono font-semibold text-emerald-700 dark:text-emerald-400"
                    >
                      {costInputCurrency === 'USD' ? 'En $' : 'En Bs'}
                    </button>
                  </div>
                  <input
                    id="prod-cost"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={costoInput}
                    onChange={(e) => handleCostChange(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono tabular-nums text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label
                    htmlFor="prod-margin"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    % Ganancia
                  </label>
                  <input
                    id="prod-margin"
                    type="number"
                    step="0.1"
                    value={margenPct}
                    onChange={(e) => handleMarginChange(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono tabular-nums text-emerald-700 dark:text-emerald-400 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
                  />
                </div>
              </div>

              {/* Quick Margin Presets */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  Márgenes rápidos:
                </span>
                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  {['20', '30', '50', '100'].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handleMarginChange(pct)}
                      className={`min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-mono tabular-nums font-semibold transition-colors ${
                        margenPct === pct
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      +{pct}%
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label
                  htmlFor="prod-price"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                >
                  Precio de Venta Sugerido ($ por {unidad})
                </label>
                <input
                  id="prod-price"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={precioUSD}
                  onChange={(e) => handlePriceChange(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-base font-bold font-mono tabular-nums text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
                />
              </div>

              {/* Dual Live Preview */}
              <div className="p-3.5 rounded-xl bg-slate-900 dark:bg-slate-950 border border-slate-800 text-white grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-slate-400">Precio en Bolívares</p>
                  <p className="text-sm font-bold font-mono tabular-nums text-emerald-400 mt-0.5">
                    {formatVES(parsedPricePreview, rate)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-slate-400">Utilidad por {unidad}</p>
                  <p className="text-sm font-bold font-mono tabular-nums mt-0.5">
                    {formatUSD(parsedPricePreview - computedCostUSD)} ({parsedMarginPreview.toFixed(1)}
                    %)
                  </p>
                </div>
              </div>

              {!editingId && (
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-2.5">
                  <label className="flex items-center gap-2.5 text-xs font-medium text-slate-800 dark:text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={descontarCaja}
                      onChange={(e) => setDescontarCaja(e.target.checked)}
                      className="w-4 h-4 rounded accent-emerald-600"
                    />
                    <span>
                      Descontar compra de mercancía de Caja Operativa (
                      {formatUSD((parseFloat(stock) || 0) * computedCostUSD)})
                    </span>
                  </label>

                  {descontarCaja && (
                    <select
                      value={walletId}
                      onChange={(e) => setWalletId(e.target.value as WalletId)}
                      className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                    >
                      {WALLETS.map((w) => (
                        <option key={w.id} value={w.id}>
                          Pagar desde: {w.nombre}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              <button
                type="submit"
                className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors"
              >
                {editingId ? 'Guardar Cambios' : 'Guardar Producto en Catálogo'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Restock Modal (Supports Bulk Box / Bulto) */}
      {restockTarget && (
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
                  Reponer Lote
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {restockTarget.nombre}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRestockTarget(null)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmRestock} className="p-5 space-y-4 pb-safe">
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-2.5">
                <label className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
                  <span>Ingresar por Bulto / Caja</span>
                  <input
                    type="checkbox"
                    checked={restockBulkMode}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setRestockBulkMode(checked);
                      if (checked) {
                        applyRestockBulkCalculation(
                          restockBoxes,
                          restockUnitsPerBox,
                          restockBoxCostUSD
                        );
                      }
                    }}
                    className="w-4 h-4 rounded accent-emerald-600"
                  />
                </label>

                {restockBulkMode && (
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div>
                      <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-0.5">
                        Bultos
                      </label>
                      <input
                        type="number"
                        min="0.1"
                        step="any"
                        value={restockBoxes}
                        onChange={(e) => {
                          setRestockBoxes(e.target.value);
                          applyRestockBulkCalculation(
                            e.target.value,
                            restockUnitsPerBox,
                            restockBoxCostUSD
                          );
                        }}
                        className="w-full min-h-[38px] px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-0.5">
                        Cant. x bulto
                      </label>
                      <input
                        type="number"
                        min="0.1"
                        step="any"
                        value={restockUnitsPerBox}
                        onChange={(e) => {
                          setRestockUnitsPerBox(e.target.value);
                          applyRestockBulkCalculation(
                            restockBoxes,
                            e.target.value,
                            restockBoxCostUSD
                          );
                        }}
                        className="w-full min-h-[38px] px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-0.5">
                        Costo bulto ($)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={restockBoxCostUSD}
                        onChange={(e) => {
                          setRestockBoxCostUSD(e.target.value);
                          applyRestockBulkCalculation(
                            restockBoxes,
                            restockUnitsPerBox,
                            e.target.value
                          );
                        }}
                        className="w-full min-h-[38px] px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="re-qty"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Cantidad ({restockTarget.unidad || 'u'})
                  </label>
                  <input
                    id="re-qty"
                    type="number"
                    min="0.01"
                    step="any"
                    required
                    value={restockQty}
                    onChange={(e) => setRestockQty(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono tabular-nums text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label
                    htmlFor="re-cost"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Costo unitario ($)
                  </label>
                  <input
                    id="re-cost"
                    type="number"
                    min="0"
                    step="0.01"
                    value={restockCost}
                    onChange={(e) => setRestockCost(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono tabular-nums text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-2.5">
                <label className="flex items-center gap-2.5 text-xs font-medium text-slate-800 dark:text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={restockDeduct}
                    onChange={(e) => setRestockDeduct(e.target.checked)}
                    className="w-4 h-4 rounded accent-emerald-600"
                  />
                  <span>
                    Descontar inversión de Caja (
                    {formatUSD((parseFloat(restockQty) || 0) * (parseFloat(restockCost) || 0))})
                  </span>
                </label>

                {restockDeduct && (
                  <select
                    value={restockWallet}
                    onChange={(e) => setRestockWallet(e.target.value as WalletId)}
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                  >
                    {WALLETS.map((w) => (
                      <option key={w.id} value={w.id}>
                        Pagar desde: {w.nombre}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <button
                type="submit"
                className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors"
              >
                Confirmar Ingreso de Mercancía
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal (Point 2) */}
      <BarcodeScannerModal
        open={scannerTarget !== null}
        title={
          scannerTarget === 'form'
            ? 'Escanear Código para Producto'
            : 'Buscar Producto por Código'
        }
        onClose={() => setScannerTarget(null)}
        onDetected={(code) => {
          if (scannerTarget === 'form') {
            setSku(code);
            showToast(`Código asignado: ${code}`);
          } else {
            setSearch(code);
            showToast(`Buscando código: ${code}`);
          }
        }}
      />

      {/* Customer Catalog Export Modal (Point 6) */}
      <CatalogExportModal
        open={catalogModalOpen}
        onClose={() => setCatalogModalOpen(false)}
      />
    </div>
  );
};
