import { memo } from 'react';
import { CustomIcon } from '../../components/CustomIcon';
import { getAreaCategoryIcon, areaStatusIconMap } from '../../utils/iconSystem';
import { areaStatusLabels, areaStatusBadges } from './executionConstants';
import type { InspectionArea } from '../../types';
import type { AreaFormState } from './executionTypes';
import type { OfflineSyncItem } from '../../utils/offlineDb';

type DesktopAreaSidebarProps = {
    areas: InspectionArea[];
    selectedAreaId: string | null;
    areaObservationCounts: Record<string, number>;
    getEntitySyncState: (entityType: OfflineSyncItem['entityType'], entityId: string) => 'pending' | 'failed' | 'synced';
    onSelectArea: (areaId: string) => void;
    onCreateDefaultAreas: () => void;
    onToggleCreator: () => void;
    showAreaCreator: boolean;
    manualAreaForm: AreaFormState;
    onManualAreaFormChange: (updater: (current: AreaFormState) => AreaFormState) => void;
    onCreateAreaSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
    busyAction: string | null;
    canEdit: boolean;
    creatorCalculated: number;
};

export const DesktopAreaSidebar = memo(({
    areas,
    selectedAreaId,
    areaObservationCounts,
    getEntitySyncState,
    onSelectArea,
    onCreateDefaultAreas,
    onToggleCreator,
    showAreaCreator,
    manualAreaForm,
    onManualAreaFormChange,
    onCreateAreaSubmit,
    busyAction,
    canEdit,
    creatorCalculated,
}: DesktopAreaSidebarProps) => (
    <aside className="space-y-4">
        <div className="card space-y-4 xl:sticky xl:top-24">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between xl:flex-col xl:items-stretch">
                <div>
                    <h2 className="text-lg font-semibold">Áreas del departamento</h2>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        Selecciona un ambiente para cargar medidas, hallazgos y fotos.
                    </p>
                </div>
                {canEdit && (
                    <div className="flex flex-col gap-2">
                        <button type="button" className="btn btn-secondary flex items-center justify-center gap-2" onClick={onCreateDefaultAreas} disabled={busyAction === 'default-areas'}>
                            {busyAction === 'default-areas' ? <CustomIcon name="sync" size="xs" tone="cream" spin /> : <CustomIcon name="rooms" size="xs" tone="cream" />}
                            Crear áreas por defecto
                        </button>
                        <button type="button" className="btn btn-primary flex items-center justify-center gap-2" onClick={onToggleCreator}>
                            <CustomIcon name="plus" size="xs" tone="white" />
                            {showAreaCreator ? 'Cerrar formulario' : 'Agregar área'}
                        </button>
                    </div>
                )}
            </div>

            {canEdit && showAreaCreator && (
                <form onSubmit={onCreateAreaSubmit} className="space-y-3 rounded-2xl border border-dashed border-gray-300 p-4 dark:border-gray-600">
                    <input className="input" placeholder="Nombre del área" value={manualAreaForm.name} onChange={(event) => onManualAreaFormChange((current) => ({ ...current, name: event.target.value }))} />
                    <input className="input" placeholder="Categoría" value={manualAreaForm.category} onChange={(event) => onManualAreaFormChange((current) => ({ ...current, category: event.target.value }))} />
                    <div className="grid grid-cols-2 gap-3">
                        <input className="input" type="number" min="0" step="0.01" placeholder="Largo m" value={manualAreaForm.lengthM} onChange={(event) => onManualAreaFormChange((current) => ({ ...current, lengthM: event.target.value }))} />
                        <input className="input" type="number" min="0" step="0.01" placeholder="Ancho m" value={manualAreaForm.widthM} onChange={(event) => onManualAreaFormChange((current) => ({ ...current, widthM: event.target.value }))} />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Área estimada: {creatorCalculated.toFixed(2)} m²</p>
                    <button type="submit" className="btn btn-primary w-full" disabled={busyAction === 'create-area'}>
                        {busyAction === 'create-area' ? 'Creando...' : 'Guardar área'}
                    </button>
                </form>
            )}

            <div className="space-y-3">
                    {areas.map((area) => (
                        <button
                            key={area.id}
                            type="button"
                            onClick={() => onSelectArea(area.id)}
                            className={`w-full rounded-2xl border p-4 text-left transition-colors ${area.id === selectedAreaId
                                ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-500/10'
                                : 'border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800/80'
                                }`}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <CustomIcon name={getAreaCategoryIcon(area.category, area.name)} size="xs" tone="mist" />
                                        <p className="font-semibold text-gray-900 dark:text-white">{area.name}</p>
                                    </div>
                                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{area.category}</p>
                                </div>
                                <span className={`badge ${areaStatusBadges[area.status]}`}><CustomIcon name={areaStatusIconMap[area.status] ?? 'rooms'} size="xs" tone="white" />{areaStatusLabels[area.status]}</span>
                            </div>
                            <div className="mt-3 flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
                                <span>{(area.calculatedAreaM2 || 0).toFixed(2)} m²</span>
                                <span>{areaObservationCounts[area.id] || 0} obs.</span>
                            </div>
                            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                {getEntitySyncState('area', area.id) === 'pending' && 'Pendiente de sincronizar'}
                                {getEntitySyncState('area', area.id) === 'failed' && 'Error al sincronizar'}
                                {getEntitySyncState('area', area.id) === 'synced' && 'Guardado'}
                            </p>
                        </button>
                    ))}
            </div>
        </div>
    </aside>
));
DesktopAreaSidebar.displayName = 'DesktopAreaSidebar';
