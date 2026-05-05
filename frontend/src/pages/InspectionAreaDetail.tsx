import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft,
    Loader2,
    Save,
    Trash2,
    Plus,
    Camera,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from '../api/axios';
import { Loader } from '../components/Loader';
import ConnectionStatus from '../components/ConnectionStatus';
import { useOfflineSync } from '../hooks/useOfflineSync';
import inspectionService from '../services/inspection.service';
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
                name: areaForm.name.trim(),
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
            } else {
                toast.success('Área guardada offline');
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
            } else {
                toast.success(editingObservationId ? 'Observación actualizada offline' : 'Observación registrada offline');
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
        if (!id || !window.confirm('¿Eliminar esta observación técnica?')) return;

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
            } else {
                toast.success('Observación eliminada offline');
            }
        } catch (error) {
            toast.error(getApiErrorMessage(error, 'Error al eliminar observación'));
        }
    };

    const handlePhotoSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!id || !areaId) return;

        if (!areaPhotoForm.file) {
            toast.error('Debes seleccionar una imagen');
            return;
        }

        try {
            const clientId = createLocalId('local-photo');
            const previewUrl = await fileToDataUrl(areaPhotoForm.file);

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
                file: areaPhotoForm.file,
                fileName: areaPhotoForm.file.name,
                fileType: areaPhotoForm.file.type,
                previewUrl,
            });

            await refreshPendingCount();
            await loadExecution();
            setAreaPhotoForm(emptyAreaPhotoForm);

            if (isOnline) {
                await syncNow();
            } else {
                toast.success('Foto guardada offline');
            }
        } catch (error) {
            toast.error(getApiErrorMessage(error, 'Error al guardar foto'));
        }
    };

    const handleBack = () => {
        if (hasUnsavedChanges) {
            const confirm = window.confirm('Hay cambios sin guardar. ¿Deseas guardar antes de salir?');
            if (confirm) {
                // Trigger save
                document.getElementById('area-form')?.dispatchEvent(new Event('submit', { cancelable: true }));
                return;
            }
        }
        navigate(`/inspections/${id}/execute`);
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
                        onClick={() => navigate(`/inspections/${id}/execute`)}
                        className="btn btn-primary mt-4"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Volver a áreas
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header with back button */}
            <div className="flex items-center gap-4">
                <button
                    onClick={handleBack}
                    className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold">{selectedArea.name}</h1>
                    <p className="text-gray-600 dark:text-gray-400">{selectedArea.category}</p>
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
                            onChange={(e) => handleAreaFormChange('name', e.target.value)}
                            className="input"
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
                <div className="mt-4 flex gap-3">
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="btn btn-primary flex items-center gap-2"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Guardar cambios
                    </button>
                </div>
            </form>

            {/* Observations */}
            <div className="card">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Observaciones técnicas</h2>
                    <button
                        onClick={() => {
                            setEditingObservationId(null);
                            setObservationForm(emptyObservationForm);
                        }}
                        className="btn btn-secondary flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Agregar observación
                    </button>
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
                                <textarea
                                    value={observationForm.description}
                                    onChange={(e) => setObservationForm(prev => ({ ...prev, description: e.target.value }))}
                                    className="input min-h-[100px]"
                                    required
                                />
                            </div>
                        </div>
                        <div className="mt-3 flex gap-2">
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
                    </form>
                )}

                <div className="space-y-3">
                    {areaObservations.map((obs: any) => (
                        <div key={obs.id} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h4 className="font-medium">{obs.title}</h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">{obs.description}</p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {obs.severity} · {obs.type}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleEditObservation(obs)}
                                        className="text-primary-600 hover:text-primary-700"
                                    >
                                        Editar
                                    </button>
                                    <button
                                        onClick={() => handleDeleteObservation(obs.id)}
                                        className="text-red-600 hover:text-red-700"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
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
                <form onSubmit={handlePhotoSubmit} className="mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Tipo</label>
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
                            <label className="block text-sm font-medium mb-2">Foto</label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => setAreaPhotoForm(prev => ({ ...prev, file: e.target.files?.[0] || null }))}
                                className="input"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium mb-2">Descripción</label>
                            <input
                                type="text"
                                value={areaPhotoForm.caption}
                                onChange={(e) => setAreaPhotoForm(prev => ({ ...prev, caption: e.target.value }))}
                                className="input"
                                placeholder="Descripción opcional"
                            />
                        </div>
                    </div>
                    <button type="submit" className="btn btn-secondary mt-3 flex items-center gap-2">
                        <Camera className="w-4 h-4" />
                        Subir foto
                    </button>
                </form>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {areaPhotos.map((photo: any) => (
                        <div key={photo.id} className="relative">
                            <img
                                src={photo.url || photo.previewUrl}
                                alt={photo.caption || 'Foto'}
                                className="w-full h-32 object-cover rounded-lg"
                            />
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
                    className="btn btn-secondary flex items-center gap-2"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Volver a áreas
                </button>
            </div>
        </div>
    );
};
