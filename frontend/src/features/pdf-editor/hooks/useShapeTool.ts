import { useRef, useCallback } from 'react';
import { Canvas, Rect, Circle, Line, Polygon } from 'fabric';
import { useEditorStore } from '../store';

interface ShapeOptions {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  rx?: number;
  ry?: number;
}

export function useShapeTool(fabricRef: React.MutableRefObject<Canvas | null>) {
  const { markDirty, pushHistory } = useEditorStore();
  const isDrawingRef = useRef(false);
  const startPointRef = useRef<{ x: number; y: number } | null>(null);
  const currentShapeRef = useRef<unknown>(null);

  const createRect = useCallback(
    (x: number, y: number, options?: ShapeOptions) => {
      if (!fabricRef.current) return null;

      const rect = new Rect({
        left: x,
        top: y,
        width: 150,
        height: 100,
        fill: options?.fill || 'transparent',
        stroke: options?.stroke || '#000000',
        strokeWidth: options?.strokeWidth || 2,
        opacity: options?.opacity || 1,
        rx: options?.rx || 0,
        ry: options?.ry || 0,
        selectable: true,
        hasControls: true,
        borderColor: '#4a90d9',
        cornerColor: '#4a90d9',
        cornerStyle: 'circle',
        cornerSize: 8,
        transparentCorners: false,
      });

      fabricRef.current.add(rect);
      fabricRef.current.setActiveObject(rect);
      fabricRef.current.renderAll();

      markDirty();
      const json = JSON.stringify(fabricRef.current.toJSON());
      pushHistory(json);

      return rect;
    },
    [fabricRef, markDirty, pushHistory]
  );

  const createCircle = useCallback(
    (x: number, y: number, options?: ShapeOptions) => {
      if (!fabricRef.current) return null;

      const circle = new Circle({
        left: x,
        top: y,
        radius: 50,
        fill: options?.fill || 'transparent',
        stroke: options?.stroke || '#000000',
        strokeWidth: options?.strokeWidth || 2,
        opacity: options?.opacity || 1,
        selectable: true,
        hasControls: true,
        borderColor: '#4a90d9',
        cornerColor: '#4a90d9',
        cornerStyle: 'circle',
        cornerSize: 8,
        transparentCorners: false,
      });

      fabricRef.current.add(circle);
      fabricRef.current.setActiveObject(circle);
      fabricRef.current.renderAll();

      markDirty();
      const json = JSON.stringify(fabricRef.current.toJSON());
      pushHistory(json);

      return circle;
    },
    [fabricRef, markDirty, pushHistory]
  );

  const createLine = useCallback(
    (x1: number, y1: number, x2: number, y2: number, options?: ShapeOptions) => {
      if (!fabricRef.current) return null;

      const line = new Line([x1, y1, x2, y2], {
        stroke: options?.stroke || '#000000',
        strokeWidth: options?.strokeWidth || 2,
        opacity: options?.opacity || 1,
        selectable: true,
        hasControls: true,
        borderColor: '#4a90d9',
        cornerColor: '#4a90d9',
        cornerStyle: 'circle',
        cornerSize: 8,
        transparentCorners: false,
      });

      fabricRef.current.add(line);
      fabricRef.current.setActiveObject(line);
      fabricRef.current.renderAll();

      markDirty();
      const json = JSON.stringify(fabricRef.current.toJSON());
      pushHistory(json);

      return line;
    },
    [fabricRef, markDirty, pushHistory]
  );

  const createArrow = useCallback(
    (x1: number, y1: number, x2: number, y2: number, options?: ShapeOptions) => {
      if (!fabricRef.current) return null;

      const angle = Math.atan2(y2 - y1, x2 - x1);
      const headLength = 15;

      const line = new Line([x1, y1, x2, y2], {
        stroke: options?.stroke || '#000000',
        strokeWidth: options?.strokeWidth || 2,
        opacity: options?.opacity || 1,
        selectable: true,
        hasControls: true,
      });

      const head1 = new Polygon(
        [
          { x: x2, y: y2 },
          {
            x: x2 - headLength * Math.cos(angle - Math.PI / 6),
            y: y2 - headLength * Math.sin(angle - Math.PI / 6),
          },
          {
            x: x2 - headLength * Math.cos(angle + Math.PI / 6),
            y: y2 - headLength * Math.sin(angle + Math.PI / 6),
          },
        ],
        {
          fill: options?.stroke || '#000000',
          selectable: false,
          evented: false,
        }
      );

      const group = [line, head1];
      fabricRef.current.add(...group);
      fabricRef.current.setActiveObject(line);
      fabricRef.current.renderAll();

      markDirty();
      const json = JSON.stringify(fabricRef.current.toJSON());
      pushHistory(json);

      return line;
    },
    [fabricRef, markDirty, pushHistory]
  );

  const startDrawShape = useCallback(
    (x: number, y: number, shapeType: 'rect' | 'circle' | 'line' | 'arrow') => {
      if (!fabricRef.current) return;

      isDrawingRef.current = true;
      startPointRef.current = { x, y };

      switch (shapeType) {
        case 'rect': {
          const rect = new Rect({
            left: x,
            top: y,
            width: 0,
            height: 0,
            fill: 'transparent',
            stroke: '#000000',
            strokeWidth: 2,
            selectable: false,
            evented: false,
          });
          fabricRef.current.add(rect);
          currentShapeRef.current = rect;
          break;
        }
        case 'circle': {
          const circle = new Circle({
            left: x,
            top: y,
            radius: 0,
            fill: 'transparent',
            stroke: '#000000',
            strokeWidth: 2,
            selectable: false,
            evented: false,
          });
          fabricRef.current.add(circle);
          currentShapeRef.current = circle;
          break;
        }
        case 'line': {
          const line = new Line([x, y, x, y], {
            stroke: '#000000',
            strokeWidth: 2,
            selectable: false,
            evented: false,
          });
          fabricRef.current.add(line);
          currentShapeRef.current = line;
          break;
        }
        case 'arrow': {
          const arrowLine = new Line([x, y, x, y], {
            stroke: '#000000',
            strokeWidth: 2,
            selectable: false,
            evented: false,
          });
          fabricRef.current.add(arrowLine);
          currentShapeRef.current = arrowLine;
          break;
        }
      }
    },
    [fabricRef]
  );

  const updateDrawShape = useCallback(
    (x: number, y: number, shapeType: 'rect' | 'circle' | 'line' | 'arrow') => {
      if (!fabricRef.current || !isDrawingRef.current || !startPointRef.current || !currentShapeRef.current)
        return;

      const start = startPointRef.current;
      const shape = currentShapeRef.current;

      switch (shapeType) {
        case 'rect': {
          const rect = shape as unknown as Rect;
          const width = Math.abs(x - start.x);
          const height = Math.abs(y - start.y);
          rect.set({
            left: Math.min(start.x, x),
            top: Math.min(start.y, y),
            width,
            height,
          });
          break;
        }
        case 'circle': {
          const circle = shape as unknown as Circle;
          const radius = Math.sqrt((x - start.x) ** 2 + (y - start.y) ** 2) / 2;
          circle.set({
            left: Math.min(start.x, x),
            top: Math.min(start.y, y),
            radius: radius / 2,
          });
          break;
        }
        case 'line':
        case 'arrow': {
          const line = shape as unknown as Line;
          line.set({ x2: x, y2: y });
          break;
        }
      }

      fabricRef.current.renderAll();
    },
    [fabricRef]
  );

  const finishDrawShape = useCallback(
    () => {
      if (!fabricRef.current || !isDrawingRef.current || !currentShapeRef.current) return null;

      isDrawingRef.current = false;
      startPointRef.current = null;

      const shape = currentShapeRef.current;
      currentShapeRef.current = null;

      if (shape instanceof Rect || shape instanceof Circle || shape instanceof Line) {
        (shape as unknown as { set: (k: string, v: boolean) => void }).set('selectable', true);
        (shape as unknown as { set: (k: string, v: boolean) => void }).set('evented', true);
        fabricRef.current.setActiveObject(shape);
      }

      fabricRef.current.renderAll();

      markDirty();
      const json = JSON.stringify(fabricRef.current.toJSON());
      pushHistory(json);

      return shape;
    },
    [fabricRef, markDirty, pushHistory]
  );

  return {
    createRect,
    createCircle,
    createLine,
    createArrow,
    startDrawShape,
    updateDrawShape,
    finishDrawShape,
    isDrawing: isDrawingRef,
  };
}
