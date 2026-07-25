import {
  Copy,
  Trash2,
  BringToFront,
  SendToBack,
  FlipHorizontal,
  FlipVertical,
  Lock,
  Unlock,
} from 'lucide-react';
import type { Canvas } from 'fabric';

interface CanvasToolbarProps {
  canvas: Canvas | null;
  position: { x: number; y: number } | null;
  visible: boolean;
  onRefresh?: () => void;
}

export function CanvasToolbar({ canvas, position, visible, onRefresh }: CanvasToolbarProps) {
  if (!visible || !position) return null;

  const handleCopy = () => {
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!active) return;

    active.clone().then((cloned) => {
      cloned.set({
        left: (active.left || 0) + 20,
        top: (active.top || 0) + 20,
      });
      canvas.add(cloned);
      canvas.setActiveObject(cloned);
      canvas.renderAll();
      onRefresh?.();
    });
  };

  const handleDelete = () => {
    if (!canvas) return;
    const active = canvas.getActiveObjects();
    if (active.length === 0) return;

    active.forEach((obj) => canvas.remove(obj));
    canvas.discardActiveObject();
    canvas.renderAll();
    onRefresh?.();
  };

  const handleBringToFront = () => {
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!active) return;

    canvas.bringObjectToFront(active);
    canvas.renderAll();
    onRefresh?.();
  };

  const handleSendToBack = () => {
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!active) return;

    canvas.sendObjectToBack(active);
    canvas.renderAll();
    onRefresh?.();
  };

  const handleFlipH = () => {
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!active) return;

    active.set('flipX', !active.flipX);
    canvas.renderAll();
  };

  const handleFlipV = () => {
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!active) return;

    active.set('flipY', !active.flipY);
    canvas.renderAll();
  };

  const handleLock = () => {
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!active) return;

    const isLocked = active.selectable === false;
    active.set({
      selectable: isLocked,
      evented: isLocked,
    });
    canvas.renderAll();
    onRefresh?.();
  };

  return (
    <div
      className="absolute z-50 flex items-center gap-0.5 px-1 py-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg"
      style={{
        left: position.x,
        top: position.y - 48,
      }}
    >
      <button
        onClick={handleCopy}
        className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
        title="Copiar"
      >
        <Copy size={14} />
      </button>
      <button
        onClick={handleDelete}
        className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-600 dark:text-gray-400 hover:text-red-500"
        title="Eliminar"
      >
        <Trash2 size={14} />
      </button>

      <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-0.5" />

      <button
        onClick={handleBringToFront}
        className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
        title="Traer al frente"
      >
        <BringToFront size={14} />
      </button>
      <button
        onClick={handleSendToBack}
        className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
        title="Enviar atrás"
      >
        <SendToBack size={14} />
      </button>

      <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-0.5" />

      <button
        onClick={handleFlipH}
        className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
        title="Voltear horizontal"
      >
        <FlipHorizontal size={14} />
      </button>
      <button
        onClick={handleFlipV}
        className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
        title="Voltear vertical"
      >
        <FlipVertical size={14} />
      </button>

      <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-0.5" />

      <button
        onClick={handleLock}
        className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
        title="Bloquear/Desbloquear"
      >
        {canvas?.getActiveObject()?.selectable === false ? (
          <Lock size={14} />
        ) : (
          <Unlock size={14} />
        )}
      </button>
    </div>
  );
}
