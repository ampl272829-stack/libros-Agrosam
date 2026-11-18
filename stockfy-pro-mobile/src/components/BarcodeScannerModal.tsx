import React, { useEffect, useRef, useState } from 'react';
import { Camera, Check, ScanBarcode, X } from 'lucide-react';

interface BarcodeScannerModalProps {
  open: boolean;
  title?: string;
  onClose: () => void;
  onDetected: (code: string) => void;
}

interface NativeBarcodeDetector {
  detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue?: string }>>;
}

declare global {
  interface Window {
    BarcodeDetector?: new (opts?: { formats?: string[] }) => NativeBarcodeDetector;
  }
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  open,
  title = 'Escanear Código de Barras',
  onClose,
  onDetected,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [detectorSupported, setDetectorSupported] = useState(true);
  const [manualCode, setManualCode] = useState('');

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    let intervalId: number | null = null;
    setCameraError(null);
    setManualCode('');

    const stopCamera = () => {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };

    const start = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError(
          'Tu navegador o ventana actual no permite acceso directo a la cámara. Ingresa o escanea con lector USB/Bluetooth abajo.'
        );
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }

        if (typeof window.BarcodeDetector === 'function') {
          setDetectorSupported(true);
          const detector = new window.BarcodeDetector({
            formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code'],
          });

          intervalId = window.setInterval(async () => {
            if (!videoRef.current || videoRef.current.readyState < 2 || cancelled) return;
            try {
              const codes = await detector.detect(videoRef.current);
              const first = codes.find((c) => c.rawValue && c.rawValue.trim());
              if (first?.rawValue) {
                stopCamera();
                onDetected(first.rawValue.trim());
                onClose();
              }
            } catch {
              // ignore transient frame read errors
            }
          }, 220);
        } else {
          setDetectorSupported(false);
        }
      } catch {
        if (!cancelled) {
          setCameraError(
            'No se pudo abrir la cámara (permiso denegado o sin cámara disponible). Usa el campo inferior para escribir o usar un lector USB/Bluetooth.'
          );
        }
      }
    };

    void start();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [open, onClose, onDetected]);

  if (!open) return null;

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = manualCode.trim();
    if (!trimmed) return;
    onDetected(trimmed);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/75 backdrop-blur-xs p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col">
        <div className="sm:hidden w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mt-3 mb-1" />

        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ScanBarcode className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Cerrar escáner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 pb-safe">
          {!cameraError ? (
            <div className="relative aspect-[4/3] w-full rounded-2xl bg-slate-950 overflow-hidden border border-slate-800">
              <video
                ref={videoRef}
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="w-3/4 h-28 rounded-xl border-2 border-emerald-400/90 shadow-[0_0_0_9999px_rgba(2,6,23,0.45)]" />
              </div>
              <div className="absolute bottom-3 inset-x-3 text-center">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-950/80 text-white text-[11px]">
                  <Camera className="w-3.5 h-3.5 text-emerald-400" />
                  {detectorSupported
                    ? 'Apunta la cámara al código de barras'
                    : 'Cámara activa · Escribe el código o usa lector'}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
              {cameraError}
            </div>
          )}

          <form onSubmit={handleManualSubmit} className="space-y-2">
            <label
              htmlFor="manual-barcode-input"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Ingreso manual o con lector USB / Bluetooth
            </label>
            <div className="flex gap-2">
              <input
                id="manual-barcode-input"
                type="text"
                autoFocus
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Ej. 759100100231"
                className="flex-1 min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
              />
              <button
                type="submit"
                disabled={!manualCode.trim()}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap"
              >
                <Check className="w-4 h-4" />
                <span>Aplicar</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
