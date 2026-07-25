interface PropertyPanelProps {
  selectedObject?: {
    left?: number;
    top?: number;
    width?: number;
    height?: number;
    angle?: number;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    opacity?: number;
  } | null;
  onPropertyChange?: (property: string, value: unknown) => void;
}

export function PropertyPanel({ selectedObject, onPropertyChange }: PropertyPanelProps) {
  if (!selectedObject) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
        Selecciona un elemento para ver sus propiedades
      </div>
    );
  }

  const handleChange = (property: string, value: string | number) => {
    onPropertyChange?.(property, value);
  };

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
        Propiedades
      </h3>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">X</label>
            <input
              type="number"
              value={Math.round(selectedObject.left || 0)}
              onChange={(e) => handleChange('left', Number(e.target.value))}
              className="w-full px-2 py-1 text-sm border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Y</label>
            <input
              type="number"
              value={Math.round(selectedObject.top || 0)}
              onChange={(e) => handleChange('top', Number(e.target.value))}
              className="w-full px-2 py-1 text-sm border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Ancho</label>
            <input
              type="number"
              value={Math.round(selectedObject.width || 0)}
              onChange={(e) => handleChange('width', Number(e.target.value))}
              className="w-full px-2 py-1 text-sm border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Alto</label>
            <input
              type="number"
              value={Math.round(selectedObject.height || 0)}
              onChange={(e) => handleChange('height', Number(e.target.value))}
              className="w-full px-2 py-1 text-sm border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Rotación</label>
          <input
            type="number"
            value={Math.round(selectedObject.angle || 0)}
            onChange={(e) => handleChange('angle', Number(e.target.value))}
            className="w-full px-2 py-1 text-sm border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Relleno</label>
            <div className="flex gap-1">
              <input
                type="color"
                value={selectedObject.fill === 'transparent' ? '#ffffff' : (selectedObject.fill || '#000000')}
                onChange={(e) => handleChange('fill', e.target.value)}
                className="w-8 h-8 rounded border border-gray-200 dark:border-gray-700 cursor-pointer"
              />
              <input
                type="text"
                value={selectedObject.fill || 'transparent'}
                onChange={(e) => handleChange('fill', e.target.value)}
                className="flex-1 px-2 py-1 text-sm border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Borde</label>
            <div className="flex gap-1">
              <input
                type="color"
                value={selectedObject.stroke || '#000000'}
                onChange={(e) => handleChange('stroke', e.target.value)}
                className="w-8 h-8 rounded border border-gray-200 dark:border-gray-700 cursor-pointer"
              />
              <input
                type="text"
                value={selectedObject.stroke || 'none'}
                onChange={(e) => handleChange('stroke', e.target.value)}
                className="flex-1 px-2 py-1 text-sm border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
            Grosor del borde: {selectedObject.strokeWidth || 0}px
          </label>
          <input
            type="range"
            min="0"
            max="20"
            value={selectedObject.strokeWidth || 0}
            onChange={(e) => handleChange('strokeWidth', Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
            Opacidad: {Math.round((selectedObject.opacity || 1) * 100)}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round((selectedObject.opacity || 1) * 100)}
            onChange={(e) => handleChange('opacity', Number(e.target.value) / 100)}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
}
