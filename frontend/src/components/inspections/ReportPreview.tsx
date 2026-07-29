import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from '../../api/axios';
import { CustomIcon } from '../CustomIcon';
import inspectionService from '../../services/inspection.service';

type ReportPreviewProps = {
    inspectionId: string;
    projectName: string;
    isOpen: boolean;
    onClose: () => void;
};

export const ReportPreview = ({ inspectionId, projectName, isOpen, onClose }: ReportPreviewProps) => {
    const [html, setHtml] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showEditor, setShowEditor] = useState(false);
    const [conclusion, setConclusion] = useState('');
    const [recommendations, setRecommendations] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [zoom, setZoom] = useState(80);

    const loadPreview = useCallback(async () => {
        if (!isOpen || !inspectionId) return;

        setIsLoading(true);
        setError(null);

        try {
            const previewHtml = await inspectionService.previewReport(inspectionId);
            setHtml(previewHtml);
        } catch (err: unknown) {
            setError(getApiErrorMessage(err, 'No se pudo cargar la vista previa'));
            toast.error('Error al cargar vista previa');
        } finally {
            setIsLoading(false);
        }
    }, [inspectionId, isOpen]);

    useEffect(() => {
        loadPreview();
    }, [loadPreview]);

    useEffect(() => {
        if (html && iframeRef.current) {
            const doc = iframeRef.current.contentDocument;
            if (doc) {
                doc.open();
                doc.write(html);
                doc.close();
            }
        }
    }, [html]);

    const handleSaveEdits = async () => {
        setIsSaving(true);
        try {
            await inspectionService.updateExecutionSummary(inspectionId, {
                generalConclusion: conclusion || undefined,
                finalRecommendations: recommendations || undefined
            });
            toast.success('Cambios guardados');
            await loadPreview();
            setShowEditor(false);
        } catch (err: unknown) {
            toast.error(getApiErrorMessage(err, 'Error al guardar'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleDownload = async () => {
        try {
            const blob = await inspectionService.downloadReport(inspectionId);
            const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;
            link.download = `informe-inspeccion-${projectName}.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            toast.success('PDF descargado');
        } catch (err: unknown) {
            toast.error(getApiErrorMessage(err, 'No se pudo descargar el PDF'));
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2 sm:p-4">
            <div className="flex h-[96vh] sm:h-[92vh] w-full max-w-5xl flex-col rounded-2xl bg-white shadow-2xl dark:bg-gray-900 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-200 px-4 sm:px-6 py-3 dark:border-gray-700 shrink-0 bg-gray-50 dark:bg-gray-800">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/30">
                            <CustomIcon name="file-pdf" size="xs" tone="rose" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-sm sm:text-base font-bold text-gray-900 dark:text-gray-100 truncate">
                                Vista previa del informe
                            </h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {projectName}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        {html && (
                            <>
                                <div className="hidden sm:flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1 dark:border-gray-700 dark:bg-gray-800">
                                    <button
                                        onClick={() => setZoom(Math.max(30, zoom - 10))}
                                        className="flex h-6 w-6 items-center justify-center rounded text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 text-xs font-bold"
                                    >
                                        -
                                    </button>
                                    <span className="w-10 text-center text-[11px] font-medium text-gray-500 dark:text-gray-400">{zoom}%</span>
                                    <button
                                        onClick={() => setZoom(Math.min(200, zoom + 10))}
                                        className="flex h-6 w-6 items-center justify-center rounded text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 text-xs font-bold"
                                    >
                                        +
                                    </button>
                                </div>
                                <button
                                    onClick={() => setZoom(80)}
                                    className="hidden sm:flex h-8 items-center rounded-lg px-2 text-[11px] font-medium text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                                >
                                    Ajustar
                                </button>
                            </>
                        )}
                        <button
                            onClick={() => setShowEditor(!showEditor)}
                            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                                showEditor
                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                    : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'
                            }`}
                        >
                            <CustomIcon name="pencil" size="xs" tone={showEditor ? 'amber' : 'mist'} />
                            <span className="hidden sm:inline">Editar</span>
                        </button>
                        <button
                            onClick={handleDownload}
                            className="flex items-center gap-1.5 rounded-lg bg-[#17324a] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#1d3d5c]"
                        >
                            <CustomIcon name="download" size="xs" tone="white" />
                            <span className="hidden sm:inline">Descargar</span>
                        </button>
                        <button
                            onClick={onClose}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                        >
                            <CustomIcon name="x-circle" size="xs" tone="mist" />
                        </button>
                    </div>
                </div>

                {/* Editor panel */}
                {showEditor && (
                    <div className="border-b border-gray-200 bg-gray-50 px-4 sm:px-6 py-4 dark:border-gray-700 dark:bg-gray-800/50 shrink-0">
                        <p className="mb-3 text-xs font-medium text-gray-500 dark:text-gray-400">
                            Edita los campos y haz clic en "Guardar" para actualizar el informe.
                        </p>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                                    Conclusión general
                                </label>
                                <textarea
                                    value={conclusion}
                                    onChange={(e) => setConclusion(e.target.value)}
                                    rows={4}
                                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#17324a] focus:outline-none focus:ring-1 focus:ring-[#17324a] dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                                    placeholder="Conclusión técnica de la inspección..."
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                                    Recomendaciones finales
                                </label>
                                <textarea
                                    value={recommendations}
                                    onChange={(e) => setRecommendations(e.target.value)}
                                    rows={4}
                                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#17324a] focus:outline-none focus:ring-1 focus:ring-[#17324a] dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                                    placeholder="Recomendaciones adicionales del inspector..."
                                />
                            </div>
                        </div>
                        <div className="mt-3 flex justify-end gap-2">
                            <button
                                onClick={() => setShowEditor(false)}
                                className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveEdits}
                                disabled={isSaving}
                                className="flex items-center gap-1.5 rounded-lg bg-[#17324a] px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#1d3d5c] disabled:opacity-50"
                            >
                                {isSaving ? (
                                    <CustomIcon name="sync" size="xs" tone="white" spin />
                                ) : (
                                    <CustomIcon name="save" size="xs" tone="white" />
                                )}
                                Guardar
                            </button>
                        </div>
                    </div>
                )}

                {/* Preview area */}
                <div className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-800 flex justify-center">
                    {isLoading && (
                        <div className="flex h-full items-center justify-center w-full">
                            <div className="flex flex-col items-center gap-3 text-gray-500">
                                <CustomIcon name="sync" size="md" tone="mist" spin />
                                <p className="text-sm font-medium">Cargando vista previa...</p>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="flex h-full items-center justify-center w-full">
                            <div className="flex flex-col items-center gap-3 text-center">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-900/30">
                                    <CustomIcon name="warning-circle" size="sm" tone="rose" />
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{error}</p>
                                <button
                                    onClick={loadPreview}
                                    className="mt-1 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                                >
                                    Reintentar
                                </button>
                            </div>
                        </div>
                    )}

                    {!isLoading && !error && html && (
                        <div className="py-4 px-2">
                            <div
                                style={{
                                    transform: `scale(${zoom / 100})`,
                                    transformOrigin: 'top center',
                                    transition: 'transform 0.15s ease-out',
                                }}
                            >
                                <iframe
                                    ref={iframeRef}
                                    className="rounded-lg border border-gray-300 bg-white shadow-xl dark:border-gray-600"
                                    style={{
                                        width: '794px',
                                        height: '1123px',
                                    }}
                                    title="Vista previa del informe"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
