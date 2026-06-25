import { memo } from 'react';
import { CustomIcon } from '../../components/CustomIcon';
import { getAreaCategoryIcon, areaStatusIconMap } from '../../utils/iconSystem';
import { areaStatusLabels } from './executionConstants';
import type { InspectionArea } from '../../types';
import type { OfflineSyncItem } from '../../utils/offlineDb';

type MobileAreaCarouselProps = {
    areas: InspectionArea[];
    selectedAreaId: string | null;
    areaObservationCounts: Record<string, number>;
    getEntitySyncState: (entityType: OfflineSyncItem['entityType'], entityId: string) => 'pending' | 'failed' | 'synced';
    onSelectArea: (areaId: string) => void;
    onCreateDefaultAreas: () => void;
    busyAction: string | null;
    canEdit: boolean;
};

export const MobileAreaCarousel = memo(({
    areas,
    selectedAreaId,
    areaObservationCounts,
    getEntitySyncState,
    onSelectArea,
    onCreateDefaultAreas,
    busyAction,
    canEdit,
}: MobileAreaCarouselProps) => (
    <div className="card space-y-4 lg:hidden">
        <div className="flex flex-col gap-3">
            <div>
                <h2 className="text-lg font-semibold">Áreas del departamento</h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Recorre las áreas en horizontal y abre el detalle del ambiente que quieras inspeccionar.
                </p>
            </div>

            {canEdit && (
                <button
                    type="button"
                    className="btn btn-secondary flex items-center justify-center gap-2"
                    onClick={onCreateDefaultAreas}
                    disabled={busyAction === 'default-areas'}
                >
                    {busyAction === 'default-areas' ? <CustomIcon name="sync" size="xs" tone="white" spin /> : <CustomIcon name="rooms" size="xs" tone="cream" />}
                    Crear áreas por defecto
                </button>
            )}
        </div>

        {areas.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-5 text-center text-gray-500 dark:border-gray-600 dark:bg-gray-900/40 dark:text-gray-400">
                <div className="mb-3 flex justify-center"><CustomIcon name="image" size="sm" tone="mist" /></div>
                Crea áreas por defecto para comenzar la ejecución técnica del departamento.
            </div>
        ) : (
            <>
                <div className="-mx-1 overflow-x-auto pb-2 [scrollbar-width:none]">
                    <div className="flex min-w-max snap-x gap-3 px-1">
                        {areas.map((area) => {
                            const isSelected = area.id === selectedAreaId;

                            return (
                                <button
                                    key={area.id}
                                    type="button"
                                    onClick={() => onSelectArea(area.id)}
                                    className={`min-h-20 w-44 shrink-0 snap-start rounded-2xl border px-4 py-3 text-left transition-colors ${isSelected
                                        ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-500/10'
                                        : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900'
                                        }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <CustomIcon name={getAreaCategoryIcon(area.category, area.name)} size="xs" tone="mist" />
                                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{area.name}</span>
                                    </div>
                                    <div className="mt-2 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                                        <span>{areaStatusLabels[area.status]}</span>
                                        <span>{areaObservationCounts[area.id] || 0} obs.</span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {selectedAreaId && (() => {
                    const selectedArea = areas.find((a) => a.id === selectedAreaId);
                    if (!selectedArea) return null;
                    return (
                        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/60">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <CustomIcon name={getAreaCategoryIcon(selectedArea.category, selectedArea.name)} size="xs" tone="mist" />
                                        <p className="font-semibold text-gray-900 dark:text-white">{selectedArea.name}</p>
                                    </div>
                                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                        {selectedArea.category} · {(selectedArea.calculatedAreaM2 || 0).toFixed(2)} m²
                                    </p>
                                </div>
                                <span className={`badge badge-${selectedArea.status === 'aprobado' ? 'success' : selectedArea.status === 'observado' ? 'danger' : selectedArea.status === 'en_revision' ? 'info' : 'warning'}`}>
                                    <CustomIcon name={areaStatusIconMap[selectedArea.status] ?? 'rooms'} size="xs" tone="white" />
                                    {areaStatusLabels[selectedArea.status]}
                                </span>
                            </div>

                            <div className="mt-3 flex items-center justify-between gap-3 text-xs text-gray-500 dark:text-gray-400">
                                <span>
                                    {getEntitySyncState('area', selectedArea.id) === 'pending' && 'Pendiente de sincronizar'}
                                    {getEntitySyncState('area', selectedArea.id) === 'failed' && 'Error al sincronizar'}
                                    {getEntitySyncState('area', selectedArea.id) === 'synced' && 'Guardado'}
                                </span>
                                <span>{areaObservationCounts[selectedArea.id] || 0} observaciones</span>
                            </div>

                            <button
                                type="button"
                                className="btn btn-primary mt-4 flex w-full items-center justify-center gap-2"
                                onClick={() => onSelectArea(selectedArea.id)}
                            >
                                Abrir detalle del área
                                <CustomIcon name="arrow-right" size="xs" tone="white" />
                            </button>
                        </div>
                    );
                })()}
            </>
        )}
    </div>
));
MobileAreaCarousel.displayName = 'MobileAreaCarousel';
