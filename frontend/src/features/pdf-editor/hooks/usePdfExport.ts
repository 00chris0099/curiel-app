import { useCallback } from 'react';
import { PDFDocument } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { useEditorStore } from '../store';
import type { Canvas as FabricCanvas } from 'fabric';

export function usePdfExport() {
  const { pages, currentPageIndex } = useEditorStore();

  const exportToPdf = useCallback(
    async (canvas: FabricCanvas, options?: { pageIndex?: number; allPages?: boolean }) => {
      const pdfDoc = await PDFDocument.create();
      pdfDoc.registerFontkit(fontkit);

      const pagesToExport = options?.allPages
        ? pages
        : [pages[options?.pageIndex ?? currentPageIndex]];

      for (const page of pagesToExport) {
        const pdfPage = pdfDoc.addPage([page.width, page.height]);

        const fabricCanvas = canvas;
        if (!fabricCanvas) continue;

        const dataUrl = fabricCanvas.toDataURL({
          format: 'png',
          quality: 1,
          multiplier: 2,
        });

        const imageBytes = Uint8Array.from(atob(dataUrl.split(',')[1]), (c) =>
          c.charCodeAt(0)
        );
        const image = await pdfDoc.embedPng(imageBytes);

        pdfPage.drawImage(image, {
          x: 0,
          y: 0,
          width: page.width,
          height: page.height,
        });
      }

      const pdfBytes = await pdfDoc.save();
      return pdfBytes;
    },
    [pages, currentPageIndex]
  );

  const downloadPdf = useCallback(
    async (canvas: FabricCanvas, filename: string, options?: { pageIndex?: number; allPages?: boolean }) => {
      const pdfBytes = await exportToPdf(canvas, options);
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
    },
    [exportToPdf]
  );

  return {
    exportToPdf,
    downloadPdf,
  };
}
