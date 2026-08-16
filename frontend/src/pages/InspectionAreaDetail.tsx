import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from '../api/axios';
import { CustomIcon } from '../components/CustomIcon';
import { AutoResizeTextarea } from '../components/AutoResizeTextarea';
import { Loader } from '../components/Loader';
import ConnectionStatus from '../components/ConnectionStatus';
import { useOfflineSync } from '../hooks/useOfflineSync';
import inspectionService from '../services/inspection.service';
import { useAuthStore } from '../store/authStore';
import { useConfirmDialog } from '../components/common/useConfirmDialog';
import type {
    ExecutionAreaStatus,
    InspectionArea,
    InspectionObservation,
    ObservationSeverity,
    ObservationType,
    ExecutionPhotoType,
    ObservationResolutionStatus,
} from '../types';
import {
    addSyncQueueItem,
    createLocalId,
    fileToDataUrl,
    getInspectionQueueItems,
    getExecutionSnapshot,
    mergeExecutionWithQueue,
    saveExecutionSnapshot,
} from '../utils/offlineDb';
import { getAreaCategoryIcon, observationSeverityIconMap } from '../utils/iconSystem';
import { canManageExecutionContent } from '../utils/inspectionPermissions';

const areaStatusOptions: ExecutionAreaStatus[] = ['pendiente', 'en_revision', 'observado', 'aprobado'];
const observationSeverityOptions: ObservationSeverity[] = ['leve', 'media', 'alta', 'critica'];
const areaPhotoTypeOptions: ExecutionPhotoType[] = ['area', 'observacion'];

type ObservationFormState = {
    title: string;
    description: string;
    severity: ObservationSeverity;
    type: ObservationType;
    recommendation: string;
    metricValue: string;
    metricUnit: string;
    status: ObservationResolutionStatus;
};

const emptyObservationForm: ObservationFormState = {
    title: '',
    description: '',
    severity: 'leve',
    type: 'acabados',
    recommendation: '',
    metricValue: '',
    metricUnit: '',
    status: 'pendiente',
};

type PhotoFormState = {
    type: ExecutionPhotoType;
    caption: string;
    file: File | null;
    observationId: string;
};

const emptyAreaPhotoForm: PhotoFormState = {
    type: 'area',
    caption: '',
    file: null,
    observationId: '',
};

