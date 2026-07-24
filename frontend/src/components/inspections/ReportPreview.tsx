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
    const iframeRef = useRef<HTMLIFrameElement>(null);

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="flex h-[90vh] w-full max-w-5xl flex-col rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <CustomIcon name="file-pdf" size="xs" tone="cream" />
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                            Vista previa del informe
                        </h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleDownload}
                            className="flex items-center gap-2 rounded-xl bg-[#17324a] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1d3d5c]"
                        >
                            <CustomIcon name="download" size="xs" tone="white" />
                            Descargar PDF
                        </button>
                        <button
                            onClick={onClose}
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white transition-colors hover:bg-slate-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                        >
                            <CustomIcon name="x-circle" size="xs" tone="mist" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden">
                    {isLoading && (
                        <div className="flex h-full items-center justify-center">
                            <div className="flex flex-col items-center gap-3 text-slate-500">
                                <CustomIcon name="sync" size="md" tone="mist" spin />
                                <p className="text-sm">Cargando vista previa...</p>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="flex h-full items-center justify-center">
                            <div className="flex flex-col items-center gap-3 text-center">
                                <CustomIcon name="warning-circle" size="md" tone="cream" />
                                <p className="text-sm text-slate-600 dark:text-slate-400">{error}</p>
                                <button
                                    onClick={loadPreview}
                                    className="mt-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm transition-colors hover:bg-slate-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                                >
                                    Reintentar
                                </button>
                            </div>
                        </div>
                    )}

                    {!isLoading && !error && html && (
                        <iframe
                            ref={iframeRef}
                            className="h-full w-full border-0"
                            title="Vista previa del informe"
                        />
                    )}
                </div>
            </div>
        </div>
    );
};
