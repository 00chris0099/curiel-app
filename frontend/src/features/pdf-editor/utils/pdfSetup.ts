import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';

let isInitialized = false;

export function initPdfWorker(): void {
  if (isInitialized) return;

  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();

  isInitialized = true;
}

export async function getPdfDocument(data: ArrayBuffer): Promise<PDFDocumentProxy> {
  initPdfWorker();
  const loadingTask = pdfjsLib.getDocument({ data });
  return loadingTask.promise;
}

export async function renderPageToCanvas(
  pdfDoc: PDFDocumentProxy,
  pageIndex: number,
  canvas: HTMLCanvasElement,
  scale: number = 1.5
): Promise<{ width: number; height: number }> {
  const page: PDFPageProxy = await pdfDoc.getPage(pageIndex + 1);
  const viewport = page.getViewport({ scale });

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({ canvas, viewport }).promise;

  return { width: viewport.width, height: viewport.height };
}

export async function getPageDimensions(
  pdfDoc: PDFDocumentProxy,
  pageIndex: number,
  scale: number = 1
): Promise<{ width: number; height: number }> {
  const page: PDFPageProxy = await pdfDoc.getPage(pageIndex + 1);
  const viewport = page.getViewport({ scale });
  return { width: viewport.width, height: viewport.height };
}

export async function getPageTextContent(
  pdfDoc: PDFDocumentProxy,
  pageIndex: number
): Promise<string> {
  const page: PDFPageProxy = await pdfDoc.getPage(pageIndex + 1);
  const textContent = await page.getTextContent();
  return textContent.items
    .filter((item) => 'str' in item)
    .map((item) => (item as { str: string }).str)
    .join(' ');
}

export async function getAllPagesTextContent(
  pdfDoc: PDFDocumentProxy
): Promise<Map<number, string>> {
  const result = new Map<number, string>();
  const numPages = pdfDoc.numPages;

  for (let i = 0; i < numPages; i++) {
    const text = await getPageTextContent(pdfDoc, i);
    result.set(i, text);
  }

  return result;
}

export function convertPdfPageToDataUrl(
  canvas: HTMLCanvasElement
): string {
  return canvas.toDataURL('image/png');
}
