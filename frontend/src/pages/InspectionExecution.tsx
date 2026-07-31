import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from '../api/axios';
import { Loader } from '../components/Loader';
import { type CustomIconName } from '../components/CustomIcon';
import ConnectionStatus from '../components/ConnectionStatus';
import { useOfflineSync } from '../hooks/useOfflineSync';
import inspectionService from '../services/inspection.service';
import { useAuthStore } from '../store/authStore';
import type {
    CreateInspectionAreaDto,
    CreateInspectionObservationDto,
    InspectionArea,
    InspectionExecutionData,
    UpdateInspectionAreaDto,
} from '../types';
import {
    canApproveInspectionReport,
    canManageExecutionContent,
    canSendExecutionToReview,
} from '../utils/inspectionPermissions';
import {
    addSyncQueueItem,
    createLocalId,
    fileToDataUrl,
    getInspectionQueueItems,
    getExecutionSnapshot,
    mergeExecutionWithQueue,
    saveExecutionSnapshot,
    removeSyncQueueItemByClientId,
    type OfflineSyncItem,
} from '../utils/offlineDb';
import {
    defaultAreaDefinitions,
} from './execution/executionConstants';
import {
    type AreaFormState,
    type SummaryFormState,
    emptySummaryForm,
} from './execution/executionTypes';
import { ModuleGrid } from './execution/ModuleGrid';
import { ModuleEdificio } from './execution/ModuleEdificio';
import { ModuleFotoPlano } from './execution/ModuleFotoPlano';
import { ModuleAreas } from './execution/ModuleAreas';
import { ModuleObsMetrica } from './execution/ModuleObsMetrica';
import { ModuleObservaciones } from './execution/ModuleObservaciones';
import { ModuleConsideraciones } from './execution/ModuleConsideraciones';

