import { useState } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize,
  Undo2,
  Redo2,
  Save,
  Download,
  MoreHorizontal,
  History,
} from 'lucide-react';
import { useEditorStore } from '../../store';
import { useIsMobile } from '../../hooks/useMediaQuery';

interface MainToolbarProps {
  onSave?: () => void;
  onExport?: () => void;
  onVersionHistory?: () => void;
}

export function MainToolbar({ onSave, onExport, onVersionHistory }: MainToolbarProps) {
  const {
    viewport,
    zoomIn,
    zoomOut,
    resetZoom,
    undo,
    redo,
    history,
    autosave,
  } = useEditorStore();

  const isMobile = useIsMobile();
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  if (isMobile) {
    return (
      <div className="flex items-center gap-1 px-2 py-1.5 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => { const s = undo(); if (s) window.dispatchEvent(new CustomEvent('editor:restore-snapshot', { detail: s })); }}
            disabled={history.undoStack.length === 0}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 text-gray-600 dark:text-gray-400"
          >
            <Undo2 size={16} />
          </button>
          <button
            onClick={() => { const s = redo(); if (s) window.dispatchEvent(new CustomEvent('editor:restore-snapshot', { detail: s })); }}
            disabled={history.redoStack.length === 0}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 text-gray-600 dark:text-gray-400"
          >
            <Redo2 size={16} />
          </button>
        </div>

        <div className="w-px h-5 bg-gray-200 dark:bg-gray-700" />

        <div className="flex items-center gap-0.5">
          <button onClick={zoomOut} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400">
            <ZoomOut size={16} />
          </button>
          <span className="w-10 text-center text-xs font-medium text-gray-600 dark:text-gray-400">
            {Math.round(viewport.zoom)}%
          </span>
          <button onClick={zoomIn} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400">
            <ZoomIn size={16} />
          </button>
          <button onClick={resetZoom} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400">
            <Maximize size={16} />
          </button>
        </div>

        <div className="flex-1" />

        {autosave.isSaving && (
          <span className="text-[10px] text-gray-500 animate-pulse">Guardando...</span>
        )}

        <div className="relative">
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
          >
            <MoreHorizontal size={16} />
          </button>
          {showMobileMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMobileMenu(false)} />
              <div className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 min-w-[160px]">
                <button
                  onClick={() => { onSave?.(); setShowMobileMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Save size={14} /> Guardar
                </button>
                <button
                  onClick={() => { onExport?.(); setShowMobileMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Download size={14} /> Exportar PDF
                </button>
                {onVersionHistory && (
                  <button
                    onClick={() => { onVersionHistory(); setShowMobileMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <History size={14} /> Versiones
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-1">
        <button
          onClick={() => { const s = undo(); if (s) window.dispatchEvent(new CustomEvent('editor:restore-snapshot', { detail: s })); }}
          disabled={history.undoStack.length === 0}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-600 dark:text-gray-400"
          title="Deshacer (Ctrl+Z)"
        >
          <Undo2 size={18} />
        </button>
        <button
          onClick={() => { const s = redo(); if (s) window.dispatchEvent(new CustomEvent('editor:restore-snapshot', { detail: s })); }}
          disabled={history.redoStack.length === 0}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-600 dark:text-gray-400"
          title="Rehacer (Ctrl+Y)"
        >
          <Redo2 size={18} />
        </button>
      </div>

      <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />

      <div className="flex items-center gap-1">
        <button
          onClick={zoomOut}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
          title="Alejar (Ctrl+-)"
        >
          <ZoomOut size={18} />
        </button>
        <span className="w-16 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
          {Math.round(viewport.zoom)}%
        </span>
        <button
          onClick={zoomIn}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
          title="Acercar (Ctrl++)"
        >
          <ZoomIn size={18} />
        </button>
        <button
          onClick={resetZoom}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
          title="Ajustar a página (Ctrl+0)"
        >
          <Maximize size={18} />
        </button>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-1">
        {autosave.isSaving && (
          <span className="text-xs text-gray-500 dark:text-gray-400 animate-pulse">
            Guardando...
          </span>
        )}
        {autosave.lastSavedAt && !autosave.isSaving && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Guardado
          </span>
        )}

        {onVersionHistory && (
          <button
            onClick={onVersionHistory}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
            title="Historial de versiones"
          >
            <History size={18} />
          </button>
        )}

        <button
          onClick={onSave}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
          title="Guardar (Ctrl+S)"
        >
          <Save size={18} />
        </button>
        <button
          onClick={onExport}
          className="flex items-center gap-2 px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors"
          title="Exportar PDF (Ctrl+Shift+S)"
        >
          <Download size={16} />
          Exportar PDF
        </button>
      </div>
    </div>
  );
}
