import { useEffect, useRef, useCallback } from 'react';
import { Canvas, Textbox, Rect, Circle, Line, FabricImage } from 'fabric';
import { useEditorStore } from '../store';
import { CANVAS_DEFAULTS } from '../constants';

export function useEditorCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fabricRef = useRef<Canvas | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const {
    markDirty,
    pushHistory,
    selectObject,
    clearSelection,
  } = useEditorStore();

  const saveSnapshot = useCallback(() => {
    if (!fabricRef.current) return;
    const json = JSON.stringify(fabricRef.current.toJSON());
    pushHistory(json);
  }, [pushHistory]);

  const initCanvas = useCallback(() => {
    if (!canvasRef.current || fabricRef.current) return;

    const canvas = new Canvas(canvasRef.current, {
      width: 800,
      height: 600,
      backgroundColor: CANVAS_DEFAULTS.backgroundColor,
      selection: CANVAS_DEFAULTS.selection,
      preserveObjectStacking: CANVAS_DEFAULTS.preserveObjectStacking,
      enableRetinaScaling: CANVAS_DEFAULTS.enableRetinaScaling,
    });

    fabricRef.current = canvas;

    canvas.on('selection:created', () => {
      const active = canvas.getActiveObject();
      if (active) {
        selectObject(String(Math.random()));
      }
    });

    canvas.on('selection:updated', () => {
      const active = canvas.getActiveObject();
      if (active) {
        selectObject(String(Math.random()));
      }
    });

    canvas.on('selection:cleared', () => {
      clearSelection();
    });

    canvas.on('object:modified', () => {
      markDirty();
      saveSnapshot();
    });

    canvas.on('object:added', () => {
      markDirty();
    });

    return canvas;
  }, [selectObject, clearSelection, markDirty, saveSnapshot]);

  const loadSnapshot = useCallback((json: string) => {
    if (!fabricRef.current) return;
    const c = fabricRef.current as unknown as { loadFromJSON: (json: string) => Promise<Canvas> };
    c.loadFromJSON(json).then(() => {
      fabricRef.current?.renderAll();
    });
  }, []);

  const setZoom = useCallback((zoom: number) => {
    if (!fabricRef.current) return;
    const center = fabricRef.current.getVpCenter();
    fabricRef.current.zoomToPoint(center, zoom / 100);
    fabricRef.current.renderAll();
  }, []);

  const addText = useCallback((text: string, options?: Record<string, unknown>) => {
    if (!fabricRef.current) return;
    const textbox = new Textbox(text, {
      left: 100,
      top: 100,
      fontSize: 16,
      fontFamily: 'Inter',
      fill: '#000000',
      width: 200,
      ...options,
    });
    fabricRef.current.add(textbox);
    fabricRef.current.setActiveObject(textbox);
    fabricRef.current.renderAll();
    markDirty();
    saveSnapshot();
  }, [markDirty, saveSnapshot]);

  const addRect = useCallback((options?: Record<string, unknown>) => {
    if (!fabricRef.current) return;
    const rect = new Rect({
      left: 100,
      top: 100,
      width: 150,
      height: 100,
      fill: 'transparent',
      stroke: '#000000',
      strokeWidth: 2,
      ...options,
    });
    fabricRef.current.add(rect);
    fabricRef.current.setActiveObject(rect);
    fabricRef.current.renderAll();
    markDirty();
    saveSnapshot();
  }, [markDirty, saveSnapshot]);

  const addCircle = useCallback((options?: Record<string, unknown>) => {
    if (!fabricRef.current) return;
    const circle = new Circle({
      left: 100,
      top: 100,
      radius: 50,
      fill: 'transparent',
      stroke: '#000000',
      strokeWidth: 2,
      ...options,
    });
    fabricRef.current.add(circle);
    fabricRef.current.setActiveObject(circle);
    fabricRef.current.renderAll();
    markDirty();
    saveSnapshot();
  }, [markDirty, saveSnapshot]);

  const addLine = useCallback((options?: Record<string, unknown>) => {
    if (!fabricRef.current) return;
    const line = new Line([100, 100, 300, 100], {
      stroke: '#000000',
      strokeWidth: 2,
      ...options,
    });
    fabricRef.current.add(line);
    fabricRef.current.setActiveObject(line);
    fabricRef.current.renderAll();
    markDirty();
    saveSnapshot();
  }, [markDirty, saveSnapshot]);

  const addImage = useCallback((url: string, options?: Record<string, unknown>) => {
    if (!fabricRef.current) return;
    FabricImage.fromURL(url).then((img) => {
      img.set({
        left: 100,
        top: 100,
        ...options,
      });
      fabricRef.current?.add(img);
      fabricRef.current?.setActiveObject(img);
      fabricRef.current?.renderAll();
      markDirty();
      saveSnapshot();
    });
  }, [markDirty, saveSnapshot]);

  const deleteSelected = useCallback(() => {
    if (!fabricRef.current) return;
    const active = fabricRef.current.getActiveObjects();
    if (active.length > 0) {
      active.forEach((obj) => fabricRef.current?.remove(obj));
      fabricRef.current.discardActiveObject();
      fabricRef.current.renderAll();
      markDirty();
      saveSnapshot();
    }
  }, [markDirty, saveSnapshot]);

  const duplicateSelected = useCallback(() => {
    if (!fabricRef.current) return;
    const active = fabricRef.current.getActiveObject();
    if (!active) return;

    active.clone().then((cloned) => {
      cloned.set({
        left: (active.left || 0) + 20,
        top: (active.top || 0) + 20,
      });
      fabricRef.current?.add(cloned);
      fabricRef.current?.setActiveObject(cloned);
      fabricRef.current?.renderAll();
      markDirty();
      saveSnapshot();
    });
  }, [markDirty, saveSnapshot]);

  const renderAll = useCallback(() => {
    fabricRef.current?.renderAll();
  }, []);

  const getCanvas = useCallback(() => fabricRef.current, []);

  const clearCanvas = useCallback(() => {
    if (!fabricRef.current) return;
    fabricRef.current.clear();
    fabricRef.current.backgroundColor = CANVAS_DEFAULTS.backgroundColor;
    fabricRef.current.renderAll();
  }, []);

  useEffect(() => {
    return () => {
      if (fabricRef.current) {
        fabricRef.current.dispose();
        fabricRef.current = null;
      }
    };
  }, []);

  return {
    canvasRef,
    fabricRef,
    containerRef,
    initCanvas,
    getCanvas,
    setZoom,
    addText,
    addRect,
    addCircle,
    addLine,
    addImage,
    deleteSelected,
    duplicateSelected,
    renderAll,
    clearCanvas,
    saveSnapshot,
    loadSnapshot,
  };
}
