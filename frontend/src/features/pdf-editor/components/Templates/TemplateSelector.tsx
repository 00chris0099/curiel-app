import { useState, useEffect, useCallback } from 'react';
import { pdfTemplateService, type PdfTemplate } from '../../services/pdfApi';
import { Layout, Search, Loader2 } from 'lucide-react';

interface TemplateSelectorProps {
  onSelect: (template: PdfTemplate) => void;
  onClose?: () => void;
}

export function TemplateSelector({ onSelect, onClose }: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<PdfTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [category, setCategory] = useState<string>('');
  const [search, setSearch] = useState('');

  const fetchTemplates = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await pdfTemplateService.getAll(category || undefined, search || undefined);
      setTemplates(result.data);
    } catch {
      setTemplates([]);
    } finally {
      setIsLoading(false);
    }
  }, [category, search]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Layout size={16} className="text-primary-600" />
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Seleccionar Plantilla
        </h3>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar plantilla..."
            className="w-full pl-8 pr-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        >
          <option value="">Todas</option>
          <option value="inspeccion">Inspección</option>
          <option value="reporte">Reporte</option>
          <option value="custom">Personalizada</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={20} className="animate-spin text-primary-600" />
          <span className="ml-2 text-sm text-gray-500">Cargando plantillas...</span>
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-8 text-sm text-gray-400">
          No se encontraron plantillas.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {templates.map((template) => (
            <button
              key={template.id}
              onClick={() => onSelect(template)}
              className="text-left p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
            >
              <div className="aspect-[3/4] bg-gray-100 dark:bg-gray-700 rounded mb-2 flex items-center justify-center">
                <Layout size={24} className="text-gray-400" />
              </div>
              <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                {template.name}
              </h4>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {template.category}
              </p>
            </button>
          ))}
        </div>
      )}

      {onClose && (
        <button
          onClick={onClose}
          className="w-full px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
        >
          Cancelar
        </button>
      )}
    </div>
  );
}
