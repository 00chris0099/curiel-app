import { useState, useCallback } from 'react';
import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  ChevronUp,
  ChevronDown,
  GripVertical,
} from 'lucide-react';
import type { Canvas as FabricCanvas } from 'fabric';

interface LayerItem {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
}

interface LayerPanelProps {
  canvas: FabricCanvas | null;
}

export function LayerPanel({ canvas }: LayerPanelProps) {
  const [layers, setLayers] = useState<LayerItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const refreshLayers = useCallback(() => {
    if (!canvas) return;

    const objects = canvas.getObjects();
    const newLayers: LayerItem[] = objects.map((obj, index) => ({
      id: (obj as unknown as { id?: string }).id || `layer-${index}`,
      name: (obj as unknown as { name?: string }).name || `${(obj as unknown as { type?: string }).type || 'object'} ${index + 1}`,
      type: (obj as unknown as { type?: string })?.type || 'object',
      visible: obj.visible !== false,
      locked: obj.selectable === false,
      opacity: obj.opacity || 1,
    }));

    setLayers(newLayers.reverse());
  }, [canvas]);

  const toggleVisibility = useCallback(
    (id: string) => {
      if (!canvas) return;

      const objects = canvas.getObjects();
      const obj = objects.find((o) => (o as unknown as { id?: string }).id === id);
      if (obj) {
        obj.set('visible', !obj.visible);
        canvas.renderAll();
        refreshLayers();
      }
    },
    [canvas, refreshLayers]
  );

  const toggleLock = useCallback(
    (id: string) => {
      if (!canvas) return;

      const objects = canvas.getObjects();
      const obj = objects.find((o) => (o as unknown as { id?: string }).id === id);
      if (obj) {
        const isLocked = obj.selectable === false;
        obj.set({
          selectable: isLocked,
          evented: isLocked,
        });
        canvas.renderAll();
        refreshLayers();
      }
    },
    [canvas, refreshLayers]
  );

  const deleteLayer = useCallback(
    (id: string) => {
      if (!canvas) return;

      const objects = canvas.getObjects();
      const obj = objects.find((o) => (o as unknown as { id?: string }).id === id);
      if (obj) {
        canvas.remove(obj);
        canvas.renderAll();
        refreshLayers();
      }
    },
    [canvas, refreshLayers]
  );

  const moveLayer = useCallback(
    (id: string, direction: 'up' | 'down') => {
      if (!canvas) return;

      const objects = canvas.getObjects();
      const index = objects.findIndex((o) => (o as unknown as { id?: string }).id === id);
      if (index === -1) return;

      if (direction === 'up' && index < objects.length - 1) {
        canvas.moveObjectTo(objects[index], objects.length - 1);
      } else if (direction === 'down' && index > 0) {
        canvas.moveObjectTo(objects[index], 0);
      }

      canvas.renderAll();
      refreshLayers();
    },
    [canvas, refreshLayers]
  );

  const selectLayer = useCallback(
    (id: string) => {
      if (!canvas) return;

      const objects = canvas.getObjects();
      const obj = objects.find((o) => (o as unknown as { id?: string }).id === id);
      if (obj) {
        canvas.setActiveObject(obj);
        canvas.renderAll();
        setSelectedId(id);
      }
    },
    [canvas]
  );

  const getIcon = (type: string) => {
    switch (type) {
      case 'textbox':
      case 'i-text':
        return 'T';
      case 'rect':
        return '□';
      case 'circle':
        return '○';
      case 'line':
        return '—';
      case 'image':
        return '🖼';
      case 'path':
        return '✎';
      default:
        return '•';
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Capas</h3>
        <button
          onClick={refreshLayers}
          className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400"
        >
          Actualizar
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {layers.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
            No hay elementos en esta página
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {layers.map((layer) => (
              <div
                key={layer.id}
                className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${
                  selectedId === layer.id ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                }`}
                onClick={() => selectLayer(layer.id)}
              >
                <GripVertical size={12} className="text-gray-400 flex-shrink-0" />

                <span className="text-sm w-5 text-center flex-shrink-0">{getIcon(layer.type)}</span>

                <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">
                  {layer.name}
                </span>

                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleVisibility(layer.id); }}
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                    title={layer.visible ? 'Ocultar' : 'Mostrar'}
                  >
                    {layer.visible ? (
                      <Eye size={12} className="text-gray-500" />
                    ) : (
                      <EyeOff size={12} className="text-gray-400" />
                    )}
                  </button>

                  <button
                    onClick={(e) => { e.stopPropagation(); toggleLock(layer.id); }}
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                    title={layer.locked ? 'Desbloquear' : 'Bloquear'}
                  >
                    {layer.locked ? (
                      <Lock size={12} className="text-gray-500" />
                    ) : (
                      <Unlock size={12} className="text-gray-400" />
                    )}
                  </button>

                  <button
                    onClick={(e) => { e.stopPropagation(); moveLayer(layer.id, 'up'); }}
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                    title="Subir"
                  >
                    <ChevronUp size={12} className="text-gray-400" />
                  </button>

                  <button
                    onClick={(e) => { e.stopPropagation(); moveLayer(layer.id, 'down'); }}
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                    title="Bajar"
                  >
                    <ChevronDown size={12} className="text-gray-400" />
                  </button>

                  <button
                    onClick={(e) => { e.stopPropagation(); deleteLayer(layer.id); }}
                    className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30"
                    title="Eliminar"
                  >
                    <Trash2 size={12} className="text-gray-400 hover:text-red-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
