import { memo, useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CustomIcon } from '../../components/CustomIcon';
import { getAreaCategoryIcon, areaStatusIconMap } from '../../utils/iconSystem';
import { areaStatusOptions, areaStatusLabels, areaStatusBadges } from './executionConstants';
import { type AreaFormState, emptyAreaForm } from './executionTypes';
import type { ExecutionAreaStatus, InspectionArea } from '../../types';
import type { OfflineSyncItem } from '../../utils/offlineDb';

type ModuleAreasProps = {
    areas: InspectionArea[];
    busyAction: string | null;
    canEdit: boolean;
    getEntitySyncState: (entityType: OfflineSyncItem['entityType'], entityId: string) => 'pending' | 'failed' | 'synced';
    onCreateDefaultAreas: () => void;
    onCreateArea: (form: AreaFormState) => void;
    onDeleteArea: (area: InspectionArea) => void;
};

export const ModuleAreas = memo(({
    areas,
    busyAction,
    canEdit,
    getEntitySyncState,
    onCreateDefaultAreas,
    onCreateArea,
    onDeleteArea,
}: ModuleAreasProps) => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState<AreaFormState>(emptyAreaForm);

    const totalM2 = useMemo(
        () => areas.reduce((sum, area) => sum + Number(area?.calculatedAreaM2 || 0), 0),
        [areas],
    );

    const calculated = useMemo(() => {
        const length = Number(form.lengthM);
        const width = Number(form.widthM);
        if (!form.lengthM || !form.widthM || Number.isNaN(length) || Number.isNaN(width)) return 0;
        return Number((length * width).toFixed(2));
    }, [form.lengthM, form.widthM]);

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!form.name.trim()) return;
        onCreateArea(form);
        setForm(emptyAreaForm);
        setShowForm(false);
    };

    const handleOpenDetail = (areaId: string) => {
        if (!id) return;
        navigate(`/inspections/${id}/execute/areas/${areaId}`, {
            state: { selectedAreaId: areaId },
        });
    };

    return (
        <div className="space-y-4">
            {areas.length > 0 && (
                <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:bg-gray-900/50 dark:text-gray-200">
                    Total: <span className="font-semibold">{totalM2.toFixed(2)} m²</span> en {areas.length} área{areas.length !== 1 ? 's' : ''}
                </div>
            )}

            {canEdit && (
                <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                        type="button"
                        className="btn btn-secondary flex items-center justify-center gap-2"
                        onClick={onCreateDefaultAreas}
                        disabled={busyAction === 'default-areas'}
                    >
                        {busyAction === 'default-areas' ? (
                            <CustomIcon name="sync" size="xs" tone="cream" spin />
                        ) : (
                            <CustomIcon name="rooms" size="xs" tone="cream" />
                        )}
                        Crear áreas por defecto
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary flex items-center justify-center gap-2"
                        onClick={() => setShowForm(!showForm)}
                    >
                        <CustomIcon name="plus" size="xs" tone="white" />
                        {showForm ? 'Cerrar formulario' : 'Agregar área'}
                    </button>
                </div>
            )}

            {canEdit && showForm && (
                <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-dashed border-gray-300 p-4 dark:border-gray-600">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <input
                            className="input"
                            placeholder="Nombre del área"
                            value={form.name}
                            onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
                            required
                        />
                        <input
                            className="input"
                            placeholder="Categoría"
                            value={form.category}
                            onChange={(e) => setForm((current) => ({ ...current, category: e.target.value }))}
                        />
                        <input
                            className="input"
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="Largo (m)"
                            value={form.lengthM}
                            onChange={(e) => setForm((current) => ({ ...current, lengthM: e.target.value }))}
                        />
                        <input
                            className="input"
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="Ancho (m)"
                            value={form.widthM}
                            onChange={(e) => setForm((current) => ({ ...current, widthM: e.target.value }))}
                        />
                        <div>
                            <label className="mb-2 block text-sm font-medium">Estado</label>
                            <select
                                className="input"
                                value={form.status}
                                onChange={(e) => setForm((current) => ({ ...current, status: e.target.value as ExecutionAreaStatus }))}
                            >
                                {areaStatusOptions.map((opt) => (
                                    <option key={opt} value={opt}>{areaStatusLabels[opt]}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Área estimada: {calculated.toFixed(2)} m²</p>
                    <div className="flex gap-2">
                        <button type="submit" className="btn btn-primary" disabled={busyAction === 'create-area'}>
                            {busyAction === 'create-area' ? 'Creando...' : 'Guardar área'}
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); setForm(emptyAreaForm); }}>
                            Cancelar
                        </button>
                    </div>
                </form>
            )}

            {areas.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center dark:border-gray-600 dark:bg-gray-900/40">
                    <CustomIcon name="rooms" size="md" tone="mist" />
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        Crea áreas por defecto o agrega un ambiente manual para comenzar.
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {areas.map((area) => (
                        <div
                            key={area.id}
                            className="rounded-2xl border border-gray-200 p-4 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800/80"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <button
                                    type="button"
                                    className="flex-1 text-left"
                                    onClick={() => handleOpenDetail(area.id)}
                                >
                                    <div className="flex items-center gap-2">
                                        <CustomIcon name={getAreaCategoryIcon(area.category, area.name)} size="xs" tone="mist" />
                                        <p className="font-semibold text-gray-900 dark:text-white">{area.name}</p>
                                    </div>
                                    <div className="mt-1 flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                                        <span>{area.category}</span>
                                        <span>{(area.calculatedAreaM2 || 0).toFixed(2)} m²</span>
                                    </div>
                                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                                        {getEntitySyncState('area', area.id) === 'pending' && 'Pendiente de sincronizar'}
                                        {getEntitySyncState('area', area.id) === 'failed' && 'Error al sincronizar'}
                                        {(getEntitySyncState('area', area.id) === 'synced' || getEntitySyncState('area', area.id) === undefined) && 'Guardado'}
                                    </p>
                                </button>
                                <div className="flex items-center gap-2">
                                    <span className={`badge ${areaStatusBadges[area.status]}`}>
                                        <CustomIcon name={areaStatusIconMap[area.status] ?? 'rooms'} size="xs" tone="white" />
                                        {areaStatusLabels[area.status]}
                                    </span>
                                    {canEdit && (
                                        <button
                                            type="button"
                                            onClick={() => onDeleteArea(area)}
                                            disabled={busyAction === `delete-area-${area.id}`}
                                            className="flex h-8 w-8 items-center justify-center rounded-lg text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                                        >
                                            <CustomIcon name="trash" size="xs" tone="rose" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
});
ModuleAreas.displayName = 'ModuleAreas';
