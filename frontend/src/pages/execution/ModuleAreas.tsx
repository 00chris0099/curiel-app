import { memo, useMemo, useState, type FormEvent } from 'react';
import { CustomIcon } from '../../components/CustomIcon';
import { getAreaCategoryIcon } from '../../utils/iconSystem';
import { type AreaFormState, emptyAreaForm } from './executionTypes';
import type { InspectionArea } from '../../types';
import type { OfflineSyncItem } from '../../utils/offlineDb';

type ModuleAreasProps = {
    areas: InspectionArea[];
    busyAction: string | null;
    canEdit: boolean;
    getEntitySyncState: (entityType: OfflineSyncItem['entityType'], entityId: string) => 'pending' | 'failed' | 'synced';
    onCreateDefaultAreas: () => void;
    onCreateArea: (form: AreaFormState) => void;
    onUpdateArea?: (areaId: string, form: AreaFormState) => void;
    onDeleteArea: (area: InspectionArea) => void;
};

export const ModuleAreas = memo(({
    areas,
    busyAction,
    canEdit,
    getEntitySyncState,
    onCreateDefaultAreas,
    onCreateArea,
    onUpdateArea,
    onDeleteArea,
}: ModuleAreasProps) => {
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState<AreaFormState>(emptyAreaForm);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<AreaFormState>(emptyAreaForm);

    const totalM2 = useMemo(
        () => areas.reduce((sum, area) => sum + Number(area?.calculatedAreaM2 || 0), 0),
        [areas],
    );

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!form.name.trim()) return;
        onCreateArea(form);
        setForm(emptyAreaForm);
        setShowForm(false);
    };

    const handleEditClick = (area: InspectionArea) => {
        setEditingId(area.id);
        setEditForm({
            name: area.name,
            category: area.category,
            lengthM: area.lengthM?.toString() || '',
            widthM: area.widthM?.toString() || '',
            ceilingHeightM: area.ceilingHeightM?.toString() || '',
            status: area.status,
            notes: area.notes || '',
        });
    };

    const handleSaveEdit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!editingId || !onUpdateArea) return;
        onUpdateArea(editingId, editForm);
        setEditingId(null);
    };

    return (
        <div className="space-y-3">
            {areas.length > 0 && (
                <div className="rounded-2xl bg-gray-50 px-3 py-2 text-xs text-gray-700 dark:bg-gray-900/50 dark:text-gray-200">
                    Total: <span className="font-bold">{totalM2.toFixed(1)} m²</span> · {areas.length} área{areas.length !== 1 ? 's' : ''}
                </div>
            )}

            {canEdit && (
                <div className="flex gap-2">
                    <button
                        type="button"
                        className="btn btn-secondary flex items-center justify-center gap-2 text-sm"
                        onClick={onCreateDefaultAreas}
                        disabled={busyAction === 'default-areas'}
                    >
                        {busyAction === 'default-areas' ? (
                            <CustomIcon name="sync" size="xs" tone="cream" spin />
                        ) : (
                            <CustomIcon name="rooms" size="xs" tone="cream" />
                        )}
                        <span className="hidden sm:inline">Crear áreas por defecto</span>
                        <span className="sm:hidden">Por defecto</span>
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary flex items-center justify-center gap-2 text-sm"
                        onClick={() => setShowForm(!showForm)}
                    >
                        <CustomIcon name="plus" size="xs" tone="white" />
                        {showForm ? 'Cancelar' : 'Agregar'}
                    </button>
                </div>
            )}

            {canEdit && showForm && (
                <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-dashed border-gray-300 p-3 dark:border-gray-600">
                    <div className="grid grid-cols-1 gap-2">
                        <input className="input" placeholder="Nombre del área" value={form.name} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} required />
                        <input className="input" placeholder="Categoría" value={form.category} onChange={(e) => setForm((c) => ({ ...c, category: e.target.value }))} />
                        <input className="input" type="number" min="0" step="0.01" placeholder="Área (m²)" value={form.lengthM} onChange={(e) => setForm((c) => ({ ...c, lengthM: e.target.value, widthM: e.target.value }))} />
                    </div>
                    <div className="flex gap-2">
                        <button type="submit" className="btn btn-primary text-sm" disabled={busyAction === 'create-area'}>Guardar</button>
                        <button type="button" className="btn btn-secondary text-sm" onClick={() => { setShowForm(false); setForm(emptyAreaForm); }}>Cancelar</button>
                    </div>
                </form>
            )}

            {areas.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center dark:border-gray-600 dark:bg-gray-900/40">
                    <CustomIcon name="rooms" size="md" tone="mist" />
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Crea áreas por defecto o agrega una manual.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {areas.map((area) => (
                        <div key={area.id}>
                            {editingId === area.id ? (
                                /* Edit mode */
                                <form onSubmit={handleSaveEdit} className="space-y-2 rounded-2xl border border-primary-300 bg-primary-50/50 p-3 dark:border-primary-700 dark:bg-primary-900/10">
                                    <input className="input text-sm" placeholder="Nombre" value={editForm.name} onChange={(e) => setEditForm((c) => ({ ...c, name: e.target.value }))} required />
                                    <input className="input text-sm" placeholder="Categoría" value={editForm.category} onChange={(e) => setEditForm((c) => ({ ...c, category: e.target.value }))} />
                                    <input className="input text-sm" type="number" min="0" step="0.01" placeholder="Área (m²)" value={editForm.lengthM} onChange={(e) => setEditForm((c) => ({ ...c, lengthM: e.target.value, widthM: e.target.value }))} />
                                    <div className="flex gap-2">
                                        <button type="submit" className="btn btn-primary text-sm flex-1">Guardar</button>
                                        <button type="button" className="btn btn-secondary text-sm" onClick={() => setEditingId(null)}>Cancelar</button>
                                    </div>
                                </form>
                            ) : (
                                /* View mode */
                                <button
                                    type="button"
                                    onClick={() => handleEditClick(area)}
                                    className="flex w-full items-center gap-3 rounded-2xl border border-gray-200 px-3 py-2.5 text-left transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800/80"
                                >
                                    <CustomIcon name={getAreaCategoryIcon(area.category, area.name)} size="xs" tone="mist" />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{area.name}</p>
                                        <p className="text-[11px] text-gray-400 dark:text-gray-500">
                                            {getEntitySyncState('area', area.id) === 'pending' && 'Pendiente sync'}
                                            {getEntitySyncState('area', area.id) === 'failed' && 'Error sync'}
                                            {(getEntitySyncState('area', area.id) === 'synced' || getEntitySyncState('area', area.id) === undefined) && 'Guardado'}
                                        </p>
                                    </div>
                                    <span className="shrink-0 text-sm font-bold text-gray-700 dark:text-gray-200">{(area.calculatedAreaM2 || 0).toFixed(1)} m²</span>
                                    {canEdit && (
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); onDeleteArea(area); }}
                                            disabled={busyAction === `delete-area-${area.id}`}
                                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-red-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                                            aria-label={`Eliminar area ${area.name}`}
                                        >
                                            <CustomIcon name="trash" size="xs" tone="rose" />
                                        </button>
                                    )}
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
});
ModuleAreas.displayName = 'ModuleAreas';
