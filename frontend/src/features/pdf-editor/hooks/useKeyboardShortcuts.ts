import { useEffect, useCallback } from 'react';
import { useEditorStore } from '../store';
import { KEYBOARD_SHORTCUTS } from '../constants/keyboardShortcuts';

export function useKeyboardShortcuts(handlers?: {
  onSave?: () => void;
  onExport?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onSelectAll?: () => void;
}) {
  const {
    setTool,
    undo,
    redo,
    zoomIn,
    zoomOut,
    resetZoom,
    nextPage,
    prevPage,
    mode,
  } = useEditorStore();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (mode === 'view') return;

      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      if (isInput) return;

      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;

      for (const shortcut of KEYBOARD_SHORTCUTS) {
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = shortcut.ctrl ? ctrl : !ctrl;
        const shiftMatch = shortcut.shift ? shift : !shift;

        if (keyMatch && ctrlMatch && shiftMatch) {
          e.preventDefault();

          switch (shortcut.handler) {
            case 'setTool':
              if (shortcut.tool) setTool(shortcut.tool);
              break;
            case 'undo': {
              const undoSnapshot = undo();
              if (undoSnapshot) {
                window.dispatchEvent(new CustomEvent('editor:restore-snapshot', { detail: undoSnapshot }));
              }
              break;
            }
            case 'redo': {
              const redoSnapshot = redo();
              if (redoSnapshot) {
                window.dispatchEvent(new CustomEvent('editor:restore-snapshot', { detail: redoSnapshot }));
              }
              break;
            }
            case 'save':
              handlers?.onSave?.();
              break;
            case 'export':
              handlers?.onExport?.();
              break;
            case 'copy':
              handlers?.onCopy?.();
              break;
            case 'paste':
              handlers?.onPaste?.();
              break;
            case 'delete':
              handlers?.onDelete?.();
              break;
            case 'duplicate':
              handlers?.onDuplicate?.();
              break;
            case 'selectAll':
              handlers?.onSelectAll?.();
              break;
            case 'zoomIn':
              zoomIn();
              break;
            case 'zoomOut':
              zoomOut();
              break;
            case 'resetZoom':
              resetZoom();
              break;
            case 'nextPage':
              nextPage();
              break;
            case 'prevPage':
              prevPage();
              break;
          }
          return;
        }
      }
    },
    [mode, setTool, undo, redo, zoomIn, zoomOut, resetZoom, nextPage, prevPage, handlers]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
