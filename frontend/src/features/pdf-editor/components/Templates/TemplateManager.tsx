import { useState, useEffect, useCallback } from 'react';
import { pdfTemplateService, type PdfTemplate } from '../../services/pdfApi';
import { Plus, Pencil, Trash2, Layout, Loader2 } from 'lucide-react';

interface TemplateManagerProps {
  onUseTemplate?: (template: PdfTemplate) => void;
  onClose?: () => void;
}

export function TemplateManager({ onUseTemplate, onClose }: TemplateManagerProps) {
  const [templates, setTemplates] = useState<PdfTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('inspeccion');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const fetchTemplates = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await pdfTemplateService.getAll();
      setTemplates(result.data);
    } catch {
      setTemplates([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleCreate = useCallback(async () => {
    if (!newName.trim()) return;
    try {
      await pdfTemplateService.create({
        name: newName,
        category: newCategory,
        layoutJson: { pages: [{ width: 595, height: 842, elements: [] }] },
        isDefault: false
      });
      setNewName('');
      setIsCreating(false);
      fetchTemplates();
    } catch {
      // silently handle error
    }
  }, [newName, newCategory, fetchTemplates]);

  const handleUpdate = useCallback(async (id: string) => {
    if (!editName.trim()) return;
    try {
      await pdfTemplateService.update(id, { name: editName });
      setEditingId(null);
      fetchTemplates();
    } catch {
      // silently handle error
    }
  }, [editName, fetchTemplates]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await pdfTemplateService.delete(id);
      fetchTemplates();
    } catch {
      // silently handle error
    }
  }, [fetchTemplates]);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Layout size={16} className="text-primary-600" />
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Gestión de Plantillas
          </h3>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded"
        >
          <Plus size={12} />
          Nueva
        </button>
      </div>

      {isCreating && (
        <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nombre de la plantilla"
            className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500"
            autoFocus
          />
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg"
          >
            <option value="inspeccion">Inspección</option>
            <option value="reporte">Reporte</option>
            <option value="custom">Personalizada</option>
          </select>
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={!newName.trim()}
              className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-primary-600 rounded hover:bg-primary-700 disabled:opacity-50"
            >
              Crear
            </button>
            <button
              onClick={() => setIsCreating(false)}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={20} className="animate-spin text-primary-600" />
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-8 text-sm text-gray-400">
          No hay plantillas creadas.
        </div>
      ) : (
        <div className="space-y-2">
          {templates.map((template) => (
            <div
              key={template.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
            >
              <Layout size={16} className="text-gray-400 shrink-0" />
              <div className="flex-1 min-w-0">
                {editingId === template.id ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 px-2 py-1 text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded"
                      autoFocus
                    />
                    <button
                      onClick={() => handleUpdate(template.id)}
                      className="px-2 py-1 text-xs text-white bg-primary-600 rounded"
                    >
                      Guardar
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-2 py-1 text-xs text-gray-600 bg-white border border-gray-300 rounded"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <>
                    <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                      {template.name}
                      {template.isDefault && (
                        <span className="ml-1 text-[10px] text-primary-500">(predeterminada)</span>
                      )}
                    </h4>
                    <p className="text-[10px] text-gray-400">{template.category}</p>
                  </>
                )}
              </div>
              {editingId !== template.id && (
                <div className="flex gap-1 shrink-0">
                  {onUseTemplate && (
                    <button
                      onClick={() => onUseTemplate(template)}
                      className="px-2 py-1 text-[10px] font-medium text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded"
                    >
                      Usar
                    </button>
                  )}
                  <button
                    onClick={() => { setEditingId(template.id); setEditName(template.name); }}
                    className="p-1 text-gray-400 hover:text-gray-600"
                    title="Editar"
                  >
                    <Pencil size={12} />
                  </button>
                  {!template.isDefault && (
                    <button
                      onClick={() => handleDelete(template.id)}
                      className="p-1 text-gray-400 hover:text-red-500"
                      title="Eliminar"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {onClose && (
        <button
          onClick={onClose}
          className="w-full px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
        >
          Cerrar
        </button>
      )}
    </div>
  );
}
