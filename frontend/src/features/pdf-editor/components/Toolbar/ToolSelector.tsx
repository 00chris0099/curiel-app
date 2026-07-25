import React from 'react';
import { useEditorStore } from '../../store';
import {
  MousePointer2,
  Hand,
  Type,
  Image,
  Square,
  Circle,
  Minus,
  ArrowRight,
  Pencil,
  Highlighter,
  Ruler,
  PenTool,
  MessageSquare,
} from 'lucide-react';
import type { EditorTool } from '../../types';

const TOOL_ICONS: Record<EditorTool, React.ReactNode> = {
  select: <MousePointer2 size={18} />,
  hand: <Hand size={18} />,
  text: <Type size={18} />,
  image: <Image size={18} />,
  rectangle: <Square size={18} />,
  circle: <Circle size={18} />,
  line: <Minus size={18} />,
  arrow: <ArrowRight size={18} />,
  draw: <Pencil size={18} />,
  highlight: <Highlighter size={18} />,
  measure: <Ruler size={18} />,
  signature: <PenTool size={18} />,
  comment: <MessageSquare size={18} />,
};

const TOOL_LABELS: Record<EditorTool, string> = {
  select: 'Seleccionar (V)',
  hand: 'Mano (H)',
  text: 'Texto (T)',
  image: 'Imagen (I)',
  rectangle: 'Rectángulo (R)',
  circle: 'Círculo (C)',
  line: 'Línea (L)',
  arrow: 'Flecha (A)',
  draw: 'Dibujar (D)',
  highlight: 'Resaltar',
  measure: 'Medir (M)',
  signature: 'Firma (F)',
  comment: 'Comentario',
};

const CORE_TOOLS: EditorTool[] = ['select', 'hand', 'text', 'draw', 'rectangle', 'measure'];

interface ToolSelectorProps {
  onToolSelect?: (tool: EditorTool) => void;
  compact?: boolean;
}

export function ToolSelector({ onToolSelect, compact = false }: ToolSelectorProps) {
  const { selection, setTool } = useEditorStore();

  const tools = compact ? CORE_TOOLS : ([
    'select', 'hand', 'text', 'image', 'rectangle', 'circle',
    'line', 'arrow', 'draw', 'highlight', 'measure', 'signature', 'comment',
  ] as EditorTool[]);

  const handleToolClick = (tool: EditorTool) => {
    setTool(tool);
    onToolSelect?.(tool);
  };

  return (
    <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
      {tools.map((tool) => (
        <button
          key={tool}
          onClick={() => handleToolClick(tool)}
          className={`p-2 rounded-lg transition-colors shrink-0 ${
            selection.tool === tool
              ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
              : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
          }`}
          title={TOOL_LABELS[tool]}
        >
          {TOOL_ICONS[tool]}
        </button>
      ))}
    </div>
  );
}
