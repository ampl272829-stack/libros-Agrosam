import React, { useMemo, useState } from 'react';
import { Copy, Printer, Share2, X } from 'lucide-react';
import { useStockfy } from '../context/StockfyContext';
import { formatRate, formatUSD, formatVES, shareOrCopyText } from '../utils/formatters';

interface CatalogExportModalProps {
  open: boolean;
  onClose: () => void;
}

export const CatalogExportModal: React.FC<CatalogExportModalProps> = ({ open, onClose }) => {
  const { state, showToast } = useStockfy();
  const rate = state.rates.activeRate;

  const [onlyAvailable, setOnlyAvailable] = useState(true);
  const [priceDisplay, setPriceDisplay] = useState<'both' | 'usd' | 'ves'>('both');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of state.products) {
      set.add(p.categoria?.trim() || 'General');
    }
    return ['Todas', ...Array.from(set).sort((a, b) => a.localeCompare(b, 'es'))];
  }, [state.products]);

  const catalogProducts = useMemo(() => {
    return state.products.filter((p) => {
      if (onlyAvailable && p.stock <= 0) return false;
      const cat = p.categoria?.trim() || 'General';
      if (selectedCategory !== 'Todas' && cat !== selectedCategory) return false;
      return true;
    });
  }, [state.products, onlyAvailable, selectedCategory]);

  const groupedByCategory = useMemo(() => {
    const map = new Map<string, typeof catalogProducts>();
    for (const p of catalogProducts) {
      const cat = p.categoria?.trim() || 'General';
      const list = map.get(cat) || [];
      list.push(p);
      map.set(cat, list);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], 'es'));
  }, [catalogProducts]);

  const whatsappCatalogText = useMemo(() => {
    const lines: string[] = [
      `*LISTA DE PRECIOS — ${state.store.nombreComercio.toUpperCase()}*`,
      state.store.telefono ? `Pedidos / WhatsApp: ${state.store.telefono}` : '',
      `Precios actualizados · Tasa ref.: ${formatRate(rate)}`,
      `--------------------------------`,
    ].filter(Boolean);

    for (const [cat, items] of groupedByCategory) {
      lines.push('');
      lines.push(`*${cat.toUpperCase()}*`);
      for (const p of items) {
        const unitLabel = p.unidad && p.unidad !== 'u' ? ` / ${p.unidad}` : '';
        const priceParts =
          priceDisplay === 'usd'
            ? formatUSD(p.precioUSD)
            : priceDisplay === 'ves'
            ? formatVES(p.precioUSD, rate)
            : `${formatUSD(p.precioUSD)} (${formatVES(p.precioUSD, rate)})`;
        lines.push(`• ${p.nombre}${unitLabel}: *${priceParts}*`);
      }
    }

    if (catalogProducts.length === 0) {
      lines.push('Sin productos disponibles en esta selección.');
    }

    return lines.join('\n');
  }, [
    state.store.nombreComercio,
    state.store.telefono,
    rate,
    groupedByCategory,
    priceDisplay,
    catalogProducts.length,
  ]);

  if (!open) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(whatsappCatalogText);
      showToast('Catálogo copiado para WhatsApp');
    } catch {
      showToast('No se pudo copiar al portapapeles');
    }
  };

  const handleShare = async () => {
    const res = await shareOrCopyText(
      `Lista de Precios — ${state.store.nombreComercio}`,
      whatsappCatalogText
    );
    if (res === 'shared') showToast('Catálogo compartido');
    else if (res === 'copied') showToast('Catálogo copiado para enviar por WhatsApp');
    else showToast('No se pudo compartir');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-xs p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full sm:max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden max-h-[92dvh] flex flex-col">
        <div className="sm:hidden w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mt-3 mb-1 shrink-0" />

        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Catálogo de Precios para Clientes
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {catalogProducts.length} productos · Precios sin costos internos
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Cerrar catálogo"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="cat-filter-export"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                Categoría
              </label>
              <select
                id="cat-filter-export"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full min-h-[40px] px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <p className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Moneda a mostrar
              </p>
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-[11px] font-semibold">
                {(
                  [
                    { id: 'both', label: '$ y Bs' },
                    { id: 'usd', label: 'Solo $' },
                    { id: 'ves', label: 'Solo Bs' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setPriceDisplay(opt.id)}
                    className={`py-1.5 rounded-lg transition-colors ${
                      priceDisplay === opt.id
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={onlyAvailable}
              onChange={(e) => setOnlyAvailable(e.target.checked)}
              className="w-4 h-4 rounded accent-emerald-600"
            />
            <span>Mostrar solo productos con existencia en stock</span>
          </label>

          {/* Printable / Visual Preview Card */}
          <div
            id="printable-receipt"
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 space-y-3"
          >
            <div className="text-center border-b border-dashed border-slate-300 dark:border-slate-700 pb-2.5">
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                {state.store.nombreComercio}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                Lista de Precios · Tasa {formatRate(rate)}
                {state.store.telefono ? ` · Tel ${state.store.telefono}` : ''}
              </p>
            </div>

            {groupedByCategory.length === 0 ? (
              <p className="text-xs text-center text-slate-500 dark:text-slate-400 py-4">
                No hay productos para mostrar en el catálogo.
              </p>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {groupedByCategory.map(([cat, items]) => (
                  <div key={cat} className="space-y-1.5">
                    <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                      {cat}
                    </p>
                    <div className="divide-y divide-slate-200/70 dark:divide-slate-800">
                      {items.map((p) => (
                        <div
                          key={p.id}
                          className="py-1.5 flex items-baseline justify-between gap-3 text-xs"
                        >
                          <span className="text-slate-800 dark:text-slate-200 font-medium">
                            {p.nombre}
                            {p.unidad && p.unidad !== 'u' ? ` (/${p.unidad})` : ''}
                          </span>
                          <span className="font-mono tabular-nums font-bold text-slate-900 dark:text-white shrink-0">
                            {priceDisplay === 'usd'
                              ? formatUSD(p.precioUSD)
                              : priceDisplay === 'ves'
                              ? formatVES(p.precioUSD, rate)
                              : `${formatUSD(p.precioUSD)} · ${formatVES(p.precioUSD, rate)}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 grid grid-cols-3 gap-2 shrink-0 pb-safe">
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-1.5 whitespace-nowrap"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copiar</span>
          </button>
          <button
            type="button"
            onClick={() => void handleShare()}
            className="min-h-[44px] px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>WhatsApp</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="min-h-[44px] px-3 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir</span>
          </button>
        </div>
      </div>
    </div>
  );
};
