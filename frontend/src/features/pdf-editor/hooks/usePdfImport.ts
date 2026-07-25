import { useState, useCallback } from 'react';
import { getPdfDocument, renderPageToCanvas, getPageDimensions } from '../utils';
import { useEditorStore } from '../store';
import type { Page } from '../types';
import { generateId } from '../utils';
import type { PDFDocumentProxy } from 'pdfjs-dist';

export function usePdfImport() {
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const { setPages, setLoading, setError } = useEditorStore();

  const loadPdf = useCallback(
    async (data: ArrayBuffer) => {
      setLoading(true);
      setError(null);

      try {
        const doc = await getPdfDocument(data);
        setPdfDoc(doc);

        const pages: Page[] = [];
        for (let i = 0; i < doc.numPages; i++) {
          const dims = await getPageDimensions(doc, i);

          // Render page to a temp canvas and get data URL
          let backgroundDataUrl: string | undefined;
          try {
            const tempCanvas = document.createElement('canvas');
            const scale = 2;
            await renderPageToCanvas(doc, i, tempCanvas, scale);
            backgroundDataUrl = tempCanvas.toDataURL('image/png');
          } catch {
            // If render fails, page will show without background
          }

          pages.push({
            id: generateId(),
            index: i,
            width: dims.width,
            height: dims.height,
            backgroundDataUrl,
            rotation: 0,
            isVisible: true,
            isDirty: false,
          });
        }

        setPages(pages);
        return doc;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Error al cargar PDF';
        setError(message);
        return null;
      }
    },
    [setPages, setLoading, setError]
  );

  const loadPdfFromUrl = useCallback(
    async (url: string) => {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      return loadPdf(arrayBuffer);
    },
    [loadPdf]
  );

  const loadPdfFromFile = useCallback(
    async (file: File) => {
      const arrayBuffer = await file.arrayBuffer();
      return loadPdf(arrayBuffer);
    },
    [loadPdf]
  );

  const renderPage = useCallback(
    async (pageIndex: number, canvas: HTMLCanvasElement, scale: number = 1.5) => {
      if (!pdfDoc) return null;
      return renderPageToCanvas(pdfDoc, pageIndex, canvas, scale);
    },
    [pdfDoc]
  );

  return {
    pdfDoc,
    loadPdf,
    loadPdfFromUrl,
    loadPdfFromFile,
    renderPage,
  };
}
