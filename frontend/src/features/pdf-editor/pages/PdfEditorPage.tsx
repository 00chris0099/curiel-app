import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { EditorShell } from '../components/EditorShell';
import { VersionHistoryPanel } from '../components/Panels/VersionHistoryPanel';
import { usePdfImport } from '../hooks/usePdfImport';
import { useAutosave } from '../hooks/useAutosave';
import { pdfDraftService, pdfVersionService } from '../services/pdfApi';
import { useEditorStore } from '../store';
import type { Canvas as FabricCanvas } from 'fabric';
import { ArrowLeft, Upload, FileText, History, Loader2 } from 'lucide-react';

type EditorView = 'editor' | 'versions';

export function PdfEditorPage() {
  const { id: inspectionId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { loadPdfFromFile } = usePdfImport();
  const { pages, markClean, setDocument, isLoading, error } = useEditorStore();

  const [view, setView] = useState<EditorView>('editor');
  const [isLoadingDraft, setIsLoadingDraft] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [inspectionName, setInspectionName] = useState('');
  const canvasRef = useRef<(() => FabricCanvas | null) | null>(null);

  const handleCanvasRef = useCallback((getCanvas: () => FabricCanvas | null) => {
    canvasRef.current = getCanvas;
  }, []);

  const handleSave = useCallback(async () => {
    if (!inspectionId || !canvasRef.current) return;
    const canvas = canvasRef.current();
    if (!canvas) return;
    const snapshot = canvas.toJSON();
    await pdfDraftService.saveDraft(inspectionId, snapshot);
  }, [inspectionId]);

  const handleSaveVersion = useCallback(async (description?: string) => {
    if (!inspectionId || !canvasRef.current) return;
    const canvas = canvasRef.current();
    if (!canvas) return;
    const snapshot = canvas.toJSON();
    await pdfVersionService.createVersion(inspectionId, snapshot, description);
    toast.success('Versión guardada');
  }, [inspectionId]);

  const { saveNow } = useAutosave(handleSave);

  const handleRestore = useCallback((snapshot: Record<string, unknown>) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current();
    if (!canvas) return;
    canvas.loadFromJSON(snapshot as Parameters<FabricCanvas['loadFromJSON']>[0]).then(() => {
      canvas.renderAll();
      toast.success('Versión restaurada');
    });
  }, []);

  useEffect(() => {
    if (!inspectionId || hasLoaded) return;

    const loadDraft = async () => {
      setIsLoadingDraft(true);
      try {
        const draft = await pdfDraftService.getDraft(inspectionId);
        if (draft?.snapshotJson) {
          setDocument(`draft-${inspectionId}`, inspectionId);
          const canvas = canvasRef.current?.();
          if (canvas) {
            await canvas.loadFromJSON(draft.snapshotJson as Parameters<FabricCanvas['loadFromJSON']>[0]);
            canvas.renderAll();
          }
          markClean();
          toast.success('Borrador restaurado');
        }
      } catch {
        // no draft available, user will upload a file
      } finally {
        setIsLoadingDraft(false);
        setHasLoaded(true);
      }
    };

    loadDraft();
  }, [inspectionId, hasLoaded, setDocument, markClean]);

  useEffect(() => {
    if (!inspectionId) return;
    const fetchName = async () => {
      try {
        const { default: inspectionService } = await import('../../../services/inspection.service');
        const inspection = await inspectionService.getInspectionById(inspectionId);
        setInspectionName(inspection.projectName);
      } catch {
        setInspectionName('Inspección');
      }
    };
    fetchName();
  }, [inspectionId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      if (inspectionId) {
        setDocument(`inspection-${inspectionId}`, inspectionId);
      }
      await loadPdfFromFile(file);
    }
  };

  const versionPanel = view === 'versions' && inspectionId ? (
    <VersionHistoryPanel
      inspectionId={inspectionId}
      onRestore={handleRestore}
      onClose={() => setView('editor')}
    />
  ) : undefined;

  return (
    <div className="h-screen flex flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shrink-0">
        <button
          onClick={() => navigate(`/inspections/${inspectionId}`)}
          className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
          <span className="hidden sm:inline">Volver</span>
        </button>

        <div className="h-5 w-px bg-gray-200 dark:bg-gray-700" />

        <FileText size={16} className="text-primary-600 shrink-0" />
        <h1 className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
          {inspectionName || 'Editor PDF'}
        </h1>

        <div className="flex-1" />

        {pages.length > 0 && (
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              className="hidden"
              id="pdf-upload-replace"
            />
            <label
              htmlFor="pdf-upload-replace"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer transition-colors"
            >
              <Upload size={12} />
              Reemplazar PDF
            </label>

            <button
              onClick={() => handleSaveVersion()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-600 bg-primary-50 dark:bg-primary-900/20 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors"
            >
              <History size={12} />
              Guardar versión
            </button>

            <button
              onClick={() => setView(view === 'versions' ? 'editor' : 'versions')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                view === 'versions'
                  ? 'text-white bg-primary-600'
                  : 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <History size={12} />
              Historial
            </button>
          </div>
        )}
      </div>

      {/* Editor area */}
      <div className="flex-1 relative overflow-hidden">
        {isLoadingDraft ? (
          <div className="h-full flex flex-col items-center justify-center gap-4 bg-gray-50 dark:bg-gray-900">
            <Loader2 size={32} className="animate-spin text-primary-600" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Cargando borrador...</p>
          </div>
        ) : pages.length === 0 && !isLoading ? (
          <div className="h-full flex flex-col items-center justify-center gap-6 bg-gray-50 dark:bg-gray-900 px-4">
            <div className="w-20 h-20 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <FileText size={36} className="text-primary-600" />
            </div>
            <div className="text-center">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                Editor de PDF
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">
                Sube un archivo PDF para comenzar a editarlo. Puedes agregar texto, imágenes, formas, firmas y más.
              </p>
            </div>
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              className="hidden"
              id="pdf-upload-initial"
            />
            <label
              htmlFor="pdf-upload-initial"
              className="flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-primary-600 rounded-xl hover:bg-primary-700 cursor-pointer transition-colors shadow-lg shadow-primary-600/25"
            >
              <Upload size={16} />
              Seleccionar PDF
            </label>
            {error && (
              <p className="text-sm text-red-500 dark:text-red-400 mt-2">{error}</p>
            )}
          </div>
        ) : (
          <EditorShell
            onSave={saveNow}
            onExport={() => {}}
            rightPanelContent={versionPanel}
            rightPanelKey={view === 'versions' ? 'custom' : undefined}
            onRightPanelChange={(key) => {
              if (key === 'custom' && view !== 'versions') {
                setView('versions');
              } else if (key !== 'custom' && view === 'versions') {
                setView('editor');
              }
            }}
            onCanvasRef={handleCanvasRef}
          />
        )}
      </div>

      {/* Hidden file input for initial upload */}
      <input
        type="file"
        accept=".pdf"
        onChange={handleFileUpload}
        className="hidden"
        id="pdf-upload-hidden"
      />
    </div>
  );
}
