import { useEffect, useCallback, useRef, useState } from 'react';
import { Canvas, FabricImage } from 'fabric';
import { useEditorCanvas } from '../../hooks/useEditorCanvas';
import { useTextTool } from '../../hooks/useTextTool';
import { useShapeTool } from '../../hooks/useShapeTool';
import { useDrawTool } from '../../hooks/useDrawTool';
import { useMeasureTool } from '../../hooks/useMeasureTool';
import { useTouchGestures } from '../../hooks/useTouchGestures';
import { useEditorStore } from '../../store';
import { EDITOR_TOOLS } from '../../constants';
import { CanvasToolbar } from './CanvasToolbar';

interface EditorCanvasProps {
  onCanvasReady?: (getCanvas: () => Canvas | null) => void;
}

type ShapeType = 'rect' | 'circle' | 'line' | 'arrow';

export function EditorCanvas({ onCanvasReady }: EditorCanvasProps) {
  const { viewport, selection, pages, currentPageIndex } = useEditorStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [toolbarPosition, setToolbarPosition] = useState<{ x: number; y: number } | null>(null);
  const [toolbarVisible, setToolbarVisible] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });

  const {
    canvasRef,
    fabricRef,
    initCanvas,
    getCanvas,
    setZoom,
    loadSnapshot,
  } = useEditorCanvas();

  const textTool = useTextTool(fabricRef);
  const shapeTool = useShapeTool(fabricRef);
  const drawTool = useDrawTool(fabricRef);
  const measureTool = useMeasureTool(fabricRef);

  useTouchGestures({ canvas: getCanvas(), enabled: selection.tool === 'hand' });

  useEffect(() => {
    initCanvas();
    if (onCanvasReady) {
      onCanvasReady(getCanvas);
    }
  }, []);

  // Track container size
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Render PDF page background + auto-fit zoom
  useEffect(() => {
    const canvas = getCanvas();
    if (!canvas || pages.length === 0 || containerSize.width === 0) return;

    const page = pages[currentPageIndex];
    if (!page?.backgroundDataUrl) return;

    // Calculate fit-to-container zoom
    const padding = 40;
    const availW = containerSize.width - padding * 2;
    const availH = containerSize.height - padding * 2;
    const scaleX = availW / page.width;
    const scaleY = availH / page.height;
    const fitZoom = Math.min(scaleX, scaleY, 1) * 100;

    // Set canvas size to page dimensions (logical, not display)
    canvas.setDimensions({ width: page.width, height: page.height });

    // Apply fit zoom through store
    const store = useEditorStore.getState();
    store.setZoom(fitZoom);

    FabricImage.fromURL(page.backgroundDataUrl).then((img) => {
      img.set({
        left: 0,
        top: 0,
        selectable: false,
        evented: false,
        hoverCursor: 'default',
        excludeFromExport: false,
      });
      // Remove existing background images
      const objects = canvas.getObjects();
      const bgImages = objects.filter((obj) => (obj as unknown as Record<string, unknown>)._isPdfBg === true);
      bgImages.forEach((obj) => canvas.remove(obj));

      (img as unknown as Record<string, unknown>)._isPdfBg = true;
      canvas.add(img);
      canvas.sendObjectToBack(img);
      canvas.renderAll();
    }).catch((err) => {
      console.error('[EditorCanvas] Failed to render PDF background:', err);
    });
  }, [pages, currentPageIndex, getCanvas, containerSize]);

  useEffect(() => {
    setZoom(viewport.zoom);
  }, [viewport.zoom, setZoom]);

  useEffect(() => {
    const handleRestoreSnapshot = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail) {
        loadSnapshot(customEvent.detail);
      }
    };

    window.addEventListener('editor:restore-snapshot', handleRestoreSnapshot);
    return () => {
      window.removeEventListener('editor:restore-snapshot', handleRestoreSnapshot);
    };
  }, [loadSnapshot]);

  useEffect(() => {
    const canvas = getCanvas();
    if (!canvas) return;

    const handleSelection = () => {
      const active = canvas.getActiveObject();
      if (active) {
        const bounds = active.getBoundingRect();
        setToolbarPosition({ x: bounds.left, y: bounds.top });
        setToolbarVisible(true);
      } else {
        setToolbarVisible(false);
      }
    };

    const handleClearSelection = () => setToolbarVisible(false);

    canvas.on('selection:created', handleSelection);
    canvas.on('selection:updated', handleSelection);
    canvas.on('selection:cleared', handleClearSelection);

    return () => {
      canvas.off('selection:created', handleSelection);
      canvas.off('selection:updated', handleSelection);
      canvas.off('selection:cleared', handleClearSelection);
    };
  }, [getCanvas, viewport.zoom]);

  useEffect(() => {
    const canvas = getCanvas();
    if (!canvas) return;

    if (selection.tool === 'draw') {
      drawTool.startDrawing();
    } else if (selection.tool === 'measure') {
      canvas.isDrawingMode = false;
    } else {
      canvas.isDrawingMode = false;
    }
  }, [selection.tool, getCanvas]);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = getCanvas();
      if (!canvas) return;

      const tool = selection.tool;
      const pointer = canvas.getScenePoint(e.nativeEvent);

      switch (tool) {
        case 'text':
          textTool.createText(pointer.x, pointer.y);
          break;
        case 'rectangle':
          shapeTool.createRect(pointer.x, pointer.y);
          break;
        case 'circle':
          shapeTool.createCircle(pointer.x, pointer.y);
          break;
        case 'line':
          shapeTool.createLine(pointer.x, pointer.y, pointer.x + 150, pointer.y);
          break;
        case 'arrow':
          shapeTool.createArrow(pointer.x, pointer.y, pointer.x + 150, pointer.y);
          break;
      }
    },
    [selection.tool, getCanvas, textTool, shapeTool]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const tool = selection.tool;
      const canvas = getCanvas();
      if (!canvas) return;

      if (tool === 'rectangle' || tool === 'circle' || tool === 'line' || tool === 'arrow') {
        const pointer = canvas.getScenePoint(e.nativeEvent);
        const shapeType: ShapeType = tool === 'rectangle' ? 'rect' : tool;
        shapeTool.startDrawShape(pointer.x, pointer.y, shapeType);
      } else if (tool === 'measure') {
        const pointer = canvas.getScenePoint(e.nativeEvent);
        measureTool.startMeasure(pointer.x, pointer.y);
      }
    },
    [selection.tool, getCanvas, shapeTool, measureTool]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const tool = selection.tool;
      if (tool === 'rectangle' || tool === 'circle' || tool === 'line' || tool === 'arrow') {
        const canvas = getCanvas();
        if (!canvas) return;
        const pointer = canvas.getScenePoint(e.nativeEvent);
        const shapeType: ShapeType = tool === 'rectangle' ? 'rect' : tool;
        shapeTool.updateDrawShape(pointer.x, pointer.y, shapeType);
      }
    },
    [selection.tool, getCanvas, shapeTool]
  );

  const handleMouseUp = useCallback(() => {
    const tool = selection.tool;
    if (tool === 'rectangle' || tool === 'circle' || tool === 'line' || tool === 'arrow') {
      shapeTool.finishDrawShape();
    }
  }, [selection.tool, shapeTool]);

  const handleRefreshToolbar = useCallback(() => {
    const canvas = getCanvas();
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (active) {
      const bounds = active.getBoundingRect();
      setToolbarPosition({ x: bounds.left, y: bounds.top });
    }
  }, [getCanvas]);

  const currentTool = EDITOR_TOOLS[selection.tool];

  return (
    <div
      ref={containerRef}
      className="relative flex-1 overflow-auto bg-gray-100 dark:bg-gray-900 flex items-center justify-center"
    >
      <canvas
        ref={canvasRef}
        id="editor-canvas"
        className="shadow-2xl"
        style={{
          cursor: currentTool?.cursor || 'default',
          transform: `scale(${viewport.zoom / 100})`,
          transformOrigin: 'center center',
        }}
        onClick={handleCanvasClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      />

      <CanvasToolbar
        canvas={getCanvas()}
        position={toolbarPosition}
        visible={toolbarVisible}
        onRefresh={handleRefreshToolbar}
      />
    </div>
  );
}
