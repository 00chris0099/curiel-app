import { useRef, useCallback } from 'react';
import { Canvas, Line, FabricText, Group } from 'fabric';
import { useEditorStore } from '../store';

type MeasureUnit = 'm' | 'cm' | 'ft' | 'in' | 'px';

interface MeasureOptions {
  unit: MeasureUnit;
  scale: number;
  color: string;
  fontSize: number;
}

const UNIT_LABELS: Record<MeasureUnit, string> = {
  m: 'm',
  cm: 'cm',
  ft: 'ft',
  in: 'in',
  px: 'px',
};

function calculateDistance(x1: number, y1: number, x2: number, y2: number, scale: number): number {
  const pixels = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  return pixels * scale;
}

function formatDistance(distance: number, unit: MeasureUnit): string {
  if (distance < 0.01) return `0 ${UNIT_LABELS[unit]}`;
  if (distance < 1) return `${distance.toFixed(3)} ${UNIT_LABELS[unit]}`;
  if (distance < 10) return `${distance.toFixed(2)} ${UNIT_LABELS[unit]}`;
  return `${distance.toFixed(1)} ${UNIT_LABELS[unit]}`;
}

export function useMeasureTool(fabricRef: React.MutableRefObject<Canvas | null>) {
  const { markDirty, pushHistory } = useEditorStore();
  const isDrawingRef = useRef(false);
  const startPointRef = useRef<{ x: number; y: number } | null>(null);
  const currentLineRef = useRef<Group | null>(null);
  const optionsRef = useRef<MeasureOptions>({
    unit: 'm',
    scale: 1,
    color: '#e74c3c',
    fontSize: 14,
  });

  const setOptions = useCallback((options: Partial<MeasureOptions>) => {
    optionsRef.current = { ...optionsRef.current, ...options };
  }, []);

  const createMeasurementLabel = useCallback(
    (x: number, y: number, distance: number): FabricText => {
      const opts = optionsRef.current;
      return new FabricText(formatDistance(distance, opts.unit), {
        left: x,
        top: y - opts.fontSize - 4,
        fontSize: opts.fontSize,
        fontFamily: 'Inter, sans-serif',
        fill: opts.color,
        fontWeight: 'bold',
        selectable: false,
        evented: false,
        textAlign: 'center',
        originX: 'center',
      });
    },
    []
  );

  const startMeasure = useCallback(
    (x: number, y: number) => {
      if (!fabricRef.current) return;

      isDrawingRef.current = true;
      startPointRef.current = { x, y };

      const opts = optionsRef.current;
      const line = new Line([x, y, x, y], {
        stroke: opts.color,
        strokeWidth: 2,
        strokeDashArray: [6, 3],
        selectable: false,
        evented: false,
        data: { type: 'measure-line' },
      } as Record<string, unknown>);

      fabricRef.current.add(line);
      currentLineRef.current = line as unknown as Group;
      fabricRef.current.renderAll();
    },
    [fabricRef]
  );

  const updateMeasure = useCallback(
    (x: number, y: number) => {
      if (!fabricRef.current || !isDrawingRef.current || !startPointRef.current || !currentLineRef.current)
        return;

      const canvas = fabricRef.current;
      const start = startPointRef.current;
      const opts = optionsRef.current;

      const distance = calculateDistance(start.x, start.y, x, y, opts.scale);
      const midX = (start.x + x) / 2;
      const midY = (start.y + y) / 2;

      const line = currentLineRef.current as unknown as Line;
      line.set({ x2: x, y2: y });
      canvas.renderAll();

      const existingLabel = canvas.getObjects().find(
        (obj) =>
          obj instanceof FabricText &&
          (obj as FabricText).text?.includes(UNIT_LABELS[opts.unit]) &&
          (obj as FabricText).selectable === false &&
          !(obj as unknown as Record<string, unknown>).data
      );

      if (existingLabel) {
        canvas.remove(existingLabel);
      }

      const label = createMeasurementLabel(midX, midY, distance);
      canvas.add(label);
      canvas.renderAll();
    },
    [fabricRef, createMeasurementLabel]
  );

  const finishMeasure = useCallback(() => {
    if (!fabricRef.current || !isDrawingRef.current || !startPointRef.current) return null;

    isDrawingRef.current = false;
    startPointRef.current = null;
    currentLineRef.current = null;

    fabricRef.current.renderAll();

    markDirty();
    const json = JSON.stringify(fabricRef.current.toJSON());
    pushHistory(json);

    return null;
  }, [fabricRef, markDirty, pushHistory]);

  return {
    startMeasure,
    updateMeasure,
    finishMeasure,
    setOptions,
    isDrawing: isDrawingRef,
  };
}
