import type { EditorTool, PageSize } from '../types';

export const EDITOR_TOOLS: Record<EditorTool, { name: string; icon: string; shortcut?: string; cursor: string; group: string }> = {
  select: { name: 'Seleccionar', icon: 'MousePointer2', shortcut: 'V', cursor: 'default', group: 'navigation' },
  hand: { name: 'Mano', icon: 'Hand', shortcut: 'H', cursor: 'grab', group: 'navigation' },
  text: { name: 'Texto', icon: 'Type', shortcut: 'T', cursor: 'text', group: 'creation' },
  image: { name: 'Imagen', icon: 'Image', shortcut: 'I', cursor: 'crosshair', group: 'creation' },
  rectangle: { name: 'Rectángulo', icon: 'Square', shortcut: 'R', cursor: 'crosshair', group: 'creation' },
  circle: { name: 'Círculo', icon: 'Circle', shortcut: 'C', cursor: 'crosshair', group: 'creation' },
  line: { name: 'Línea', icon: 'Minus', shortcut: 'L', cursor: 'crosshair', group: 'creation' },
  arrow: { name: 'Flecha', icon: 'ArrowRight', shortcut: 'A', cursor: 'crosshair', group: 'creation' },
  draw: { name: 'Dibujar', icon: 'Pencil', shortcut: 'D', cursor: 'crosshair', group: 'annotation' },
  highlight: { name: 'Resaltar', icon: 'Highlighter', shortcut: 'Shift+H', cursor: 'crosshair', group: 'annotation' },
  measure: { name: 'Medir', icon: 'Ruler', shortcut: 'M', cursor: 'crosshair', group: 'measurement' },
  signature: { name: 'Firma', icon: 'PenTool', shortcut: 'F', cursor: 'crosshair', group: 'creation' },
  comment: { name: 'Comentario', icon: 'MessageSquare', shortcut: 'Shift+C', cursor: 'crosshair', group: 'annotation' },
};

export const PAGE_SIZES: PageSize[] = [
  { width: 595, height: 842, label: 'A4 Portrait' },
  { width: 842, height: 595, label: 'A4 Landscape' },
  { width: 612, height: 792, label: 'Carta Portrait' },
  { width: 792, height: 612, label: 'Carta Landscape' },
];

export const DEFAULT_PAGE_SIZE = PAGE_SIZES[0];

export const ZOOM_PRESETS = [25, 50, 75, 100, 125, 150, 200, 300, 400, 500];

export const DEFAULT_ZOOM = 100;
export const MIN_ZOOM = 10;
export const MAX_ZOOM = 500;
export const ZOOM_STEP = 10;

export const AUTOSAVE_INTERVAL_MS = 30000;
export const HISTORY_MAX_SIZE = 100;

export const CANVAS_DEFAULTS = {
  backgroundColor: '#ffffff',
  selection: true,
  preserveObjectStacking: true,
  enableRetinaScaling: true,
};

export const DEFAULT_TEXT_CONFIG = {
  fontFamily: 'Inter',
  fontSize: 16,
  fontWeight: 'normal',
  fontStyle: 'normal',
  underline: false,
  textAlign: 'left' as const,
  fill: '#000000',
  lineHeight: 1.4,
  charSpacing: 0,
};

export const DEFAULT_SHAPE_CONFIG = {
  fill: 'transparent',
  stroke: '#000000',
  strokeWidth: 2,
  opacity: 1,
  cornerSize: 8,
  hasControls: true,
};

export const DEFAULT_DRAW_CONFIG = {
  color: '#000000',
  width: 2,
  type: 'pen' as const,
  opacity: 1,
};

export const DEFAULT_MEASURE_CONFIG = {
  unit: 'm' as const,
  scale: 1,
  color: '#e74c3c',
  fontSize: 14,
};

export const SHORTCUT_LABELS: Record<string, string> = {
  'Ctrl+Z': 'Deshacer',
  'Ctrl+Y': 'Rehacer',
  'Ctrl+S': 'Guardar',
  'Ctrl+Shift+S': 'Exportar PDF',
  'Ctrl+C': 'Copiar',
  'Ctrl+V': 'Pegar',
  'Ctrl+D': 'Duplicar',
  'Delete': 'Eliminar',
  'Ctrl+A': 'Seleccionar todo',
  'Ctrl++': 'Acercar',
  'Ctrl+-': 'Alejar',
  'Ctrl+0': 'Ajustar a página',
  'Space+Drag': 'Desplazar',
  '?': 'Mostrar atajos',
};
