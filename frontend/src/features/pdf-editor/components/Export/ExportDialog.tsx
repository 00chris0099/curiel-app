import { useState, useCallback } from 'react';
import { X, Download, FileText, Loader2 } from 'lucide-react';
import { exportPdf, downloadPdf } from '../../utils/pdfHelpers';
import { useEditorStore } from '../../store';
import type { Canvas as FabricCanvas } from 'fabric';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  canvas: FabricCanvas | null;
}

type ExportQuality = 'low' | 'medium' | 'high';

export function ExportDialog({ isOpen, onClose, canvas }: ExportDialogProps) {
  const { pages } = useEditorStore();
  const [quality, setQuality] = useState<ExportQuality>('medium');
  const [pageRange, setPageRange] = useState<{ start: number; end: number }>({
    start: 0,
    end: pages.length - 1,
  });
  const [isExporting, setIsExporting] = useState(false);
  const [filename, setFilename] = useState('documento');

  const handleExport = useCallback(async () => {
    if (!canvas || pages.length === 0) return;

    setIsExporting(true);
    try {
      const pdfBytes = await exportPdf({
        pages,
        canvas,
        pageRange,
        quality,
      });
      downloadPdf(pdfBytes, filename);
      onClose();
    } catch {
      // silently handle error
    } finally {
      setIsExporting(false);
    }
  }, [canvas, pages, pageRange, quality, filename, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-primary-600" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Exportar PDF
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              Nombre del archivo
            </label>
            <input
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              Calidad
            </label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: 'low', label: 'Baja', desc: '1x' },
                { value: 'medium', label: 'Media', desc: '1.5x' },
                { value: 'high', label: 'Alta', desc: '2x' },
              ] as const).map((q) => (
                <button
                  key={q.value}
                  onClick={() => setQuality(q.value)}
                  className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                    quality === q.value
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {q.label}
                  <br />
                  <span className="text-[10px] opacity-60">{q.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              Rango de páginas
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={pages.length - 1}
                value={pageRange.start}
                onChange={(e) =>
                  setPageRange((prev) => ({
                    ...prev,
                    start: Math.max(0, parseInt(e.target.value) || 0),
                  }))
                }
                className="w-20 px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              <span className="text-sm text-gray-500">a</span>
              <input
                type="number"
                min={0}
                max={pages.length - 1}
                value={pageRange.end}
                onChange={(e) =>
                  setPageRange((prev) => ({
                    ...prev,
                    end: Math.min(pages.length - 1, parseInt(e.target.value) || 0),
                  }))
                }
                className="w-20 px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              <span className="text-xs text-gray-400">/ {pages.length} páginas</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting || pages.length === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Exportando...
              </>
            ) : (
              <>
                <Download size={14} />
                Exportar PDF
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
