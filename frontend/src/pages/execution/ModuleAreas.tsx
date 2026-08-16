import { memo, useMemo, useState, type FormEvent } from 'react';
import { CustomIcon } from '../../components/CustomIcon';
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
            lengthM: area.calculatedAreaM2?.toString() || '',
            widthM: '1',
            ceilingHeightM: '',
            status: area.status,
            notes: area.notes || '',
        });
    };

    const handleSaveEdit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!editingId || !onUpdateArea) return;
        onUpdateArea(editingId, { ...editForm, widthM: '1' });
        setEditingId(null);
    };

    const getAreaIcon = (name: string) => {
        const lower = name.toLowerCase();
        if (lower.includes('baño') || lower.includes('toilet')) return 'bath' as const;
        if (lower.includes('cocina') || lower.includes('kitchen')) return 'utensils' as const;
        if (lower.includes('dormitorio') || lower.includes('recámara')) return 'bed' as const;
        if (lower.includes('sala') || lower.includes('living')) return 'sofa' as const;
        if (lower.includes('comedor')) return 'utensils' as const;
        if (lower.includes('balcón') || lower.includes('terraza')) return 'rooms' as const;
        if (lower.includes('muros') || lower.includes('vanos')) return 'ruler' as const;
        if (lower.includes('entrada') || lower.includes('lobby')) return 'door' as const;
        if (lower.includes('lavado') || lower.includes('lavandería')) return 'rooms' as const;
        if (lower.includes('estudio') || lower.includes('despacho')) return 'note-pencil' as const;
        return 'rooms' as const;
    };

    return (
        <div className="space-y-3">
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
                        <input className="input uppercase" placeholder="Nombre del área" value={form.name} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value.toUpperCase() }))} required />
                        <input className="input" type="number" min="0" step="0.01" placeholder="Metros cuadrados (m²) — opcional" value={form.lengthM} onChange={(e) => setForm((c) => ({ ...c, lengthM: e.target.value, widthM: '1' }))} />
                        <p className="text-[11px] text-gray-400">Si el área no tiene medida (ej. depósito), déjalo vacío.</p>
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
                                <form onSubmit={handleSaveEdit} className="space-y-2 rounded-2xl border border-primary-300 bg-primary-50/50 p-3 dark:border-primary-700 dark:bg-primary-900/10">
                                    <input className="input text-sm uppercase" placeholder="Nombre" value={editForm.name} onChange={(e) => setEditForm((c) => ({ ...c, name: e.target.value.toUpperCase() }))} required />
                                    <input className="input text-sm" type="number" min="0" step="0.01" placeholder="Metros cuadrados (m²) — opcional" value={editForm.lengthM} onChange={(e) => setEditForm((c) => ({ ...c, lengthM: e.target.value, widthM: '1' }))} />
                                    <div className="flex gap-2">
                                        <button type="submit" className="btn btn-primary text-sm flex-1">Guardar</button>
                                        <button type="button" className="btn btn-secondary text-sm" onClick={() => setEditingId(null)}>Cancelar</button>
                                    </div>
                                </form>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => handleEditClick(area)}
                                    className="flex w-full items-center gap-3 rounded-2xl border border-gray-200 px-3 py-2.5 text-left transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800/80"
                                >
                                    <CustomIcon name={getAreaIcon(area.name)} size="xs" tone="mist" />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{area.name}</p>
                                        <p className="text-[11px] text-gray-400 dark:text-gray-500">
                                            {getEntitySyncState('area', area.id) === 'pending' && 'Pendiente sync'}
                                            {getEntitySyncState('area', area.id) === 'failed' && 'Error sync'}
                                            {(getEntitySyncState('area', area.id) === 'synced' || getEntitySyncState('area', area.id) === undefined) && 'Guardado'}
                                        </p>
                                    </div>
                                    <span className="shrink-0 text-sm font-bold text-gray-700 dark:text-gray-200">
                                        {area.calculatedAreaM2 != null ? `${Number(area.calculatedAreaM2).toFixed(1)} m²` : '—'}
                                    </span>
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

                    {areas.length > 0 && (
                        <div className="rounded-2xl bg-gray-50 px-3 py-2 text-xs text-gray-700 dark:bg-gray-900/50 dark:text-gray-200">
                            Total: <span className="font-bold">{totalM2.toFixed(1)} m²</span> · {areas.length} área{areas.length !== 1 ? 's' : ''}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
});
ModuleAreas.displayName = 'ModuleAreas';