export const InspectionExecution = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [execution, setExecution] = useState<InspectionExecutionData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [busyAction, setBusyAction] = useState<string | null>(null);
    const [summaryForm, setSummaryForm] = useState<SummaryFormState>(emptySummaryForm);
    const [queueItems, setQueueItems] = useState<OfflineSyncItem[]>([]);

    const loadExecution = useCallback(async (isInitialLoad = false) => {
        if (!id) {
            navigate('/inspections', { replace: true });
            return;
        }

        if (isInitialLoad) {
            setIsLoading(true);
        }
        setErrorMessage(null);

        try {
            let remoteExecution: InspectionExecutionData | null = null;

            if (navigator.onLine) {
                try {
                    remoteExecution = await inspectionService.getExecution(id);
                    await saveExecutionSnapshot(id, remoteExecution);
                } catch (remoteError) {
                    const snapshot = await getExecutionSnapshot(id);
                    if (!snapshot?.data) {
                        throw remoteError;
                    }
                    remoteExecution = snapshot.data;
                }
            } else {
                const snapshot = await getExecutionSnapshot(id);
                if (!snapshot?.data) {
                    throw new Error('No hay datos guardados offline para esta inspección');
                }
                remoteExecution = snapshot.data;
            }

            const pendingQueueItems = await getInspectionQueueItems(id);
            setQueueItems(pendingQueueItems);
            const mergedExecution = mergeExecutionWithQueue(remoteExecution, pendingQueueItems);

            setExecution(mergedExecution);
        } catch (error: unknown) {
            const message = getApiErrorMessage(error, 'No se pudo cargar la ejecución de la inspección');
            setExecution(null);
            setErrorMessage(message);
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    }, [id, navigate]);

    const {
        isOnline,
        pendingCount,
        isSyncing,
        syncNow,
        refreshPendingCount,
    } = useOfflineSync(id, async () => {
        await loadExecution();
    });

    useEffect(() => {
        loadExecution(true);
    }, [loadExecution]);

    const prevIsOnlineRef = useRef(isOnline);
    useEffect(() => {
        if (isOnline && !prevIsOnlineRef.current) {
            loadExecution();
        }
        prevIsOnlineRef.current = isOnline;
    }, [isOnline, loadExecution]);

    const areas = useMemo(() => Array.isArray(execution?.areas) ? execution.areas : [], [execution?.areas]);
    const observations = useMemo(() => Array.isArray(execution?.observations) ? execution.observations : [], [execution?.observations]);
    const photos = useMemo(() => Array.isArray(execution?.photos) ? execution.photos : [], [execution?.photos]);
    const summary = execution?.summary ?? null;
    const inspection = execution?.inspection || null;
    const canApproveReport = canApproveInspectionReport(user || null);
    const canEditExecutionContent = canManageExecutionContent(inspection, user || null);
    const canCompleteExecution = canSendExecutionToReview(inspection, user || null);

    useEffect(() => {
        if (!summary) {
            setSummaryForm(emptySummaryForm);
            return;
        }

        setSummaryForm({
            generalConclusion: summary.generalConclusion || '',
            finalRecommendations: summary.finalRecommendations || '',
            reportStatus: summary.reportStatus,
        });
    }, [summary]);
    const getEntitySyncState = useCallback((entityType: OfflineSyncItem['entityType'], entityId: string) => {
        const related = queueItems.find((item) => item.entityType === entityType && (
            ('clientId' in item && item.clientId === entityId)
            || ('targetId' in item && item.targetId === entityId)
        ));

        return related?.syncStatus || 'synced';
    }, [queueItems]);

    const withBusyAction = async (action: string, callback: () => Promise<void>) => {
        setBusyAction(action);
        try {
            await callback();
        } finally {
            setBusyAction(null);
        }
    };

    const queueMutation = async (
        item: Parameters<typeof addSyncQueueItem>[0],
        _preferredAreaId?: string | null,
        _successMessage = 'Guardado offline'
    ) => {
        await addSyncQueueItem(item);
        await refreshPendingCount();
        await loadExecution();
    };

    const handleCreateDefaultAreas = async () => {
        if (!id) return;

        await withBusyAction('default-areas', async () => {
            if (!isOnline) {
                const existingNames = new Set(areas.map((area) => area.name));
                const missingAreas = defaultAreaDefinitions.filter((definition) => !existingNames.has(definition.name));

                for (const definition of missingAreas) {
                    await addSyncQueueItem({
                        inspectionId: id,
                        entityType: 'area',
                        action: 'create',
                        clientId: createLocalId('local-area'),
                        data: {
                            name: definition.name,
                            category: definition.category,
                            status: 'pendiente',
                        },
                    })
                }

                await refreshPendingCount();
                await loadExecution();
                return;
            }

            await inspectionService.createDefaultAreas(id);
            await loadExecution();
        });
    };

    const handleCreateArea = async (form: AreaFormState) => {
        if (!id) return;

        await withBusyAction('create-area', async () => {
            const clientId = createLocalId('local-area');
            const payload: CreateInspectionAreaDto = {
                name: form.name.trim(),
                category: form.category.trim() || 'interior',
                lengthM: form.lengthM ? Number(form.lengthM) : null,
                widthM: form.widthM ? Number(form.widthM) : null,
                ceilingHeightM: form.ceilingHeightM ? Number(form.ceilingHeightM) : null,
                status: form.status,
                notes: form.notes.trim() || undefined,
            };

            await queueMutation({
                inspectionId: id,
                entityType: 'area',
                action: 'create',
                clientId,
                data: payload,
            }, clientId, 'Área guardada offline');

            if (isOnline) {
                toast.success('Área creada correctamente');
            }
        });
    };

    const handleUpdateArea = async (areaId: string, form: AreaFormState) => {
        if (!id) return;

        await withBusyAction(`update-area-${areaId}`, async () => {
            const payload: UpdateInspectionAreaDto = {
                name: form.name.trim(),
                category: form.category.trim() || 'interior',
                lengthM: form.lengthM ? Number(form.lengthM) : null,
                widthM: form.widthM ? Number(form.widthM) : null,
                ceilingHeightM: form.ceilingHeightM ? Number(form.ceilingHeightM) : null,
                status: form.status,
                notes: form.notes.trim() || undefined,
            };

            await queueMutation({
                inspectionId: id,
                entityType: 'area',
                action: 'update',
                targetId: areaId,
                data: payload,
            }, areaId, 'Área actualizada offline');

            if (isOnline) {
                toast.success('Área actualizada');
            }
        });
    };

    const handleDeleteArea = async (area: InspectionArea) => {
        if (!id) return;

        await withBusyAction(`delete-area-${area.id}`, async () => {
            await queueMutation({
                inspectionId: id,
                entityType: 'area',
                action: 'delete',
                targetId: area.id,
            }, null, 'Área eliminada offline');

            if (isOnline) {
                toast.success('Área eliminada');
            }
        });
    };

    const handleSaveObservation = async (form: { areaId: string; title: string; description: string; severity: string; type: string; status: string }, editingId?: string) => {
        if (!id) return;

        await withBusyAction('save-observation', async () => {
            const clientId = createLocalId('local-observation');
            const payload = {
                areaId: form.areaId || areas[0]?.id || '',
                title: form.title.trim(),
                description: form.description.trim(),
                severity: form.severity as 'leve' | 'media' | 'alta' | 'critica',
                type: form.type as 'humedad' | 'electrico' | 'sanitario' | 'acabados' | 'carpinteria' | 'estructura' | 'seguridad' | 'otro',
                status: form.status as 'pendiente' | 'corregido' | 'requiere_revision',
            };

            if (editingId) {
                await queueMutation({
                    inspectionId: id,
                    entityType: 'observation',
                    action: 'update',
                    targetId: editingId,
                    data: payload,
                }, null, 'Observación guardada offline');
                if (isOnline) {
                    toast.success('Observación actualizada');
                }
            } else {
                await queueMutation({
                    inspectionId: id,
                    entityType: 'observation',
                    action: 'create',
                    clientId,
                    data: payload,
                }, null, 'Observación guardada offline');
                if (isOnline) {
                    toast.success('Observación registrada');
                }
            }
        });
    };

    const handleDeleteObservation = async (observationId: string) => {
        if (!id) return;

        await withBusyAction(`delete-observation-${observationId}`, async () => {
            await queueMutation({
                inspectionId: id,
                entityType: 'observation',
                action: 'delete',
                targetId: observationId,
            }, null, 'Observación eliminada offline');

            if (isOnline) {
                toast.success('Observación eliminada');
            }
        });
    };

    const handleSaveMetric = async (text: string) => {
        if (!id) return;

        await withBusyAction('save-metric', async () => {
            const existingMetric = observations.find((o) => o.areaId === 'metrico');

            const payload: CreateInspectionObservationDto = {
                areaId: 'metrico',
                title: 'Observaciones Métricas',
                description: text,
                severity: 'leve',
                type: 'otro',
                status: 'pendiente',
            };

            if (existingMetric) {
                await queueMutation({
                    inspectionId: id,
                    entityType: 'observation',
                    action: 'update',
                    targetId: existingMetric.id,
                    data: payload,
                }, null, 'Métrica guardada offline');
            } else {
                const clientId = createLocalId('local-observation');
                await queueMutation({
                    inspectionId: id,
                    entityType: 'observation',
                    action: 'create',
                    clientId,
                    data: payload,
                }, null, 'Métrica guardada offline');
            }
        });
    };

    const handleSaveSummary = async (event?: FormEvent<HTMLFormElement>) => {
        event?.preventDefault();
        if (!id) return;

        await withBusyAction('save-summary', async () => {
            await queueMutation({
                inspectionId: id,
                entityType: 'summary',
                action: 'upsert',
                data: {
                    generalConclusion: summaryForm.generalConclusion.trim() || undefined,
                    finalRecommendations: summaryForm.finalRecommendations.trim() || undefined,
                    reportStatus: summaryForm.reportStatus,
                },
            }, null, 'Resumen guardado offline');

            if (isOnline) {
                toast.success('Resumen técnico actualizado');
            }
        });
    };

    const handleUploadPhoto = async (
        event: FormEvent<HTMLFormElement>,
        type: string,
        caption: string,
        file: File | null,
        areaId?: string
    ) => {
        event.preventDefault();
        if (!id) return;

        if (!file) {
            toast.error('Debes seleccionar una imagen');
            return;
        }

        await withBusyAction(`photo-${type}`, async () => {
            const previewUrl = await fileToDataUrl(file as Blob);
            await queueMutation({
                inspectionId: id,
                entityType: 'photo',
                action: 'create',
                clientId: createLocalId('local-photo'),
                data: {
                    type: type === 'observacion' ? 'area' : type as 'edificio' | 'plano' | 'area' | 'general',
                    caption: caption.trim() || undefined,
                    areaId,
                },
                file,
                fileName: file?.name,
                fileType: file?.type,
                previewUrl,
            }, null, 'Foto guardada offline');

            if (isOnline) {
                toast.success('Foto registrada');
            }
        });
    };

    const handleCompleteInspection = async () => {
        if (!id) return;

        const hasEdificio = photos.some((p) => p.type === 'edificio');
        const hasPlano = photos.some((p) => p.type === 'plano');
        if (!hasEdificio || !hasPlano) {
            const faltantes = [];
            if (!hasEdificio) faltantes.push('foto del edificio');
            if (!hasPlano) faltantes.push('plano del departamento');
            toast.error(`Debes subir: ${faltantes.join(' y ')}`);
            return;
        }

        const confirmed = window.confirm('¿Deseas finalizar esta inspección y enviarla a revisión?');
        if (!confirmed) return;

        await withBusyAction('complete-inspection', async () => {
            const reportStatus = canApproveReport && summaryForm.reportStatus === 'aprobado'
                ? 'aprobado'
                : 'listo_para_revision';

            await queueMutation({
                inspectionId: id,
                entityType: 'summary',
                action: 'upsert',
                data: {
                    generalConclusion: summaryForm.generalConclusion.trim() || undefined,
                    finalRecommendations: summaryForm.finalRecommendations.trim() || undefined,
                    reportStatus,
                },
            }, null, 'Resumen guardado offline');

            await queueMutation({
                inspectionId: id,
                entityType: 'status',
                action: 'upsert',
                data: {
                    status: 'lista_revision',
                },
            }, null, 'Cambio de estado guardado offline');

            if (isOnline) {
                toast.success('Inspección enviada a revisión');
                await loadExecution();
            }
        });
    };

    const handleDeletePhoto = async (photoId: string) => {
        try {
            if (photoId.startsWith('local-')) {
                await removeSyncQueueItemByClientId(photoId);
                await loadExecution();
                toast.success('Foto eliminada');
                return;
            }
            await inspectionService.deletePhoto(photoId);
            await loadExecution();
            toast.success('Foto eliminada');
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'No se pudo eliminar la foto'));
        }
    };

    if (isLoading) {
        return <Loader fullScreen />;
    }

    if (errorMessage) {
        return (
            <div className="mx-auto max-w-3xl pb-10 pt-6">
                <div className="card space-y-4 text-center">
                    <div className="flex justify-center">
                        <span className="text-4xl">⚠️</span>
                    </div>
                    <div>
                        <h1 className="text-xl font-bold">No se pudo cargar la ejecución</h1>
                        <p className="mt-2 text-gray-600 dark:text-gray-400">{errorMessage}</p>
                    </div>
                    <div className="flex flex-col justify-center gap-3 sm:flex-row">
                        <button type="button" className="btn btn-secondary" onClick={() => navigate('/inspections')}>
                            Volver a inspecciones
                        </button>
                        <button type="button" className="btn btn-primary" onClick={() => loadExecution()}>
                            Reintentar
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!inspection) {
        return (
            <div className="mx-auto max-w-3xl pb-10 pt-6">
                <div className="card space-y-4 text-center">
                    <div className="flex justify-center">
                        <span className="text-4xl">🏠</span>
                    </div>
                    <div>
                        <h1 className="text-xl font-bold">Inspección no disponible</h1>
                        <p className="mt-2 text-gray-600 dark:text-gray-400">
                            No se encontraron datos suficientes para mostrar esta ejecución.
                        </p>
                    </div>
                    <button type="button" className="btn btn-primary" onClick={() => navigate('/inspections')}>
                        Volver a inspecciones
                    </button>
                </div>
            </div>
        );
    }

    const moduleDefinitions: { id: string; title: string; icon: CustomIconName; count: number }[] = [
        { id: 'edificio', title: 'Edificio', icon: 'buildings', count: photos.filter((p) => p.type === 'edificio').length },
        { id: 'plano', title: 'Foto Plano', icon: 'ruler', count: photos.filter((p) => p.type === 'plano').length },
        { id: 'areas', title: 'Áreas', icon: 'rooms', count: areas.length },
        { id: 'obs_metrica', title: 'Obs. Métrica', icon: 'note-pencil', count: observations.filter((o) => o.areaId === 'metrico').length },
        { id: 'observaciones', title: 'Observaciones', icon: 'rooms', count: observations.filter((o) => o.areaId !== 'metrico' && o.areaId !== 'consideraciones').length },
        { id: 'consideraciones', title: 'Consideraciones', icon: 'note-pencil', count: 0 },
    ];

    return (
        <div className="flex min-h-[calc(100vh-8rem)] flex-col pb-24 lg:pb-10">
            {/* 6 Modules Grid */}
            <div className="mt-4 flex-1">
                <ModuleGrid modules={moduleDefinitions}>
                    <ModuleEdificio
                        photos={photos}
                        busyAction={busyAction}
                        canEdit={canEditExecutionContent}
                        getEntitySyncState={getEntitySyncState}
                        onUploadPhoto={handleUploadPhoto}
                        onDeletePhoto={handleDeletePhoto}
                    />
                    <ModuleFotoPlano
                        photos={photos}
                        busyAction={busyAction}
                        canEdit={canEditExecutionContent}
                        getEntitySyncState={getEntitySyncState}
                        onUploadPhoto={handleUploadPhoto}
                        onDeletePhoto={handleDeletePhoto}
                    />
                    <ModuleAreas
                        areas={areas}
                        busyAction={busyAction}
                        canEdit={canEditExecutionContent}
                        getEntitySyncState={getEntitySyncState}
                        onCreateDefaultAreas={handleCreateDefaultAreas}
                        onCreateArea={handleCreateArea}
                        onUpdateArea={handleUpdateArea}
                        onDeleteArea={handleDeleteArea}
                    />
                    <ModuleObsMetrica
                        areas={areas}
                        observations={observations}
                        canEdit={canEditExecutionContent}
                        onSaveMetric={handleSaveMetric}
                    />
                    <ModuleObservaciones
                        areas={areas}
                        observations={observations}
                        photos={photos}
                        busyAction={busyAction}
                        canEdit={canEditExecutionContent}
                        onSaveObservation={handleSaveObservation}
                        onDeleteObservation={handleDeleteObservation}
                        onUploadPhoto={handleUploadPhoto}
                        onDeletePhoto={handleDeletePhoto}
                    />
                    <ModuleConsideraciones
                        summaryForm={summaryForm}
                        busyAction={busyAction}
                        canEdit={canEditExecutionContent}
                        onSummaryChange={setSummaryForm}
                        onSaveSummary={handleSaveSummary}
                    />
                </ModuleGrid>
            </div>

            {/* Bottom bar: Connection status + Terminado button */}
            <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-900/95 lg:hidden">
                <div className="flex items-center justify-between gap-3">
                    {/* Offline/Online toggle */}
                    <div className="flex items-center gap-2">
                        <ConnectionStatus
                            pendingCount={pendingCount}
                            onSyncNow={syncNow}
                            isSyncing={isSyncing}
                        />
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                            {pendingCount > 0 ? `${pendingCount} pendiente${pendingCount > 1 ? 's' : ''}` : 'En linea'}
                        </span>
                    </div>

                    {/* Terminado button */}
                    {canCompleteExecution && (
                        <button
                            type="button"
                            onClick={handleCompleteInspection}
                            disabled={busyAction === 'complete-inspection'}
                            className="flex items-center gap-2 rounded-xl bg-[#17324a] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#17324a]/20 transition-all hover:bg-[#1d3d5c] active:scale-[0.97] disabled:opacity-50 dark:bg-primary-600 dark:hover:bg-primary-700"
                        >
                            {busyAction === 'complete-inspection' ? (
                                <>
                                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Enviando...
                                </>
                            ) : (
                                <>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                        <polyline points="22 4 12 14.01 9 11.01" />
                                    </svg>
                                    Terminado
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>

            {/* Desktop: keep terminado in header area but also show connection status */}
            {canCompleteExecution && (
                <div className="mb-4 hidden lg:flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
                    <div className="flex items-center gap-3">
                        <ConnectionStatus
                            pendingCount={pendingCount}
                            onSyncNow={syncNow}
                            isSyncing={isSyncing}
                        />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                            {pendingCount > 0 ? `${pendingCount} cambio${pendingCount > 1 ? 's' : ''} pendiente${pendingCount > 1 ? 's' : ''} de sincronizar` : 'Todo sincronizado'}
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={handleCompleteInspection}
                        disabled={busyAction === 'complete-inspection'}
                        className="flex items-center gap-2 rounded-xl bg-[#17324a] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#17324a]/20 transition-all hover:bg-[#1d3d5c] active:scale-[0.97] disabled:opacity-50 dark:bg-primary-600 dark:hover:bg-primary-700"
                    >
                        {busyAction === 'complete-inspection' ? (
                            <>
                                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Enviando a revision...
                            </>
                        ) : (
                            <>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                    <polyline points="22 4 12 14.01 9 11.01" />
                                </svg>
                                Enviar a revision
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
};
