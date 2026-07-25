import { useRef, useEffect, useCallback } from 'react';
import { Canvas as FabricCanvas } from 'fabric';

interface MinimapProps {
  canvas: FabricCanvas | null;
  zoom: number;
  viewportWidth: number;
  viewportHeight: number;
  className?: string;
}

export function Minimap({ canvas, zoom, viewportWidth, viewportHeight, className = '' }: MinimapProps) {
  const minimapRef = useRef<HTMLCanvasElement>(null);

  const MINIMAP_WIDTH = 180;
  const MINIMAP_HEIGHT = 120;

  const updateMinimap = useCallback(() => {
    if (!canvas || !minimapRef.current) return;

    const ctx = minimapRef.current.getContext('2d');
    if (!ctx) return;

    const canvasWidth = canvas.getWidth();
    const canvasHeight = canvas.getHeight();

    const scaleX = MINIMAP_WIDTH / canvasWidth;
    const scaleY = MINIMAP_HEIGHT / canvasHeight;
    const scale = Math.min(scaleX, scaleY);

    ctx.clearRect(0, 0, MINIMAP_WIDTH, MINIMAP_HEIGHT);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, MINIMAP_WIDTH, MINIMAP_HEIGHT);

    ctx.save();
    ctx.scale(scale, scale);

    const objects = canvas.getObjects();
    objects.forEach((obj) => {
      const left = obj.left || 0;
      const top = obj.top || 0;
      const width = (obj.width || 50) * (obj.scaleX || 1);
      const height = (obj.height || 50) * (obj.scaleY || 1);

      ctx.fillStyle = '#94a3b8';
      ctx.globalAlpha = 0.6;
      ctx.fillRect(left, top, width, height);
      ctx.globalAlpha = 1;
    });

    ctx.restore();

    const zoomScale = zoom / 100;
    const vpW = (viewportWidth / zoomScale) * scale;
    const vpH = (viewportHeight / zoomScale) * scale;
    const vpX = (canvasWidth / 2 - viewportWidth / 2 / zoomScale) * scale;
    const vpY = (canvasHeight / 2 - viewportHeight / 2 / zoomScale) * scale;

    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.strokeRect(vpX, vpY, vpW, vpH);

    ctx.fillStyle = 'rgba(59, 130, 246, 0.08)';
    ctx.fillRect(vpX, vpY, vpW, vpH);
  }, [canvas, zoom, viewportWidth, viewportHeight]);

  useEffect(() => {
    updateMinimap();
  }, [updateMinimap]);

  useEffect(() => {
    if (!canvas) return;
    const handler = () => updateMinimap();
    canvas.on('object:added', handler);
    canvas.on('object:removed', handler);
    canvas.on('object:modified', handler);
    return () => {
      canvas.off('object:added', handler);
      canvas.off('object:removed', handler);
      canvas.off('object:modified', handler);
    };
  }, [canvas, updateMinimap]);

  const handleMinimapClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!canvas) return;

      const rect = minimapRef.current?.getBoundingClientRect();
      if (!rect) return;

      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      const canvasWidth = canvas.getWidth();
      const canvasHeight = canvas.getHeight();
      const scaleX = MINIMAP_WIDTH / canvasWidth;
      const scaleY = MINIMAP_HEIGHT / canvasHeight;
      const scale = Math.min(scaleX, scaleY);

      const targetX = clickX / scale;
      const targetY = clickY / scale;

      const vpt = canvas.viewportTransform;
      if (vpt) {
        const newVpt = [...vpt] as [number, number, number, number, number, number];
        newVpt[4] = MINIMAP_WIDTH / 2 / scale - targetX * (zoom / 100);
        newVpt[5] = MINIMAP_HEIGHT / 2 / scale - targetY * (zoom / 100);
        canvas.setViewportTransform(newVpt);
        canvas.requestRenderAll();
        updateMinimap();
      }
    },
    [canvas, zoom, updateMinimap]
  );

  const isDraggingRef = useRef(false);
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    handleMinimapClick(e);
  }, [handleMinimapClick]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDraggingRef.current) return;
      handleMinimapClick(e);
    },
    [handleMinimapClick]
  );

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  return (
    <div
      className={`absolute bottom-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}
    >
      <div className="px-2 py-1 bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700">
        <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Mapa
        </span>
      </div>
      <canvas
        ref={minimapRef}
        width={MINIMAP_WIDTH}
        height={MINIMAP_HEIGHT}
        className="cursor-pointer"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
    </div>
  );
}
