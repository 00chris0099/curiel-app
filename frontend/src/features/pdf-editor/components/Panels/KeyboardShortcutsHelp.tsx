import { X } from 'lucide-react';
import { KEYBOARD_SHORTCUTS, type KeyboardShortcut } from '../../constants/keyboardShortcuts';

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

function getCategory(shortcut: KeyboardShortcut): string {
  if (shortcut.handler === 'setTool') return 'Herramientas';
  if (['undo', 'redo', 'copy', 'paste', 'duplicate', 'delete', 'selectAll'].includes(shortcut.handler)) return 'Edición';
  if (['zoomIn', 'zoomOut', 'resetZoom'].includes(shortcut.handler)) return 'Vista';
  if (['nextPage', 'prevPage'].includes(shortcut.handler)) return 'Navegación';
  if (['save', 'export'].includes(shortcut.handler)) return 'Archivo';
  return 'General';
}

export function KeyboardShortcutsHelp({ isOpen, onClose }: KeyboardShortcutsHelpProps) {
  if (!isOpen) return null;

  const grouped = KEYBOARD_SHORTCUTS.reduce<Record<string, KeyboardShortcut[]>>((acc, s) => {
    const cat = getCategory(s);
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Atajos de Teclado
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[60vh] p-5 space-y-6">
          {Object.entries(grouped).map(([category, shortcuts]) => (
            <div key={category}>
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                {category}
              </h3>
              <div className="space-y-2">
                {shortcuts.map((shortcut, i) => (
                  <div key={`${shortcut.key}-${i}`} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {shortcut.action}
                    </span>
                    <kbd className="px-2 py-0.5 text-xs font-mono bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded border border-gray-300 dark:border-gray-600">
                      {shortcut.ctrl ? 'Ctrl+' : ''}{shortcut.shift ? 'Shift+' : ''}{shortcut.alt ? 'Alt+' : ''}{shortcut.key.length === 1 ? shortcut.key.toUpperCase() : shortcut.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
