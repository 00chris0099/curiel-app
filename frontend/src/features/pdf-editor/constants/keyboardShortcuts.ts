import type { EditorTool } from '../types';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: string;
  tool?: EditorTool;
  handler: 'setTool' | 'undo' | 'redo' | 'save' | 'export' | 'copy' | 'paste' | 'duplicate' | 'delete' | 'selectAll' | 'zoomIn' | 'zoomOut' | 'resetZoom' | 'nextPage' | 'prevPage';
}

export const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  { key: 'v', action: 'Herramienta selección', tool: 'select', handler: 'setTool' },
  { key: 'h', action: 'Herramienta mano', tool: 'hand', handler: 'setTool' },
  { key: 't', action: 'Herramienta texto', tool: 'text', handler: 'setTool' },
  { key: 'i', action: 'Herramienta imagen', tool: 'image', handler: 'setTool' },
  { key: 'r', action: 'Herramienta rectángulo', tool: 'rectangle', handler: 'setTool' },
  { key: 'c', action: 'Herramienta círculo', tool: 'circle', handler: 'setTool' },
  { key: 'l', action: 'Herramienta línea', tool: 'line', handler: 'setTool' },
  { key: 'a', action: 'Herramienta flecha', tool: 'arrow', handler: 'setTool' },
  { key: 'd', action: 'Herramienta dibujar', tool: 'draw', handler: 'setTool' },
  { key: 'm', action: 'Herramienta medir', tool: 'measure', handler: 'setTool' },
  { key: 'f', action: 'Herramienta firma', tool: 'signature', handler: 'setTool' },
  { key: 'z', ctrl: true, action: 'Deshacer', handler: 'undo' },
  { key: 'y', ctrl: true, action: 'Rehacer', handler: 'redo' },
  { key: 's', ctrl: true, action: 'Guardar', handler: 'save' },
  { key: 's', ctrl: true, shift: true, action: 'Exportar PDF', handler: 'export' },
  { key: 'c', ctrl: true, action: 'Copiar', handler: 'copy' },
  { key: 'v', ctrl: true, action: 'Pegar', handler: 'paste' },
  { key: 'd', ctrl: true, action: 'Duplicar', handler: 'duplicate' },
  { key: 'Delete', action: 'Eliminar', handler: 'delete' },
  { key: 'Backspace', action: 'Eliminar', handler: 'delete' },
  { key: 'a', ctrl: true, action: 'Seleccionar todo', handler: 'selectAll' },
  { key: '=', ctrl: true, action: 'Acercar', handler: 'zoomIn' },
  { key: '+', ctrl: true, action: 'Acercar', handler: 'zoomIn' },
  { key: '-', ctrl: true, action: 'Alejar', handler: 'zoomOut' },
  { key: '0', ctrl: true, action: 'Ajustar a página', handler: 'resetZoom' },
  { key: 'ArrowRight', action: 'Siguiente página', handler: 'nextPage' },
  { key: 'ArrowLeft', action: 'Página anterior', handler: 'prevPage' },
];

export function getShortcutLabel(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];
  if (shortcut.ctrl) parts.push('Ctrl');
  if (shortcut.shift) parts.push('Shift');
  if (shortcut.alt) parts.push('Alt');
  parts.push(shortcut.key.length === 1 ? shortcut.key.toUpperCase() : shortcut.key);
  return parts.join('+');
}
