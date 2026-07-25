import { useState, useEffect, useCallback } from 'react';
import { pdfVersionService, type PdfVersion } from '../../services/pdfApi';
import { History, RotateCcw, Loader2, X } from 'lucide-react';

interface VersionHistoryPanelProps {
  inspectionId: string;
  onRestore: (snapshot: Record<string, unknown>) => void;
  onClose?: () => void;
}

export function VersionHistoryPanel({ inspectionId, onRestore, onClose }: VersionHistoryPanelProps) {
  const [versions, setVersions] = useState<PdfVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRestoring, setIsRestoring] = useState<number | null>(null);

  const fetchVersions = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await pdfVersionService.getVersions(inspectionId);
      setVersions(data);
    } catch {
      setVersions([]);
    } finally {
      setIsLoading(false);
    }
  }, [inspectionId]);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  const handleRestore = useCallback(async (version: PdfVersion) => {
    setIsRestoring(version.versionNumber);
    try {
      const snapshot = await pdfVersionService.restoreVersion(inspectionId, version.versionNumber);
      onRestore(snapshot);
      onClose?.();
    } catch {
      // silently handle error
    } finally {
      setIsRestoring(null);
    }
  }, [inspectionId, onRestore, onClose]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <History size={16} className="text-primary-600" />
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Historial de Versiones
          </h3>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X size={14} />
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={20} className="animate-spin text-primary-600" />
        </div>
      ) : versions.length === 0 ? (
        <div className="text-center py-8 text-sm text-gray-400">
          No hay versiones guardadas aún.
          <br />
          Guarda una versión para crear el historial.
        </div>
      ) : (
        <div className="space-y-2">
          {versions.map((version) => (
            <div
              key={version.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
            >
              <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-xs font-bold text-primary-600">
                v{version.versionNumber}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                  {version.description || `Versión ${version.versionNumber}`}
                </p>
                <p className="text-[10px] text-gray-400">
                  {formatDate(version.createdAt)}
                </p>
              </div>
              <button
                onClick={() => handleRestore(version)}
                disabled={isRestoring !== null}
                className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded disabled:opacity-50"
              >
                {isRestoring === version.versionNumber ? (
                  <Loader2 size={10} className="animate-spin" />
                ) : (
                  <RotateCcw size={10} />
                )}
                Restaurar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
