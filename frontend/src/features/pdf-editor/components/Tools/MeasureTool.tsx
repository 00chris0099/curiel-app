import { Ruler } from 'lucide-react';

type MeasureUnit = 'm' | 'cm' | 'ft' | 'in' | 'px';

interface MeasureToolProps {
  unit: MeasureUnit;
  scale: number;
  onUnitChange: (unit: MeasureUnit) => void;
  onScaleChange: (scale: number) => void;
}

const UNITS: { value: MeasureUnit; label: string }[] = [
  { value: 'm', label: 'Metros' },
  { value: 'cm', label: 'Centímetros' },
  { value: 'ft', label: 'Pies' },
  { value: 'in', label: 'Pulgadas' },
  { value: 'px', label: 'Píxeles' },
];

export function MeasureTool({ unit, scale, onUnitChange, onScaleChange }: MeasureToolProps) {
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <Ruler size={16} className="text-primary-600" />
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Herramienta de Medición
        </h3>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
          Unidad
        </label>
        <select
          value={unit}
          onChange={(e) => onUnitChange(e.target.value as MeasureUnit)}
          className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        >
          {UNITS.map((u) => (
            <option key={u.value} value={u.value}>
              {u.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
          Escala (px por unidad)
        </label>
        <input
          type="number"
          value={scale}
          onChange={(e) => onScaleChange(parseFloat(e.target.value) || 1)}
          min="0.001"
          step="0.1"
          className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
        <p className="mt-1 text-xs text-gray-400">
          1 {unit} = {scale} píxeles
        </p>
      </div>

      <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          <strong className="text-gray-700 dark:text-gray-300">Instrucciones:</strong>
          <br />
          Haz clic en dos puntos del canvas para medir la distancia entre ellos.
        </p>
      </div>
    </div>
  );
}
