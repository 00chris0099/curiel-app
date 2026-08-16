import { useCallback, useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from '../../api/axios';
import { CustomIcon } from '../CustomIcon';
import inspectionService from '../../services/inspection.service';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
).toString();

type ReportPreviewProps = {
    inspectionId: string;
    projectName: string;
    isOpen: boolean;
    onClose: () => void;
};

const PAGE_GAP = 16;
const BASE_WIDTH = 794;
const BASE_HEIGHT = 1123;

const getFitZoom = (containerWidth: number) => {
    if (!containerWidth || containerWidth <= 0) return 80;
    const padding = containerWidth < 640 ? 20 : 40;
    const fit = Math.floor(((containerWidth - padding) / BASE_WIDTH) * 100);
    if (containerWidth < 768) {
        return Math.min(Math.max(fit, 25), 100);
    }
    return Math.min(Math.max(fit, 30), 100);
};

export const ReportPreview = ({ inspectionId, projectName, isOpen, onClose }: ReportPreviewProps) => {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pageCount, setPageCount] = useState(0);
    const [zoom, setZoom] = useState(80);
    const [isAutoFit, setIsAutoFit] = useState(true);
    const [isOpeningDocs, setIsOpeningDocs] = useState(false);
    const [isDownloadingDrive, setIsDownloadingDrive] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
    const renderingRef = useRef<Set<number>>(new Set());
    const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());

    const loadPdf = useCallback(async () => {
        if (!isOpen || !inspectionId) return;

        setIsLoading(true);
        setError(null);
        setPageCount(0);

        try {
            const blob = await inspectionService.downloadReport(inspectionId);
            const arrayBuffer = await blob.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            pdfDocRef.current = pdf;
            setPageCount(pdf.numPages);
        } catch (err: unknown) {
            setError(getApiErrorMessage(err, 'No se pudo cargar el informe'));
            toast.error('Error al cargar informe');
        } finally {
            setIsLoading(false);
        }
    }, [inspectionId, isOpen]);

    useEffect(() => {
        loadPdf();
        return () => {
            pdfDocRef.current?.destroy();
            pdfDocRef.current = null;
            renderingRef.current.clear();
        };
    }, [loadPdf]);

    const handleAutoFit = useCallback(() => {
        if (containerRef.current) {
            const width = containerRef.current.clientWidth;
            const fit = getFitZoom(width);
            setZoom(fit);
            setIsAutoFit(true);
        }
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        const container = containerRef.current;
        if (!container) return;

        // Auto-fit on initial container open
        handleAutoFit();

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const width = entry.contentRect.width;
                if (width > 0 && isAutoFit) {
                    setZoom(getFitZoom(width));
                }
            }
        });

        observer.observe(container);
        return () => observer.disconnect();
    }, [isOpen, handleAutoFit, isAutoFit]);

    const renderPage = useCallback(async (pageNumber: number) => {
        const pdf = pdfDocRef.current;
        if (!pdf || renderingRef.current.has(pageNumber)) return;

        renderingRef.current.add(pageNumber);

        try {
            const page = await pdf.getPage(pageNumber);
            const viewport = page.getViewport({ scale: 1 });
            const scale = BASE_WIDTH / viewport.width;
            const scaledViewport = page.getViewport({ scale });

            const canvas = canvasRefs.current.get(pageNumber);
            if (!canvas) return;

            canvas.width = scaledViewport.width;
            canvas.height = scaledViewport.height;
            canvas.style.width = `${scaledViewport.width}px`;
            canvas.style.height = `${scaledViewport.height}px`;

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            await page.render({
                canvasContext: ctx,
                viewport: scaledViewport,
            }).promise;
        } catch (err) {
            console.error(`[ReportPreview] Failed to render page ${pageNumber}:`, err);
        } finally {
            renderingRef.current.delete(pageNumber);
        }
    }, []);

    // Render visible pages (virtual rendering)
    useEffect(() => {
        if (pageCount === 0) return;

        const scrollEl = scrollRef.current;
        if (!scrollEl) {
            renderPage(1);
            return;
        }

        const handleScroll = () => {
            const scrollTop = scrollEl.scrollTop;
            const viewHeight = scrollEl.clientHeight;
            const scale = zoom / 100;
            const scaledPageH = BASE_HEIGHT * scale;

            for (let i = 1; i <= pageCount; i++) {
                const pageTop = (i - 1) * (scaledPageH + PAGE_GAP);
                const pageBottom = pageTop + scaledPageH;

                if (pageBottom >= scrollTop - 300 && pageTop <= scrollTop + viewHeight + 300) {
                    renderPage(i);
                }
            }
        };

        handleScroll();
        scrollEl.addEventListener('scroll', handleScroll, { passive: true });
        return () => scrollEl.removeEventListener('scroll', handleScroll);
    }, [pageCount, zoom, renderPage]);

    const handleOpenInAdobe = async () => {
        setIsOpeningDocs(true);
        try {
            const blob = await inspectionService.downloadReport(inspectionId);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `informe-inspeccion-${projectName}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
            window.open('https://www.adobe.com/pe/acrobat/online/pdf-editor.html', '_blank');
        } catch (err: unknown) {
            toast.error(getApiErrorMessage(err, 'No se pudo descargar el informe'));
        } finally {
            setIsOpeningDocs(false);
        }
    };

    const handleDownloadAndDrive = async () => {
        setIsDownloadingDrive(true);
        try {
            const result = await inspectionService.downloadReportAndSaveToDrive(inspectionId);
            if ('requiresAuth' in result && result.requiresAuth) {
                const token = localStorage.getItem('accessToken') || '';
                const authUrl = `${result.authUrl}&token=${encodeURIComponent(token)}`;
                window.open(authUrl, 'google-auth', 'width=600,height=700');
                toast.success('Autoriza con tu cuenta de Google en la ventana emergente');
                setIsDownloadingDrive(false);
                return;
            }
            if ('blob' in result) {
                const blob = result.blob;
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `informe-inspeccion-${projectName}.pdf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                a.remove();
            }
        } catch (err: unknown) {
            toast.error(getApiErrorMessage(err, 'No se pudo descargar el informe'));
        } finally {
            setIsDownloadingDrive(false);
        }
    };

    if (!isOpen) return null;

    const scale = zoom / 100;
    const scaledWidth = Math.round(BASE_WIDTH * scale);
    const scaledHeight = Math.round(BASE_HEIGHT * scale);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-0 sm:p-2">
            <div className="flex h-full sm:h-[96vh] w-full max-w-6xl flex-col rounded-none sm:rounded-2xl bg-white shadow-2xl dark:bg-gray-900 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-200 px-3 sm:px-5 py-2.5 dark:border-gray-700 shrink-0 bg-white dark:bg-gray-900 gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30 shrink-0">
                            <CustomIcon name="file-pdf" size="xs" tone="rose" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h2 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                                {projectName}
                            </h2>
                            {pageCount > 0 && (
                                <p className="text-[10px] sm:text-[11px] text-gray-400 dark:text-gray-500 truncate">
                                    {pageCount} página{pageCount > 1 ? 's' : ''}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                        {/* Zoom controls (desktop view) */}
                        {pageCount > 0 && (
                            <>
                                <div className="hidden sm:flex items-center gap-0.5 rounded-lg border border-gray-200 bg-gray-50 px-1.5 py-0.5 dark:border-gray-700 dark:bg-gray-800">
                                    <button
                                        onClick={() => {
                                            setZoom((z) => Math.max(25, z - 10));
                                            setIsAutoFit(false);
                                        }}
                                        className="flex h-6 w-6 items-center justify-center rounded text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 text-xs font-bold"
                                        title="Alejar"
                                    >
                                        -
                                    </button>
                                    <span className="w-9 text-center text-[11px] font-medium text-gray-500 dark:text-gray-400">{zoom}%</span>
                                    <button
                                        onClick={() => {
                                            setZoom((z) => Math.min(200, z + 10));
                                            setIsAutoFit(false);
                                        }}
                                        className="flex h-6 w-6 items-center justify-center rounded text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 text-xs font-bold"
                                        title="Acercar"
                                    >
                                        +
                                    </button>
                                </div>
                                <button
                                    onClick={handleAutoFit}
                                    className="hidden sm:flex h-7 items-center rounded-lg px-2 text-[11px] font-medium text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                                    title="Ajustar a la pantalla"
                                >
                                    Ajustar
                                </button>
                                <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 hidden sm:block" />
                            </>
                        )}

                        {/* Editar en Adobe Acrobat */}
                        <button
                            onClick={handleOpenInAdobe}
                            disabled={isOpeningDocs}
                            className="flex items-center gap-1.5 rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                            title="Editar en Adobe Acrobat"
                        >
                            {isOpeningDocs ? (
                                <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                            ) : (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                    <polyline points="14 2 14 8 20 8" />
                                    <line x1="16" y1="13" x2="8" y2="13" />
                                    <line x1="16" y1="17" x2="8" y2="17" />
                                </svg>
                            )}
                            <span className="hidden sm:inline">{isOpeningDocs ? 'Descargando...' : 'Editar en Adobe'}</span>
                        </button>

                        {/* Descargar PDF + Drive */}
                        <button
                            onClick={handleDownloadAndDrive}
                            disabled={isDownloadingDrive}
                            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                            title="Descargar PDF"
                        >
                            {isDownloadingDrive ? (
                                <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                            ) : (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <polyline points="7 10 12 15 17 10" />
                                    <line x1="12" y1="15" x2="12" y2="3" />
                                </svg>
                            )}
                            <span className="hidden sm:inline">{isDownloadingDrive ? 'Guardando...' : 'Descargar'}</span>
                        </button>

                        {/* Cerrar */}
                        <button
                            onClick={onClose}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-white transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                            title="Cerrar"
                        >
                            <CustomIcon name="x-circle" size="xs" tone="mist" />
                        </button>
                    </div>
                </div>

                {/* PDF Pages area */}
                <div
                    ref={containerRef}
                    className="relative flex-1 overflow-hidden bg-[#4b5563] dark:bg-[#0f172a]"
                >
                    {isLoading && (
                        <div className="flex h-full items-center justify-center w-full">
                            <div className="flex flex-col items-center gap-3 text-gray-300">
                                <CustomIcon name="sync" size="md" tone="white" spin />
                                <p className="text-sm font-medium">Cargando informe...</p>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="flex h-full items-center justify-center w-full">
                            <div className="flex flex-col items-center gap-3 text-center">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-900/30">
                                    <CustomIcon name="warning-circle" size="sm" tone="rose" />
                                </div>
                                <p className="text-sm text-gray-300">{error}</p>
                                <button
                                    onClick={loadPdf}
                                    className="mt-1 rounded-xl border border-gray-600 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-200 transition-colors hover:bg-gray-700"
                                >
                                    Reintentar
                                </button>
                            </div>
                        </div>
                    )}

                    {!isLoading && !error && pageCount > 0 && (
                        <div
                            ref={scrollRef}
                            className="h-full w-full overflow-auto flex flex-col items-center py-4 px-2 sm:px-4 touch-pan-y"
                        >
                            <div
                                className="flex flex-col items-center"
                                style={{
                                    width: `${Math.max(scaledWidth, 300)}px`,
                                    minWidth: '100%',
                                    gap: `${PAGE_GAP}px`,
                                }}
                            >
                                {Array.from({ length: pageCount }, (_, i) => i + 1).map((pageNum) => (
                                    <div
                                        key={pageNum}
                                        className="relative flex justify-center shrink-0 w-full overflow-visible"
                                        style={{
                                            height: `${scaledHeight + 28}px`,
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: `${BASE_WIDTH}px`,
                                                position: 'absolute',
                                                left: '50%',
                                                transform: `translateX(-50%) scale(${scale})`,
                                                transformOrigin: 'top center',
                                            }}
                                        >
                                            {/* Page canvas */}
                                            <canvas
                                                ref={(el) => {
                                                    if (el) canvasRefs.current.set(pageNum, el);
                                                }}
                                                className="block bg-white"
                                                style={{
                                                    width: `${BASE_WIDTH}px`,
                                                    boxShadow: '0 2px 12px rgba(0,0,0,0.3), 0 0 1px rgba(0,0,0,0.2)',
                                                    border: '1px solid rgba(0,0,0,0.1)',
                                                }}
                                            />
                                            {/* Page number */}
                                            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[11px] font-medium text-gray-400 dark:text-gray-500 select-none">
                                                {pageNum}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {/* Bottom spacer for last page */}
                            <div style={{ height: '32px' }} />
                        </div>
                    )}

                    {/* Mobile floating zoom controls bar */}
                    {!isLoading && !error && pageCount > 0 && (
                        <div className="sm:hidden absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 rounded-full border border-gray-700/50 bg-gray-900/90 backdrop-blur-md px-3 py-1.5 shadow-xl text-white">
                            <button
                                onClick={() => {
                                    setZoom((z) => Math.max(25, z - 10));
                                    setIsAutoFit(false);
                                }}
                                className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-800 text-gray-200 active:bg-gray-700 text-sm font-bold"
                                title="Alejar"
                            >
                                -
                            </button>
                            <span className="w-10 text-center text-xs font-semibold text-gray-200">
                                {zoom}%
                            </span>
                            <button
                                onClick={() => {
                                    setZoom((z) => Math.min(200, z + 10));
                                    setIsAutoFit(false);
                                }}
                                className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-800 text-gray-200 active:bg-gray-700 text-sm font-bold"
                                title="Acercar"
                            >
                                +
                            </button>
                            <div className="w-px h-4 bg-gray-700 mx-0.5" />
                            <button
                                onClick={handleAutoFit}
                                className="flex h-7 items-center rounded-full px-2.5 text-xs font-semibold bg-blue-600 text-white active:bg-blue-700"
                            >
                                Ajustar
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

