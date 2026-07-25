export function screenToCanvas(
  screenX: number,
  screenY: number,
  zoom: number,
  panX: number,
  panY: number
): { x: number; y: number } {
  return {
    x: (screenX - panX) / (zoom / 100),
    y: (screenY - panY) / (zoom / 100),
  };
}

export function canvasToScreen(
  canvasX: number,
  canvasY: number,
  zoom: number,
  panX: number,
  panY: number
): { x: number; y: number } {
  return {
    x: canvasX * (zoom / 100) + panX,
    y: canvasY * (zoom / 100) + panY,
  };
}

export function pdfPointsToPixels(points: number): number {
  return points * (96 / 72);
}

export function pixelsToPdfPoints(pixels: number): number {
  return pixels * (72 / 96);
}

export function calculateZoomToFit(
  containerWidth: number,
  containerHeight: number,
  pageWidth: number,
  pageHeight: number,
  padding: number = 40
): number {
  const scaleX = (containerWidth - padding * 2) / pageWidth;
  const scaleY = (containerHeight - padding * 2) / pageHeight;
  return Math.min(scaleX, scaleY) * 100;
}

export function calculateZoomToWidth(
  containerWidth: number,
  pageWidth: number,
  padding: number = 40
): number {
  return ((containerWidth - padding * 2) / pageWidth) * 100;
}

export function clampZoom(zoom: number, min: number = 10, max: number = 500): number {
  return Math.min(Math.max(zoom, min), max);
}

export function snapToGrid(value: number, gridSize: number = 10): number {
  return Math.round(value / gridSize) * gridSize;
}

export function getDistance(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

export function getAngle(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  return (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