export const InspectionAreaDetail = () => {
    const { id, areaId } = useParams<{ id: string; areaId: string }>();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { confirm, ConfirmDialog } = useConfirmDialog();
    const [execution, setExecution] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [areaForm, setAreaForm] = useState({
        name: '',
        category: 'interior',
        lengthM: '',
        widthM: '',
        ceilingHeightM: '',
        status: 'pendiente' as ExecutionAreaStatus,
        notes: '',
    });
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [observationForm, setObservationForm] = useState<ObservationFormState>(emptyObservationForm);
    const [areaPhotoForm, setAreaPhotoForm] = useState<PhotoFormState>(emptyAreaPhotoForm);
    const [editingObservationId, setEditingObservationId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const areaGalleryInputRef = useRef<HTMLInputElement>(null);
    const areaCameraInputRef = useRef<HTMLInputElement>(null);

    const {
        isOnline,
        pendingCount,
        isSyncing,
        syncNow,
        refreshPendingCount,
    } = useOfflineSync(id, async () => {
        await loadExecution();
    });

    const loadExecution = useCallback(async () => {
        if (!id) return;

        setIsLoading(true);
        setErrorMessage(null);

        try {
            let remoteExecution: any = null;

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

            const pendingQueueItems = await getInspectionQueueItems(id);
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
    }, [id]);

    useEffect(() => {
        loadExecution();
    }, [loadExecution]);

    const selectedArea: InspectionArea | undefined = useMemo(() => {
        if (!execution?.areas || !areaId) return undefined;
        return execution.areas.find((a: any) => a.id === areaId);
    }, [execution?.areas, areaId]);

    const areaObservations: InspectionObservation[] = useMemo(() => {
        if (!execution?.observations || !areaId) return [];
        return execution.observations.filter((obs: any) => obs.areaId === areaId);
    }, [execution?.observations, areaId]);

    const areaPhotos = useMemo(() => {
        if (!execution?.photos || !areaId) return [];
        return execution.photos.filter((p: any) => p.areaId === areaId);
    }, [execution?.photos, areaId]);
    const canEditExecutionContent = canManageExecutionContent(execution?.inspection ?? null, user || null);

    useEffect(() => {
        if (selectedArea) {
            setAreaForm({
                name: selectedArea.name || '',
                category: selectedArea.category || 'interior',
                lengthM: selectedArea.lengthM?.toString() || '',
                widthM: selectedArea.widthM?.toString() || '',
                ceilingHeightM: selectedArea.ceilingHeightM?.toString() || '',
                status: selectedArea.status || 'pendiente',
                notes: selectedArea.notes || '',
            });
        }
    }, [selectedArea]);

    const areaCalculated = useMemo(() => {
        const length = Number(areaForm.lengthM);
        const width = Number(areaForm.widthM);
        if (!areaForm.lengthM || !areaForm.widthM || isNaN(length) || isNaN(width)) {
            return 0;
        }
        return Number((length * width).toFixed(2));
    }, [areaForm.lengthM, areaForm.widthM]);

    const handleAreaFormChange = (field: string, value: any) => {
        setAreaForm(prev => ({ ...prev, [field]: value }));
        setHasUnsavedChanges(true);
    };

    const handleSaveArea = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!id || !areaId || !selectedArea) return;

        setIsSaving(true);
        try {
            const payload = {
                name: areaForm.name.trim().toUpperCase(),
                category: areaForm.category.trim(),
                lengthM: areaForm.lengthM ? Number(areaForm.lengthM) : null,
                widthM: areaForm.widthM ? Number(areaForm.widthM) : null,
                ceilingHeightM: areaForm.ceilingHeightM ? Number(areaForm.ceilingHeightM) : null,
                status: areaForm.status,
                notes: areaForm.notes.trim() || undefined,
            };

            await addSyncQueueItem({
                inspectionId: id,
                entityType: 'area',
                action: 'update',
                targetId: areaId,
                data: payload,
            });

            await refreshPendingCount();
            await loadExecution();
            setHasUnsavedChanges(false);

            if (isOnline) {
                await syncNow();
            }
        } catch (error) {
            toast.error(getApiErrorMessage(error, 'Error al guardar el área'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleObservationSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!id || !areaId) return;

        if (!observationForm.title.trim() || !observationForm.description.trim()) {
            toast.error('Debes completar el título y la descripción técnica');
            return;
        }

        try {
            const clientId = createLocalId('local-observation');
            const payload = {
                areaId: areaId,
                title: observationForm.title.trim(),
                description: observationForm.description.trim(),
                severity: observationForm.severity,
                type: observationForm.type,
                recommendation: observationForm.recommendation || undefined,
                metricValue: observationForm.metricValue ? Number(observationForm.metricValue) : null,
                metricUnit: observationForm.metricUnit || undefined,
                status: observationForm.status,
            };

            if (editingObservationId) {
                await addSyncQueueItem({
                    inspectionId: id,
                    entityType: 'observation',
                    action: 'update',
                    targetId: editingObservationId,
                    data: payload,
                });
            } else {
                await addSyncQueueItem({
                    inspectionId: id,
                    entityType: 'observation',
                    action: 'create',
                    clientId,
                    data: payload,
                });
            }

            await refreshPendingCount();
            await loadExecution();
            setObservationForm(emptyObservationForm);
            setEditingObservationId(null);

            if (isOnline) {
                await syncNow();
            }
        } catch (error) {
            toast.error(getApiErrorMessage(error, 'Error al guardar observación'));
        }
    };

    const handleEditObservation = (observation: any) => {
        setEditingObservationId(observation.id);
        setObservationForm({
            title: observation.title || '',
            description: observation.description || '',
            severity: observation.severity || 'leve',
            type: observation.type || 'acabados',
            recommendation: observation.recommendation || '',
            metricValue: observation.metricValue?.toString() || '',
            metricUnit: observation.metricUnit || '',
            status: observation.status || 'pendiente',
        });
    };

    const handleDeleteObservation = async (observationId: string) => {
        if (!id) return;

        try {
            await addSyncQueueItem({
                inspectionId: id,
                entityType: 'observation',
                action: 'delete',
                targetId: observationId,
            });

            await refreshPendingCount();
            await loadExecution();

            if (isOnline) {
                await syncNow();
            }
        } catch (error) {
            toast.error(getApiErrorMessage(error, 'Error al eliminar observación'));
        }
    };

    const handleDeletePhoto = async (photoId: string) => {
        if (!id) return;

        try {
            await inspectionService.deletePhoto(photoId);
            await loadExecution();
        } catch (error) {
            toast.error(getApiErrorMessage(error, 'Error al eliminar foto'));
        }
    };

    const handleSetMainPhoto = async (photoId: string, isMain: boolean) => {
        if (!id) return;

        try {
            if (photoId.startsWith('local-')) return;
            await inspectionService.updateExecutionPhoto(id, photoId, { isMain });
            await loadExecution();
        } catch (error) {
            toast.error(getApiErrorMessage(error, 'Error al marcar foto principal'));
        }
    };

    const handleAreaFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !id || !areaId) return;

        try {
            const clientId = createLocalId('local-photo');
            const previewUrl = await fileToDataUrl(file);

            await addSyncQueueItem({
                inspectionId: id,
                entityType: 'photo',
                action: 'create',
                clientId,
                data: {
                    type: areaPhotoForm.type,
                    caption: areaPhotoForm.caption || undefined,
                    areaId: areaId,
                },
                file,
                fileName: file.name,
                fileType: file.type,
                previewUrl,
            });

            await refreshPendingCount();
            await loadExecution();
            setAreaPhotoForm(emptyAreaPhotoForm);

            if (event.target) event.target.value = '';

            if (isOnline) {
                await syncNow();
            }
        } catch (error) {
            toast.error(getApiErrorMessage(error, 'Error al guardar foto'));
        }
    };

    const handleBack = async () => {
        if (hasUnsavedChanges) {
            const confirmed = await confirm({
                title: 'Cambios sin guardar',
                message: 'Hay cambios sin guardar en esta área. ¿Deseas guardar antes de salir?',
                confirmText: 'Guardar y salir',
                cancelText: 'Salir sin guardar',
                variant: 'warning'
            });

            if (confirmed) {
                document.getElementById('area-form')?.dispatchEvent(new Event('submit', { cancelable: true }));
                return;
            }
        }
        navigate(`/inspections/${id}/execute`, { state: { selectedAreaId: areaId } });
    };

    if (isLoading) {
        return <Loader fullScreen />;
    }

    if (errorMessage || !selectedArea) {
        return (
            <div className="space-y-6">
                <div className="card text-center py-12">
                    <p className="text-red-600">{errorMessage || 'Área no encontrada'}</p>
                    <button
                        onClick={() => navigate(`/inspections/${id}/execute`, { state: { selectedAreaId: areaId } })}
                        className="btn btn-primary mt-4 flex items-center gap-2"
                    >
                        <CustomIcon name="arrow-left" size="xs" tone="white" />
                        Volver a áreas
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-5 sm:space-y-6">
            <ConfirmDialog />
            {/* Header with back button */}
            <div className="flex items-start gap-3 sm:items-center sm:gap-4">
                <button
                    onClick={handleBack}
                    className="min-h-11 shrink-0 rounded-lg border border-gray-200 bg-white p-2 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:border-gray-700 dark:hover:bg-gray-700"
                >
                    <CustomIcon name="arrow-left" size="sm" tone="mist" />
                </button>
                <div className="min-w-0">
                    <div className="flex items-start gap-3 sm:items-center">
                        <CustomIcon name={getAreaCategoryIcon(selectedArea.category, selectedArea.name)} size="sm" tone="cream" />
                        <h1 className="text-2xl font-bold leading-tight">{selectedArea.name}</h1>
                    </div>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 sm:text-base">{selectedArea.category}</p>
                </div>
            </div>

            <ConnectionStatus
                pendingCount={pendingCount}
                onSyncNow={syncNow}
                isSyncing={isSyncing}
            />

            {/* Area Details Form */}
            <form id="area-form" onSubmit={handleSaveArea} className="card">
                <h2 className="text-lg font-semibold mb-4">Medidas del área</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">Nombre</label>
                        <input
                            type="text"
                            value={areaForm.name}
                            onChange={(e) => handleAreaFormChange('name', e.target.value.toUpperCase())}
                            className="input uppercase"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">Categoría</label>
                        <select
                            value={areaForm.category}
                            onChange={(e) => handleAreaFormChange('category', e.target.value)}
                            className="input"
                        >
                            <option value="interior">Interior</option>
                            <option value="social">Social</option>
                            <option value="cocina">Cocina</option>
                            <option value="servicio">Servicio</option>
                            <option value="exterior">Exterior</option>
                            <option value="privado">Privado</option>
                            <option value="baño">Baño</option>
                            <option value="estructura/acabados">Estructura/Acabados</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">Largo (m)</label>
                        <input
                            type="number"
                            step="0.01"
                            value={areaForm.lengthM}
                            onChange={(e) => handleAreaFormChange('lengthM', e.target.value)}
                            className="input"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">Ancho (m)</label>
                        <input
                            type="number"
                            step="0.01"
                            value={areaForm.widthM}
                            onChange={(e) => handleAreaFormChange('widthM', e.target.value)}
                            className="input"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">Altura (m) - opcional</label>
                        <input
                            type="number"
                            step="0.01"
                            value={areaForm.ceilingHeightM}
                            onChange={(e) => handleAreaFormChange('ceilingHeightM', e.target.value)}
                            className="input"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">Área calculada</label>
                        <div className="input bg-gray-50 dark:bg-gray-800">
                            {areaCalculated} m²
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">Estado</label>
                        <select
                            value={areaForm.status}
                            onChange={(e) => handleAreaFormChange('status', e.target.value)}
                            className="input"
                        >
                            {areaStatusOptions.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="mt-4">
                    <label className="block text-sm font-medium mb-2">Notas</label>
                    <textarea
                        value={areaForm.notes}
                        onChange={(e) => handleAreaFormChange('notes', e.target.value)}
                        className="input min-h-[100px]"
                    />
                </div>
                {canEditExecutionContent && (
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="btn btn-primary flex items-center gap-2"
                        >
                            {isSaving ? <CustomIcon name="sync" size="xs" tone="white" spin /> : <CustomIcon name="save" size="xs" tone="white" />}
                            Guardar cambios
                        </button>
                    </div>
                )}
            </form>

            {/* Observations */}
            <div className="card">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="text-lg font-semibold">Observaciones técnicas</h2>
                    {canEditExecutionContent && (
                        <button
                            onClick={() => {
                                setEditingObservationId(null);
                                setObservationForm(emptyObservationForm);
                            }}
                            className="btn btn-secondary w-full gap-2 sm:w-auto"
                        >
                            <CustomIcon name="plus" size="xs" tone="white" />
                            Agregar observación
                        </button>
                    )}
                </div>

                {editingObservationId && (
                    <form onSubmit={handleObservationSubmit} className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <h3 className="font-semibold mb-3">{editingObservationId ? 'Editar' : 'Nueva'} observación</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Título</label>
                                <input
                                    type="text"
                                    value={observationForm.title}
                                    onChange={(e) => setObservationForm(prev => ({ ...prev, title: e.target.value }))}
                                    className="input"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Severidad</label>
                                <select
                                    value={observationForm.severity}
                                    onChange={(e) => setObservationForm(prev => ({ ...prev, severity: e.target.value as ObservationSeverity }))}
                                    className="input"
                                >
                                    {observationSeverityOptions.map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium mb-2">Descripción</label>
                    <AutoResizeTextarea
                        value={observationForm.description}
                        onChange={(value) => setObservationForm(prev => ({ ...prev, description: value }))}
                        minHeightClass="!min-h-[220px] sm:!min-h-[260px]"
                    />
                            </div>
                        </div>
                        {canEditExecutionContent && (
                            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                                <button type="submit" className="btn btn-primary">
                                    {editingObservationId ? 'Actualizar' : 'Guardar'} observación
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditingObservationId(null);
                                        setObservationForm(emptyObservationForm);
                                    }}
                                    className="btn btn-secondary"
                                >
                                    Cancelar
                                </button>
                            </div>
                        )}
                    </form>
                )}

                <div className="space-y-3">
                    {areaObservations.map((obs: any) => (
                        <div key={obs.id} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <h4 className="font-medium">{obs.title}</h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">{obs.description}</p>
                                    <p className="mt-1 inline-flex items-center gap-2 text-xs text-gray-500">
                                        <CustomIcon name={observationSeverityIconMap[obs.severity] ?? 'warning'} size="xs" tone="mist" />
                                        {obs.severity} · {obs.type}
                                    </p>
                                </div>
                                {canEditExecutionContent && (
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            onClick={() => handleEditObservation(obs)}
                                            className="text-primary-600 hover:text-primary-700"
                                        >
                                            <span className="inline-flex items-center gap-2"><CustomIcon name="pencil" size="xs" tone="mist" />Editar</span>
                                        </button>
                                        <button
                                            onClick={() => handleDeleteObservation(obs.id)}
                                            className="text-red-600 hover:text-red-700"
                                        >
                                            <CustomIcon name="trash" size="xs" tone="rose" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {areaObservations.length === 0 && (
                        <p className="text-gray-500 text-center py-4">No hay observaciones para esta área</p>
                    )}
                </div>
            </div>

            {/* Photos */}
            <div className="card">
                <h2 className="text-lg font-semibold mb-4">Fotos del área</h2>
                <div className="mb-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Tipo de foto</label>
                            <select
                                value={areaPhotoForm.type}
                                onChange={(e) => setAreaPhotoForm(prev => ({ ...prev, type: e.target.value as ExecutionPhotoType }))}
                                className="input"
                            >
                                {areaPhotoTypeOptions.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Descripción (opcional)</label>
                            <input
                                type="text"
                                value={areaPhotoForm.caption}
                                onChange={(e) => setAreaPhotoForm(prev => ({ ...prev, caption: e.target.value }))}
                                className="input"
                                placeholder="Referencia o nota de la foto..."
                            />
                        </div>
                    </div>

                    {canEditExecutionContent && (
                        <div>
                            {/* Hidden file inputs */}
                            <input
                                ref={areaGalleryInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleAreaFileSelected}
                            />
                            <input
                                ref={areaCameraInputRef}
                                type="file"
                                accept="image/*"
                                capture="environment"
                                className="hidden"
                                onChange={handleAreaFileSelected}
                            />

                            {/* Action buttons */}
                            <div className="flex flex-col gap-2 sm:flex-row">
                                <button
                                    type="button"
                                    onClick={() => areaGalleryInputRef.current?.click()}
                                    className="btn btn-secondary flex-1 inline-flex items-center justify-center gap-2 py-2.5 text-xs font-semibold"
                                >
                                    <CustomIcon name="image" size="xs" tone="mist" />
                                    Subir foto
                                </button>
                                <button
                                    type="button"
                                    onClick={() => areaCameraInputRef.current?.click()}
                                    className="btn btn-primary flex-1 inline-flex items-center justify-center gap-2 py-2.5 text-xs font-semibold"
                                >
                                    <CustomIcon name="camera" size="xs" tone="white" />
                                    Tomar foto
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 md:grid-cols-3">
                    {areaPhotos.map((photo: any) => (
                        <div key={photo.id} className="relative group">
                            <img
                                src={photo.url || photo.previewUrl}
                                alt={photo.caption || 'Foto'}
                                loading="lazy"
                                className="h-36 w-full rounded-lg object-cover sm:h-32"
                            />
                            {photo.isMain && (
                                <span className="absolute left-1.5 top-1.5 z-10 rounded-full bg-amber-400 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-950 shadow">
                                    Principal
                                </span>
                            )}
                            {canEditExecutionContent && (
                                <div className="absolute right-1.5 top-1.5 z-10 flex gap-1.5">
                                    {!photo.isMain && (
                                        <button
                                            type="button"
                                            onClick={() => handleSetMainPhoto(photo.id, true)}
                                            className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-400/90 text-white opacity-0 group-hover:opacity-100 shadow-md transition-opacity"
                                            title="Marcar como foto principal"
                                        >
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                            </svg>
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => handleDeletePhoto(photo.id)}
                                        className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500/90 text-white opacity-0 group-hover:opacity-100 shadow-md transition-opacity"
                                        title="Eliminar foto"
                                    >
                                        <CustomIcon name="trash" size="xs" tone="white" />
                                    </button>
                                </div>
                            )}
                            {photo.caption && (
                                <p className="text-xs mt-1 text-gray-600 dark:text-gray-400">{photo.caption}</p>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Back button */}
            <div className="flex justify-start">
                <button
                    onClick={handleBack}
                    className="btn btn-secondary w-full gap-2 sm:w-auto"
                >
                    <CustomIcon name="arrow-left" size="xs" tone="mist" />
                    Volver a áreas
                </button>
            </div>
        </div>
    );
};
