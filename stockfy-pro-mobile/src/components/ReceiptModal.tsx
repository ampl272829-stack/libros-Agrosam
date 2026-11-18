import React from 'react';
import { Download, Printer, Share2, X } from 'lucide-react';
import { useStockfy } from '../context/StockfyContext';
import {
  formatDateTime,
  formatQty,
  formatRate,
  formatUSD,
  formatVES,
  formatVESDirect,
  getWalletName,
  round2,
  shareOrCopyText,
} from '../utils/formatters';

export const ReceiptModal: React.FC = () => {
  const {
    state,
    selectedReceipt,
    setSelectedReceipt,
    selectedSaleReceipt,
    setSelectedSaleReceipt,
    showToast,
  } = useStockfy();

  if (!selectedReceipt && !selectedSaleReceipt) return null;

  const isExpense = Boolean(selectedReceipt);
  const canShare = state.features.enableScannerAndShare;

  const closeAll = () => {
    setSelectedReceipt(null);
    setSelectedSaleReceipt(null);
  };

  const handlePrint = () => {
    window.print();
  };

  const buildPlainText = (): string => {
    if (selectedReceipt) {
      return [
        '========================================',
        `       ${state.store.nombreComercio.toUpperCase()}`,
        state.store.rif ? `       RIF: ${state.store.rif}` : '',
        state.store.telefono ? `       Tel: ${state.store.telefono}` : '',
        '========================================',
        `COMPROBANTE DE EGRESO: ${selectedReceipt.numeroRecibo}`,
        `Fecha: ${formatDateTime(selectedReceipt.fecha)}`,
        `Tipo: ${selectedReceipt.origen === 'fijo' ? 'Pago Fijo / Nómina' : 'Gasto Extra'}`,
        `Categoría: ${selectedReceipt.categoria}`,
        '----------------------------------------',
        `Concepto: ${selectedReceipt.concepto}`,
        selectedReceipt.beneficiario ? `Beneficiario: ${selectedReceipt.beneficiario}` : '',
        `Monedero: ${getWalletName(selectedReceipt.monederoId)}`,
        selectedReceipt.notas ? `Notas: ${selectedReceipt.notas}` : '',
        '----------------------------------------',
        `MONTO USD:   ${formatUSD(selectedReceipt.montoUSD)}`,
        `MONTO BS:    ${formatVESDirect(selectedReceipt.montoVES)}`,
        `Tasa Ref.:   ${formatRate(selectedReceipt.tasaAplicada)}`,
        '========================================',
        '   Generado por Stockfy Pro Mobile',
        '========================================',
      ]
        .filter(Boolean)
        .join('\n');
    }

    if (selectedSaleReceipt) {
      const s = selectedSaleReceipt;
      const paid = round2(s.montoPagadoUSD ?? (s.tipo === 'contado' ? s.totalUSD : 0));
      const pending = round2(Math.max(0, s.totalUSD - paid));
      const paymentDesc =
        s.tipo === 'contado'
          ? s.pagos && s.pagos.length > 1
            ? `Pago Mixto: ${s.pagos
                .map((p) => `${getWalletName(p.monederoId)} (${formatUSD(p.montoUSD)})`)
                .join(' + ')}`
            : `Monedero: ${getWalletName(s.monederoId)}`
          : `Cliente: ${s.cliente || 'Cliente General'}`;

      return [
        '========================================',
        `       ${state.store.nombreComercio.toUpperCase()}`,
        state.store.rif ? `       RIF: ${state.store.rif}` : '',
        state.store.telefono ? `       Tel: ${state.store.telefono}` : '',
        '========================================',
        `NOTA DE VENTA: ${s.numeroFactura}`,
        `Fecha: ${formatDateTime(s.fecha)}`,
        `Modalidad: ${s.tipo === 'contado' ? 'Contado' : 'Crédito (Fiado)'}`,
        paymentDesc,
        '----------------------------------------',
        ...s.items.map(
          (it) =>
            `${formatQty(it.cantidad, it.unidad)} × ${it.nombre}  (${formatUSD(it.subtotalUSD)})`
        ),
        '----------------------------------------',
        s.descuentoUSD && s.descuentoUSD > 0 ? `DESCUENTO:   -${formatUSD(s.descuentoUSD)}` : '',
        `TOTAL USD:   ${formatUSD(s.totalUSD)}`,
        `TOTAL BS:    ${formatVESDirect(s.totalVES)}`,
        s.tipo === 'credito' ? `ABONADO:     ${formatUSD(paid)}` : '',
        s.tipo === 'credito' ? `PENDIENTE:   ${formatUSD(pending)}` : '',
        `Tasa Ref.:   ${formatRate(s.tasaAplicada)}`,
        '========================================',
        '   Documento administrativo interno',
        '========================================',
      ]
        .filter(Boolean)
        .join('\n');
    }

    return '';
  };

  const handleDownloadTicket = () => {
    const text = buildPlainText();
    if (!text) return;
    const filename = selectedReceipt
      ? `${selectedReceipt.numeroRecibo}.txt`
      : `${selectedSaleReceipt!.numeroFactura}.txt`;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Comprobante ${filename.replace('.txt', '')} descargado`);
  };

  const handleShare = async () => {
    const text = buildPlainText();
    if (!text) return;
    const doc = selectedReceipt
      ? selectedReceipt.numeroRecibo
      : selectedSaleReceipt!.numeroFactura;
    const res = await shareOrCopyText(`${state.store.nombreComercio} · ${doc}`, text);
    if (res === 'shared') showToast('Comprobante compartido');
    else if (res === 'copied') showToast('Comprobante copiado para enviar por WhatsApp');
    else showToast('No se pudo compartir');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-xs p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="receipt-modal-title"
    >
      <div className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden max-h-[92dvh] flex flex-col">
        <div className="sm:hidden w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mt-3 mb-1 shrink-0" />

        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div>
            <h2
              id="receipt-modal-title"
              className="text-base font-semibold text-slate-900 dark:text-slate-100"
            >
              {isExpense ? 'Comprobante Digital de Egreso' : 'Ticket Digital de Venta'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              {selectedReceipt
                ? `${selectedReceipt.numeroRecibo} · ${formatDateTime(selectedReceipt.fecha)}`
                : selectedSaleReceipt
                ? `${selectedSaleReceipt.numeroFactura} · ${formatDateTime(
                    selectedSaleReceipt.fecha
                  )}`
                : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={closeAll}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Cerrar recibo"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-5 bg-slate-50 dark:bg-slate-950">
          <div
            id="printable-receipt"
            className="bg-white border border-slate-200 rounded-xl p-5 font-mono text-xs text-slate-800 space-y-4"
          >
            <div className="text-center border-b border-dashed border-slate-300 pb-3 space-y-1">
              <p className="text-sm font-bold text-slate-900 font-display tracking-tight">
                {state.store.nombreComercio}
              </p>
              {(state.store.rif || state.store.telefono) && (
                <p className="text-[11px] text-slate-500">
                  {[state.store.rif && `RIF ${state.store.rif}`, state.store.telefono]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              )}
              <p className="text-[11px] font-semibold text-slate-700 pt-1">
                {isExpense ? 'COMPROBANTE OFICIAL DE EGRESO' : 'NOTA DE ENTREGA / VENTA'}
              </p>
            </div>

            {selectedReceipt ? (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">Recibo Nro.</span>
                    <span className="font-semibold text-slate-900 tabular-nums">
                      {selectedReceipt.numeroRecibo}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">Fecha y hora</span>
                    <span className="text-slate-900 tabular-nums">
                      {formatDateTime(selectedReceipt.fecha)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">Clasificación</span>
                    <span className="text-slate-900 text-right">
                      {selectedReceipt.origen === 'fijo' ? 'Pago Fijo / Nómina' : 'Gasto Extra'} ·{' '}
                      {selectedReceipt.categoria}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">Monedero origen</span>
                    <span className="font-medium text-slate-900">
                      {getWalletName(selectedReceipt.monederoId)}
                    </span>
                  </div>
                  {selectedReceipt.beneficiario && (
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-500">Beneficiario</span>
                      <span className="text-slate-900 text-right">
                        {selectedReceipt.beneficiario}
                      </span>
                    </div>
                  )}
                </div>

                <div className="border-t border-b border-dashed border-slate-300 py-3 space-y-1">
                  <p className="text-[11px] text-slate-500">Concepto del egreso</p>
                  <p className="text-xs font-semibold text-slate-900 leading-relaxed">
                    {selectedReceipt.concepto}
                  </p>
                  {selectedReceipt.notas && (
                    <p className="text-[11px] text-slate-600 pt-1">{selectedReceipt.notas}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-baseline">
                    <span className="text-slate-600 font-medium">TOTAL EGRESO ($)</span>
                    <span className="text-lg font-bold text-slate-900 tabular-nums">
                      {formatUSD(selectedReceipt.montoUSD)}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-slate-500">Equivalente (Bs.)</span>
                    <span className="text-sm font-semibold text-slate-800 tabular-nums">
                      {formatVESDirect(selectedReceipt.montoVES)}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline text-[11px] text-slate-500 pt-1">
                    <span>Tasa aplicada</span>
                    <span className="tabular-nums">{formatRate(selectedReceipt.tasaAplicada)}</span>
                  </div>
                </div>
              </>
            ) : selectedSaleReceipt ? (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">Documento</span>
                    <span className="font-semibold text-slate-900 tabular-nums">
                      {selectedSaleReceipt.numeroFactura}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">Fecha</span>
                    <span className="text-slate-900 tabular-nums">
                      {formatDateTime(selectedSaleReceipt.fecha)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">Modalidad</span>
                    <span className="font-medium text-slate-900 text-right">
                      {selectedSaleReceipt.tipo === 'contado'
                        ? selectedSaleReceipt.pagos && selectedSaleReceipt.pagos.length > 1
                          ? 'Contado · Pago Mixto'
                          : `Contado · ${getWalletName(selectedSaleReceipt.monederoId)}`
                        : `Crédito · ${selectedSaleReceipt.cliente || 'Cliente'}`}
                    </span>
                  </div>
                  {selectedSaleReceipt.pagos && selectedSaleReceipt.pagos.length > 1 && (
                    <div className="pt-1 space-y-1 text-[11px] text-slate-600">
                      {selectedSaleReceipt.pagos.map((p, idx) => (
                        <div key={`${p.monederoId}-${idx}`} className="flex justify-between">
                          <span>{getWalletName(p.monederoId)}</span>
                          <span className="tabular-nums font-semibold">
                            {formatUSD(p.montoUSD)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t border-b border-dashed border-slate-300 py-3 space-y-2">
                  <p className="text-[11px] text-slate-500">Detalle de artículos</p>
                  {selectedSaleReceipt.items.map((it) => (
                    <div key={it.productId} className="flex justify-between gap-2">
                      <span className="text-slate-900">
                        {formatQty(it.cantidad, it.unidad)} × {it.nombre}
                      </span>
                      <span className="font-semibold text-slate-900 tabular-nums shrink-0">
                        {formatUSD(it.subtotalUSD)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="space-y-1.5">
                  {selectedSaleReceipt.descuentoUSD && selectedSaleReceipt.descuentoUSD > 0 ? (
                    <div className="flex justify-between items-baseline text-[11px] text-slate-600">
                      <span>Descuento aplicado</span>
                      <span className="tabular-nums font-semibold">
                        -{formatUSD(selectedSaleReceipt.descuentoUSD)}
                      </span>
                    </div>
                  ) : null}
                  <div className="flex justify-between items-baseline">
                    <span className="text-slate-600 font-medium">TOTAL ($)</span>
                    <span className="text-lg font-bold text-slate-900 tabular-nums">
                      {formatUSD(selectedSaleReceipt.totalUSD)}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-slate-500">Equivalente (Bs.)</span>
                    <span className="text-sm font-semibold text-slate-800 tabular-nums">
                      {formatVESDirect(selectedSaleReceipt.totalVES)}
                    </span>
                  </div>
                  {selectedSaleReceipt.tipo === 'credito' && (
                    <>
                      <div className="flex justify-between items-baseline text-[11px] text-emerald-700 pt-1">
                        <span>Abonado a la fecha</span>
                        <span className="tabular-nums font-semibold">
                          {formatUSD(selectedSaleReceipt.montoPagadoUSD || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between items-baseline text-[11px] text-amber-700">
                        <span>Saldo pendiente</span>
                        <span className="tabular-nums font-semibold">
                          {formatUSD(
                            Math.max(
                              0,
                              selectedSaleReceipt.totalUSD -
                                (selectedSaleReceipt.montoPagadoUSD || 0)
                            )
                          )}{' '}
                          ({formatVES(
                            Math.max(
                              0,
                              selectedSaleReceipt.totalUSD -
                                (selectedSaleReceipt.montoPagadoUSD || 0)
                            ),
                            state.rates.activeRate
                          )})
                        </span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between items-baseline text-[11px] text-slate-500 pt-1">
                    <span>Tasa aplicada</span>
                    <span className="tabular-nums">
                      {formatRate(selectedSaleReceipt.tasaAplicada)}
                    </span>
                  </div>
                </div>
              </>
            ) : null}

            <div className="border-t border-dashed border-slate-300 pt-3 text-center text-[11px] text-slate-400">
              Documento administrativo interno · Stockfy Pro
            </div>
          </div>
        </div>

        <div
          className={`p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 grid gap-2 shrink-0 pb-safe ${
            canShare ? 'grid-cols-3' : 'grid-cols-2'
          }`}
        >
          <button
            type="button"
            onClick={handleDownloadTicket}
            className="min-h-[44px] px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs sm:text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            <span>Guardar</span>
          </button>
          {canShare && (
            <button
              type="button"
              onClick={() => void handleShare()}
              className="min-h-[44px] px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-medium transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <Share2 className="w-4 h-4" />
              <span>WhatsApp</span>
            </button>
          )}
          <button
            type="button"
            onClick={handlePrint}
            className="min-h-[44px] px-3 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs sm:text-sm font-medium hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir</span>
          </button>
        </div>
      </div>
    </div>
  );
};
