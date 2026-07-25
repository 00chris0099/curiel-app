import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type { Canvas as FabricCanvas } from 'fabric';

interface ExportOptions {
  pages: Array<{
    id: string;
    width: number;
    height: number;
    fabricJson?: string;
  }>;
  canvas: FabricCanvas | null;
  pageRange?: { start: number; end: number };
  quality?: 'low' | 'medium' | 'high';
}

function getQualityScale(quality: 'low' | 'medium' | 'high'): number {
  switch (quality) {
    case 'low': return 1;
    case 'medium': return 1.5;
    case 'high': return 2;
    default: return 1.5;
  }
}

export async function exportPdf(options: ExportOptions): Promise<Uint8Array> {
  const { pages, canvas, pageRange, quality = 'medium' } = options;
  const scale = getQualityScale(quality);

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const start = pageRange?.start ?? 0;
  const end = pageRange?.end ?? pages.length - 1;

  for (let i = start; i <= end && i < pages.length; i++) {
    const page = pages[i];
    const pdfPage = pdfDoc.addPage([page.width, page.height]);

    if (page.fabricJson && canvas) {
      try {
        await canvas.loadFromJSON(page.fabricJson);
        canvas.renderAll();

        const dataUrl = canvas.toDataURL({
          format: 'png',
          quality: quality === 'high' ? 1 : quality === 'medium' ? 0.8 : 0.5,
          multiplier: scale,
        });

        const imgBytes = await fetch(dataUrl).then((res) => res.arrayBuffer());
        const img = await pdfDoc.embedPng(imgBytes);
        pdfPage.drawImage(img, {
          x: 0,
          y: 0,
          width: page.width,
          height: page.height,
        });
      } catch {
        pdfPage.drawText(`Página ${i + 1}`, {
          x: 50,
          y: page.height - 50,
          size: 14,
          font,
          color: rgb(0.5, 0.5, 0.5),
        });
      }
    } else {
      pdfPage.drawText(`Página ${i + 1}`, {
        x: 50,
        y: page.height - 50,
        size: 14,
        font,
        color: rgb(0.5, 0.5, 0.5),
      });
    }
  }

  return pdfDoc.save();
}

export function downloadPdf(pdfBytes: Uint8Array, filename: string) {
  const bytes = new Uint8Array(pdfBytes);
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
