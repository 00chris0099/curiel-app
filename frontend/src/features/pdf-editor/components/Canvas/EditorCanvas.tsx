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
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [toolbarPosition, setToolbarPosition] = useState<{ x: number; y: number } | null>(null);
  const [toolbarVisible, setToolbarVisible] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const bgImageRef = useRef<FabricImage | null>(null);

  const {
    canvasRef,
    fabricRef,
    initCanvas,
    getCanvas,
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

  // Load PDF page background
  useEffect(() => {
    const canvas = getCanvas();
    if (!canvas || pages.length === 0) return;

    const page = pages[currentPageIndex];
    if (!page?.backgroundDataUrl) return;

    // Use PDF point dimensions for canvas (not rendered 2x)
    const pageW = page.width;
    const pageH = page.height;

    // Set canvas to PDF point dimensions
    canvas.setDimensions({ width: pageW, height: pageH });
    canvas.backgroundColor = '#ffffff';
    canvas.renderAll();

    // Load background image
    FabricImage.fromURL(page.backgroundDataUrl).then((img) => {
      img.set({
        selectable: false,
        evented: false,
        hoverCursor: 'default',
        excludeFromExport: false,
      });
      bgImageRef.current = img;
      canvas.backgroundImage = img;
      canvas.renderAll();

      // Auto-fit zoom after background loads
      fitToContainer();
    }).catch((err) => {
      console.error('[EditorCanvas] Failed to load background:', err);
    });
  }, [pages, currentPageIndex, getCanvas]);

  // Fit to container: calculate zoom so page fills available space with padding
  const fitToContainer = useCallback(() => {
    const canvas = getCanvas();
    const page = pages[currentPageIndex];
    if (!canvas || !page || containerSize.width === 0) return;

    const pageW = page.width;
    const pageH = page.height;
    const padding = 60;
    const availW = containerSize.width - padding * 2;
    const availH = containerSize.height - padding * 2;

    // Fit to container, but don't zoom past 100%
    const fitZoom = Math.min(availW / pageW, availH / pageH, 1) * 100;

    const store = useEditorStore.getState();
    store.setZoom(fitZoom);
  }, [getCanvas, pages, currentPageIndex, containerSize]);

  // Apply zoom via CSS transform on the canvas element
  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;

    const zoomRatio = viewport.zoom / 100;
    canvasEl.style.transform = `scale(${zoomRatio})`;
    canvasEl.style.transformOrigin = 'top left';
  }, [viewport.zoom, canvasRef]);

  // Scroll to center the page when zoom changes or page loads
  useEffect(() => {
    const wrapper = wrapperRef.current;
    const page = pages[currentPageIndex];
    if (!wrapper || !page) return;

    const zoomRatio = viewport.zoom / 100;
    const scaledW = page.width * zoomRatio;
    const scaledH = page.height * zoomRatio;

    // Center the page in the container
    const scrollX = Math.max(0, (scaledW - wrapper.clientWidth) / 2);
    const scrollY = Math.max(0, (scaledH - wrapper.clientHeight) / 2);

    // Small delay to let the DOM update
    requestAnimationFrame(() => {
      wrapper.scrollLeft = scrollX;
      wrapper.scrollTop = scrollY;
    });
  }, [viewport.zoom, pages, currentPageIndex, containerSize]);

  // Handle wheel zoom (Ctrl+scroll)
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const store = useEditorStore.getState();
        const delta = e.deltaY > 0 ? -5 : 5;
        const newZoom = Math.min(Math.max(store.viewport.zoom + delta, 10), 400);
        store.setZoom(newZoom);
      }
    };

    wrapper.addEventListener('wheel', handleWheel, { passive: false });
    return () => wrapper.removeEventListener('wheel', handleWheel);
  }, []);

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
  const page = pages[currentPageIndex];
  const zoomRatio = viewport.zoom / 100;
  const scaledWidth = page ? page.width * zoomRatio : 800;
  const scaledHeight = page ? page.height * zoomRatio : 600;

  return (
    <div
      ref={containerRef}
      className="relative flex-1 overflow-hidden bg-gray-200 dark:bg-gray-800"
    >
      {/* Scrollable wrapper */}
      <div
        ref={wrapperRef}
        className="w-full h-full overflow-auto"
        style={{
          cursor: currentTool?.cursor || 'default',
        }}
      >
        {/* Spacer to enable scroll — sized to the scaled canvas */}
        <div
          style={{
            minWidth: scaledWidth + 80,
            minHeight: scaledHeight + 80,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
            padding: '40px',
          }}
        >
          <canvas
            ref={canvasRef}
            id="editor-canvas"
            style={{
              boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
              transform: `scale(${zoomRatio})`,
              transformOrigin: 'top left',
              flexShrink: 0,
            }}
            onClick={handleCanvasClick}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          />
        </div>
      </div>

      <CanvasToolbar
        canvas={getCanvas()}
        position={toolbarPosition}
        visible={toolbarVisible}
        onRefresh={handleRefreshToolbar}
      />
    </div>
  );
}
