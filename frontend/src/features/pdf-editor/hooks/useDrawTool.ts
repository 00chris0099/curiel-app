import { useRef, useCallback } from 'react';
import { Canvas, PencilBrush } from 'fabric';
import { useEditorStore } from '../store';

type DrawMode = 'pen' | 'marker' | 'eraser';

interface DrawToolOptions {
  color?: string;
  width?: number;
  mode?: DrawMode;
  opacity?: number;
}

export function useDrawTool(fabricRef: React.MutableRefObject<Canvas | null>) {
  const { markDirty, pushHistory } = useEditorStore();
  const optionsRef = useRef<DrawToolOptions>({
    color: '#000000',
    width: 3,
    mode: 'pen',
    opacity: 1,
  });

  const setOptions = useCallback((options: DrawToolOptions) => {
    optionsRef.current = { ...optionsRef.current, ...options };
  }, []);

  const startDrawing = useCallback(() => {
    if (!fabricRef.current) return;

    const canvas = fabricRef.current;
    const opts = optionsRef.current;

    canvas.isDrawingMode = true;

    const brush = new PencilBrush(canvas);
    brush.color = opts.mode === 'eraser' ? '#ffffff' : (opts.color || '#000000');
    brush.width = opts.mode === 'marker' ? (opts.width || 3) * 4 : (opts.width || 3);

    canvas.freeDrawingBrush = brush;
    canvas.renderAll();
  }, [fabricRef]);

  const stopDrawing = useCallback(() => {
    if (!fabricRef.current) return;

    fabricRef.current.isDrawingMode = false;
    fabricRef.current.freeDrawingBrush = undefined;
    fabricRef.current.renderAll();

    markDirty();
    const json = JSON.stringify(fabricRef.current.toJSON());
    pushHistory(json);
  }, [fabricRef, markDirty, pushHistory]);

  const setColor = useCallback(
    (color: string) => {
      optionsRef.current.color = color;
      if (fabricRef.current?.freeDrawingBrush) {
        fabricRef.current.freeDrawingBrush.color = color;
      }
    },
    [fabricRef]
  );

  const setWidth = useCallback(
    (width: number) => {
      optionsRef.current.width = width;
      if (fabricRef.current?.freeDrawingBrush) {
        const mode = optionsRef.current.mode;
        fabricRef.current.freeDrawingBrush.width = mode === 'marker' ? width * 4 : width;
      }
    },
    [fabricRef]
  );

  const setMode = useCallback(
    (mode: DrawMode) => {
      optionsRef.current.mode = mode;
      if (fabricRef.current?.freeDrawingBrush) {
        const brush = fabricRef.current.freeDrawingBrush;
        brush.color = mode === 'eraser' ? '#ffffff' : (optionsRef.current.color || '#000000');
        brush.width = mode === 'marker' ? (optionsRef.current.width || 3) * 4 : (optionsRef.current.width || 3);
      }
    },
    [fabricRef]
  );

  return {
    startDrawing,
    stopDrawing,
    setColor,
    setWidth,
    setMode,
    setOptions,
  };
}
