import { useRef, useEffect, useCallback, useState } from 'react';
import SignaturePadLib from 'signature_pad';
import { Trash2, Download } from 'lucide-react';

interface SignaturePadProps {
  onSignature: (dataUrl: string) => void;
  onCancel?: () => void;
  width?: number;
  height?: number;
}

export function SignaturePad({ onSignature, onCancel, width = 400, height = 200 }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePadLib | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [penColor, setPenColor] = useState('#000000');

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(ratio, ratio);
    }

    const pad = new SignaturePadLib(canvas, {
      backgroundColor: 'rgb(255, 255, 255)',
      penColor,
    });

    pad.addEventListener('endStroke', () => {
      setIsEmpty(pad.isEmpty());
    });

    padRef.current = pad;

    return () => {
      pad.off();
    };
  }, [width, height, penColor]);

  const handleClear = useCallback(() => {
    padRef.current?.clear();
    setIsEmpty(true);
  }, []);

  const handleSave = useCallback(() => {
    if (!canvasRef.current || isEmpty) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    onSignature(dataUrl);
  }, [isEmpty, onSignature]);

  const handleDownload = useCallback(() => {
    if (!canvasRef.current || isEmpty) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `firma-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  }, [isEmpty]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 mb-2">
        <label className="text-xs text-gray-500 dark:text-gray-400">Color:</label>
        <input
          type="color"
          value={penColor}
          onChange={(e) => setPenColor(e.target.value)}
          className="w-6 h-6 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
        />
      </div>

      <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
        <canvas
          ref={canvasRef}
          className="touch-none"
          style={{ width, height }}
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleClear}
          disabled={isEmpty}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
        >
          <Trash2 size={12} />
          Limpiar
        </button>
        <button
          onClick={handleDownload}
          disabled={isEmpty}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
        >
          <Download size={12} />
          Descargar
        </button>
        <div className="flex-1" />
        {onCancel && (
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancelar
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={isEmpty}
          className="px-3 py-1.5 text-xs font-medium text-white bg-primary-600 rounded hover:bg-primary-700 disabled:opacity-50"
        >
          Aplicar firma
        </button>
      </div>
    </div>
  );
}
