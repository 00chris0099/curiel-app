import { useEffect, useCallback, useRef, useState, useMemo } from 'react';
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

const PAGE_GAP = 24;

export function EditorCanvas({ onCanvasReady }: EditorCanvasProps) {
  const { viewport, selection, pages, currentPageIndex, setCurrentPage } = useEditorStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [toolbarPosition, setToolbarPosition] = useState<{ x: number; y: number } | null>(null);
  const [toolbarVisible, setToolbarVisible] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const bgImageRef = useRef<FabricImage | null>(null);
  const isScrollingRef = useRef(false);

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

  // Load PDF page background onto the canvas
  useEffect(() => {
    const canvas = getCanvas();
    if (!canvas || pages.length === 0) return;

    const page = pages[currentPageIndex];
    if (!page?.backgroundDataUrl) return;

    const pageW = page.width;
    const pageH = page.height;

    canvas.setDimensions({ width: pageW, height: pageH });
    canvas.backgroundColor = '#ffffff';
    canvas.renderAll();

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

      fitToContainer();
    }).catch((err) => {
      console.error('[EditorCanvas] Failed to load background:', err);
    });
  }, [pages, currentPageIndex, getCanvas]);

  // Fit to container
  const fitToContainer = useCallback(() => {
    const canvas = getCanvas();
    const page = pages[currentPageIndex];
    if (!canvas || !page || containerSize.width === 0) return;

    const pageW = page.width;
    const pageH = page.height;
    const padding = 80;
    const availW = containerSize.width - padding * 2;
    const availH = containerSize.height - padding * 2;

    const fitZoom = Math.min(availW / pageW, availH / pageH, 1) * 100;

    const store = useEditorStore.getState();
    store.setZoom(fitZoom);
  }, [getCanvas, pages, currentPageIndex, containerSize]);

  // Apply zoom via CSS transform
  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;

    const zoomRatio = viewport.zoom / 100;
    canvasEl.style.transform = `scale(${zoomRatio})`;
    canvasEl.style.transformOrigin = 'top left';
  }, [viewport.zoom, canvasRef]);

  // Position the canvas container over the active page placeholder
  useEffect(() => {
    const wrapper = wrapperRef.current;
    const canvasContainer = canvasContainerRef.current;
    if (!wrapper || !canvasContainer || pages.length === 0) return;

    const zoomRatio = viewport.zoom / 100;
    const page = pages[currentPageIndex];
    if (!page) return;

    const scaledW = page.width * zoomRatio;
    const scaledH = page.height * zoomRatio;

    // Calculate the top offset of the current page in the scroll container
    let topOffset = 40; // initial padding
    for (let i = 0; i < currentPageIndex; i++) {
      const p = pages[i];
      if (p) {
        topOffset += p.height * zoomRatio + PAGE_GAP;
      }
    }

    const leftOffset = Math.max(40, (wrapper.clientWidth - scaledW) / 2);

    canvasContainer.style.position = 'absolute';
    canvasContainer.style.left = `${leftOffset}px`;
    canvasContainer.style.top = `${topOffset}px`;
    canvasContainer.style.width = `${scaledW}px`;
    canvasContainer.style.height = `${scaledH}px`;
    canvasContainer.style.zIndex = '10';
  }, [viewport.zoom, pages, currentPageIndex, containerSize]);

  // Scroll to current page when it changes
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper || pages.length === 0) return;

    const zoomRatio = viewport.zoom / 100;
    let topOffset = 40;
    for (let i = 0; i < currentPageIndex; i++) {
      const p = pages[i];
      if (p) {
        topOffset += p.height * zoomRatio + PAGE_GAP;
      }
    }

    requestAnimationFrame(() => {
      wrapper.scrollTo({ top: Math.max(0, topOffset - 40), behavior: 'smooth' });
    });
  }, [currentPageIndex, viewport.zoom, pages.length]);

  // Scroll detection: auto-switch page when scrolling (like Word)
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper || pages.length <= 1) return;

    const handleScroll = () => {
      if (isScrollingRef.current) return;

      const zoomRatio = useEditorStore.getState().viewport.zoom / 100;
      const scrollY = wrapper.scrollTop;
      const viewCenter = scrollY + wrapper.clientHeight / 2;

      // Find which page is at the center of the viewport
      let accumulated = 40;
      let newPageIndex = 0;

      for (let i = 0; i < pages.length; i++) {
        const p = pages[i];
        if (!p) continue;
        const pageH = p.height * zoomRatio;

        if (viewCenter >= accumulated - PAGE_GAP / 2) {
          newPageIndex = i;
        }

        accumulated += pageH + PAGE_GAP;
      }

      if (newPageIndex !== useEditorStore.getState().currentPageIndex) {
        setCurrentPage(newPageIndex);
      }
    };

    wrapper.addEventListener('scroll', handleScroll, { passive: true });
    return () => wrapper.removeEventListener('scroll', handleScroll);
  }, [pages, setCurrentPage]);

  // Ctrl+wheel zoom
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

  // Restore snapshot listener
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

  // Canvas selection events
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

  // Tool mode
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
  const zoomRatio = viewport.zoom / 100;

  // Calculate total scroll height for all pages
  const totalScrollHeight = useMemo(() => {
    let height = 80; // top padding
    for (const p of pages) {
      height += p.height * zoomRatio + PAGE_GAP;
    }
    height += 40; // bottom padding
    return height;
  }, [pages, zoomRatio]);

  // Calculate each page's top offset
  const pageOffsets = useMemo(() => {
    const offsets: number[] = [];
    let y = 40;
    for (const p of pages) {
      offsets.push(y);
      y += p.height * zoomRatio + PAGE_GAP;
    }
    return offsets;
  }, [pages, zoomRatio]);

  return (
    <div
      ref={containerRef}
      className="relative flex-1 overflow-hidden bg-[#d1d5db] dark:bg-[#111827]"
    >
      {/* Scrollable wrapper */}
      <div
        ref={wrapperRef}
        className="w-full h-full overflow-auto"
        style={{
          cursor: currentTool?.cursor || 'default',
        }}
      >
        {/* Scroll container with space for all pages */}
        <div
          style={{
            position: 'relative',
            minWidth: '100%',
            height: `${totalScrollHeight}px`,
          }}
        >
          {/* Render all page placeholders (background images) */}
          {pages.map((page, index) => {
            const scaledW = page.width * zoomRatio;
            const scaledH = page.height * zoomRatio;
            const top = pageOffsets[index] ?? 0;
            const left = Math.max(40, (containerSize.width - scaledW) / 2);
            const isCurrent = index === currentPageIndex;

            return (
              <div
                key={page.id}
                style={{
                  position: 'absolute',
                  left: `${left}px`,
                  top: `${top}px`,
                  width: `${scaledW}px`,
                  height: `${scaledH}px`,
                }}
              >
                {/* Page shadow and border */}
                <div
                  className="w-full h-full rounded bg-white overflow-hidden"
                  style={{
                    boxShadow: isCurrent
                      ? '0 4px 24px rgba(0,0,0,0.25), 0 0 0 2px rgba(59,130,246,0.5)'
                      : '0 2px 12px rgba(0,0,0,0.15)',
                    border: '1px solid rgba(0,0,0,0.08)',
                  }}
                >
                  {page.backgroundDataUrl && (
                    <img
                      src={page.backgroundDataUrl}
                      alt={`Página ${index + 1}`}
                      className="w-full h-full object-contain"
                      draggable={false}
                    />
                  )}
                </div>

                {/* Page number label */}
                <div
                  className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[11px] font-medium text-gray-400 dark:text-gray-500"
                >
                  {index + 1}
                </div>
              </div>
            );
          })}

          {/* Interactive canvas overlay — positioned over the current page */}
          <div
            ref={canvasContainerRef}
            style={{
              position: 'absolute',
            }}
          >
            <canvas
              ref={canvasRef}
              id="editor-canvas"
              style={{
                transform: `scale(${zoomRatio})`,
                transformOrigin: 'top left',
              }}
              onClick={handleCanvasClick}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            />
          </div>
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
