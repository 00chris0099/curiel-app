import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

export const ReportPreview = ({ inspectionId, projectName, isOpen, onClose }: ReportPreviewProps) => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pageCount, setPageCount] = useState(0);
    const [zoom, setZoom] = useState(80);
    const [isOpeningDocs, setIsOpeningDocs] = useState(false);
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

    // Container width is not needed - pages use fixed BASE_WIDTH

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
            // No scroll ref yet, render first page
            renderPage(1);
            return;
        }

        const handleScroll = () => {
            const scrollTop = scrollEl.scrollTop;
            const viewHeight = scrollEl.clientHeight;
            const scaledPageH = (BASE_WIDTH * 1123) / 794; // approximate A4 height

            // Determine which pages are visible
            for (let i = 1; i <= pageCount; i++) {
                const pageTop = (i - 1) * (scaledPageH * (zoom / 100) + PAGE_GAP);
                const pageBottom = pageTop + scaledPageH * (zoom / 100);

                if (pageBottom >= scrollTop - 200 && pageTop <= scrollTop + viewHeight + 200) {
                    renderPage(i);
                }
            }
        };

        handleScroll();
        scrollEl.addEventListener('scroll', handleScroll, { passive: true });
        return () => scrollEl.removeEventListener('scroll', handleScroll);
    }, [pageCount, zoom, renderPage]);

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

    const handleEdit = () => {
        onClose();
        navigate(`/inspections/${inspectionId}/pdf-editor`);
    };

    const handleOpenInDocs = async () => {
        setIsOpeningDocs(true);
        try {
            const result = await inspectionService.openInGoogleDocs(inspectionId);
            if ('requiresAuth' in result && result.requiresAuth) {
                const token = localStorage.getItem('token') || '';
                const authUrl = `${result.authUrl}&token=${token}`;
                const popup = window.open(authUrl, 'google-auth', 'width=600,height=700');
                const handler = (event: MessageEvent) => {
                    if (event.data?.type === 'google-auth-success') {
                        popup?.close();
                        window.removeEventListener('message', handler);
                        toast.success('Google autenticado. Creando documento...');
                        handleOpenInDocs();
                    }
                };
                window.addEventListener('message', handler);
                return;
            }
            if ('url' in result) {
                window.open(result.url, '_blank');
                toast.success('Google Doc creado');
            }
        } catch (err: unknown) {
            toast.error(getApiErrorMessage(err, 'No se pudo crear el Google Doc'));
        } finally {
            setIsOpeningDocs(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-0 sm:p-2">
            <div className="flex h-full sm:h-[96vh] w-full max-w-6xl flex-col rounded-none sm:rounded-2xl bg-white shadow-2xl dark:bg-gray-900 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-200 px-3 sm:px-5 py-2.5 dark:border-gray-700 shrink-0 bg-white dark:bg-gray-900">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30 shrink-0">
                            <CustomIcon name="file-pdf" size="xs" tone="rose" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                                {projectName}
                            </h2>
                            {pageCount > 0 && (
                                <p className="text-[11px] text-gray-400 dark:text-gray-500">
                                    {pageCount} pagina{pageCount > 1 ? 's' : ''}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                        {/* Zoom controls */}
                        {pageCount > 0 && (
                            <>
                                <div className="hidden sm:flex items-center gap-0.5 rounded-lg border border-gray-200 bg-gray-50 px-1.5 py-0.5 dark:border-gray-700 dark:bg-gray-800">
                                    <button
                                        onClick={() => setZoom(Math.max(30, zoom - 10))}
                                        className="flex h-6 w-6 items-center justify-center rounded text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 text-xs font-bold"
                                    >
                                        -
                                    </button>
                                    <span className="w-9 text-center text-[11px] font-medium text-gray-500 dark:text-gray-400">{zoom}%</span>
                                    <button
                                        onClick={() => setZoom(Math.min(200, zoom + 10))}
                                        className="flex h-6 w-6 items-center justify-center rounded text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 text-xs font-bold"
                                    >
                                        +
                                    </button>
                                </div>
                                <button
                                    onClick={() => setZoom(80)}
                                    className="hidden sm:flex h-7 items-center rounded-lg px-2 text-[11px] font-medium text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                                >
                                    Ajustar
                                </button>
                                <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 hidden sm:block" />
                            </>
                        )}

                        {/* Editar en Google Docs */}
                        <button
                            onClick={handleOpenInDocs}
                            disabled={isOpeningDocs}
                            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
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
                            <span className="hidden sm:inline">{isOpeningDocs ? 'Abriendo...' : 'Editar en Docs'}</span>
                        </button>

                        {/* Editar PDF */}
                        <button
                            onClick={handleEdit}
                            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
                        >
                            <CustomIcon name="pencil" size="xs" tone="cream" />
                            <span className="hidden sm:inline">Editar PDF</span>
                        </button>

                        {/* Descargar */}
                        <button
                            onClick={handleDownload}
                            className="flex items-center gap-1.5 rounded-lg bg-[#17324a] px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#1d3d5c]"
                        >
                            <CustomIcon name="download" size="xs" tone="white" />
                            <span className="hidden sm:inline">Descargar</span>
                        </button>

                        {/* Cerrar */}
                        <button
                            onClick={onClose}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-white transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                        >
                            <CustomIcon name="x-circle" size="xs" tone="mist" />
                        </button>
                    </div>
                </div>

                {/* PDF Pages area */}
                <div
                    ref={containerRef}
                    className="flex-1 overflow-auto bg-[#4b5563] dark:bg-[#0f172a]"
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
                            className="h-full overflow-auto flex flex-col items-center"
                            style={{ padding: `${32 / (zoom / 100)}px ${16 / (zoom / 100)}px` }}
                        >
                            <div
                                style={{
                                    transform: `scale(${zoom / 100})`,
                                    transformOrigin: 'top center',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: `${PAGE_GAP}px`,
                                }}
                            >
                                {Array.from({ length: pageCount }, (_, i) => i + 1).map((pageNum) => (
                                    <div key={pageNum} className="relative">
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
                                        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[11px] font-medium text-gray-400 dark:text-gray-500">
                                            {pageNum}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {/* Bottom spacer for last page */}
                            <div style={{ height: '40px' }} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
