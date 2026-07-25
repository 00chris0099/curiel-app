import { useRef, useEffect, useCallback } from 'react';
import { Canvas as FabricCanvas, Point } from 'fabric';

interface TouchGesturesOptions {
  canvas: FabricCanvas | null;
  enabled?: boolean;
}

export function useTouchGestures({ canvas, enabled = true }: TouchGesturesOptions) {
  const lastTouchDistanceRef = useRef<number>(0);
  const lastTouchCenterRef = useRef<{ x: number; y: number } | null>(null);
  const isPinchingRef = useRef(false);

  const getTouchDistance = useCallback((touches: TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  const getTouchCenter = useCallback((touches: TouchList) => {
    if (touches.length < 2) return { x: 0, y: 0 };
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2,
    };
  }, []);

  useEffect(() => {
    if (!canvas || !enabled) return;

    const lowerCanvas = canvas.lowerCanvasEl;
    if (!lowerCanvas) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        isPinchingRef.current = true;
        lastTouchDistanceRef.current = getTouchDistance(e.touches);
        lastTouchCenterRef.current = getTouchCenter(e.touches);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPinchingRef.current || e.touches.length !== 2) return;

      e.preventDefault();

      const currentDistance = getTouchDistance(e.touches);
      const currentCenter = getTouchCenter(e.touches);

      if (lastTouchDistanceRef.current > 0) {
        const scale = currentDistance / lastTouchDistanceRef.current;
        const zoom = canvas.getZoom() * scale;
        const clampedZoom = Math.min(Math.max(zoom, 10), 500);

        const center = new Point(currentCenter.x, currentCenter.y);
        canvas.zoomToPoint(center, clampedZoom);
      }

      if (lastTouchCenterRef.current) {
        const dx = currentCenter.x - lastTouchCenterRef.current.x;
        const dy = currentCenter.y - lastTouchCenterRef.current.y;
        const vpt = canvas.viewportTransform;
        if (vpt) {
          vpt[4] += dx;
          vpt[5] += dy;
          canvas.requestRenderAll();
        }
      }

      lastTouchDistanceRef.current = currentDistance;
      lastTouchCenterRef.current = currentCenter;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        isPinchingRef.current = false;
        lastTouchDistanceRef.current = 0;
        lastTouchCenterRef.current = null;
      }
    };

    lowerCanvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    lowerCanvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    lowerCanvas.addEventListener('touchend', handleTouchEnd);

    return () => {
      lowerCanvas.removeEventListener('touchstart', handleTouchStart);
      lowerCanvas.removeEventListener('touchmove', handleTouchMove);
      lowerCanvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [canvas, enabled, getTouchDistance, getTouchCenter]);
}
