import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
} from 'lucide-react';
import { DEFAULT_FONTS, FONT_SIZES } from '../../constants';

interface TextPropertiesPanelProps {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  fontStyle?: string;
  underline?: boolean;
  textAlign?: string;
  fill?: string;
  lineHeight?: number;
  charSpacing?: number;
  onChange?: (properties: Record<string, unknown>) => void;
}

export function TextPropertiesPanel({
  fontFamily = 'Inter',
  fontSize = 16,
  fontWeight = 'normal',
  fontStyle = 'normal',
  underline = false,
  textAlign = 'left',
  fill = '#000000',
  lineHeight = 1.4,
  charSpacing = 0,
  onChange,
}: TextPropertiesPanelProps) {
  const handleChange = (key: string, value: unknown) => {
    onChange?.({ [key]: value });
  };

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        Fuente
      </h4>

      <div>
        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Familia</label>
        <select
          value={fontFamily}
          onChange={(e) => handleChange('fontFamily', e.target.value)}
          className="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        >
          {DEFAULT_FONTS.map((font) => (
            <option key={font.family} value={font.family}>
              {font.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Tamaño</label>
          <select
            value={fontSize}
            onChange={(e) => handleChange('fontSize', Number(e.target.value))}
            className="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            {FONT_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Color</label>
          <input
            type="color"
            value={fill}
            onChange={(e) => handleChange('fill', e.target.value)}
            className="w-full h-8 rounded border border-gray-200 dark:border-gray-700 cursor-pointer"
          />
        </div>
      </div>

      <div className="flex gap-1">
        <button
          onClick={() => handleChange('fontWeight', fontWeight === 'bold' ? 'normal' : 'bold')}
          className={`p-1.5 rounded ${
            fontWeight === 'bold'
              ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
              : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
          }`}
          title="Negrita (Ctrl+B)"
        >
          <Bold size={14} />
        </button>
        <button
          onClick={() => handleChange('fontStyle', fontStyle === 'italic' ? 'normal' : 'italic')}
          className={`p-1.5 rounded ${
            fontStyle === 'italic'
              ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
              : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
          }`}
          title="Cursiva (Ctrl+I)"
        >
          <Italic size={14} />
        </button>
        <button
          onClick={() => handleChange('underline', !underline)}
          className={`p-1.5 rounded ${
            underline
              ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
              : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
          }`}
          title="Subrayado (Ctrl+U)"
        >
          <Underline size={14} />
        </button>
      </div>

      <div className="flex gap-1">
        <button
          onClick={() => handleChange('textAlign', 'left')}
          className={`p-1.5 rounded ${
            textAlign === 'left'
              ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
              : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
          }`}
          title="Alinear izquierda"
        >
          <AlignLeft size={14} />
        </button>
        <button
          onClick={() => handleChange('textAlign', 'center')}
          className={`p-1.5 rounded ${
            textAlign === 'center'
              ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
              : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
          }`}
          title="Centrar"
        >
          <AlignCenter size={14} />
        </button>
        <button
          onClick={() => handleChange('textAlign', 'right')}
          className={`p-1.5 rounded ${
            textAlign === 'right'
              ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
              : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
          }`}
          title="Alinear derecha"
        >
          <AlignRight size={14} />
        </button>
        <button
          onClick={() => handleChange('textAlign', 'justify')}
          className={`p-1.5 rounded ${
            textAlign === 'justify'
              ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
              : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
          }`}
          title="Justificar"
        >
          <AlignJustify size={14} />
        </button>
      </div>

      <div>
        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
          Interlineado: {lineHeight.toFixed(1)}
        </label>
        <input
          type="range"
          min="0.8"
          max="3"
          step="0.1"
          value={lineHeight}
          onChange={(e) => handleChange('lineHeight', Number(e.target.value))}
          className="w-full"
        />
      </div>

      <div>
        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
          Espaciado letras: {charSpacing}
        </label>
        <input
          type="range"
          min="-200"
          max="800"
          step="10"
          value={charSpacing}
          onChange={(e) => handleChange('charSpacing', Number(e.target.value))}
          className="w-full"
        />
      </div>
    </div>
  );
}
