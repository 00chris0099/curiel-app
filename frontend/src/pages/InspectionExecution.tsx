import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    AlertTriangle,
    ArrowLeft,
    Camera,
    CheckCircle2,
    ClipboardCheck,
    FileText,
    Home,
    ImagePlus,
    Loader2,
    MapPinned,
    PlusCircle,
    Ruler,
    Save,
    Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from '../api/axios';
import { Loader } from '../components/Loader';
import ConnectionStatus from '../components/ConnectionStatus';
import { useOfflineSync } from '../hooks/useOfflineSync';
import inspectionService from '../services/inspection.service';
import { useAuthStore } from '../store/authStore';
import type {
    CreateInspectionAreaDto,
    CreateInspectionObservationDto,
    ExecutionAreaStatus,
    ExecutionPhotoType,
    ExecutionReportStatus,
    InspectionArea,
    InspectionExecutionData,
    InspectionObservation,
    ObservationResolutionStatus,
    ObservationSeverity,
    ObservationType,
    UpdateInspectionAreaDto,
} from '../types';
import {
    getInspectionLocationLabel,
    getInspectionServiceLabel,
    parseDepartmentInspectionNotes,
} from '../utils/inspectionMetadata';
import {
    addSyncQueueItem,
    createLocalId,
    fileToDataUrl,
    getExecutionDraft,
    getInspectionQueueItems,
    getExecutionSnapshot,
    mergeExecutionWithQueue,
    saveExecutionDraft,
    saveExecutionSnapshot,
    type OfflineSyncItem,
} from '../utils/offlineDb';

const areaStatusOptions: ExecutionAreaStatus[] = ['pendiente', 'en_revision', 'observado', 'aprobado'];
const observationSeverityOptions: ObservationSeverity[] = ['leve', 'media', 'alta', 'critica'];
const observationTypeOptions: ObservationType[] = ['humedad', 'electrico', 'sanitario', 'acabados', 'carpinteria', 'estructura', 'seguridad', 'otro'];
const observationStatusOptions: ObservationResolutionStatus[] = ['pendiente', 'corregido', 'requiere_revision'];
const generalPhotoTypeOptions: ExecutionPhotoType[] = ['edificio', 'plano', 'general'];
const areaPhotoTypeOptions: ExecutionPhotoType[] = ['area', 'observacion'];
const defaultAreaDefinitions = [
    { name: 'Entrada', category: 'interior' },
    { name: 'Sala', category: 'social' },
    { name: 'Comedor', category: 'social' },
    { name: 'Kitchenette', category: 'cocina' },
    { name: 'Centro de lavado', category: 'servicio' },
    { name: 'Balcón', category: 'exterior' },
    { name: 'Estudio', category: 'privado' },
    { name: 'Dormitorio principal', category: 'privado' },
    { name: 'Dormitorio secundario', category: 'privado' },
    { name: 'Baño principal', category: 'baño' },
    { name: 'Baño 2', category: 'baño' },
    { name: 'Muros y vanos', category: 'estructura/acabados' },
];

type AreaFormState = {
    name: string;
    category: string;
    lengthM: string;
    widthM: string;
    ceilingHeightM: string;
    status: ExecutionAreaStatus;
    notes: string;
};

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

type SummaryFormState = {
    generalConclusion: string;
    finalRecommendations: string;
    reportStatus: ExecutionReportStatus;
};

type PhotoFormState = {
    type: ExecutionPhotoType;
    caption: string;
    file: File | null;
    observationId: string;
};

const emptyAreaForm: AreaFormState = {
    name: '',
    category: 'interior',
    lengthM: '',
    widthM: '',
    ceilingHeightM: '',
    status: 'pendiente',
    notes: '',
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

const emptySummaryForm: SummaryFormState = {
    generalConclusion: '',
    finalRecommendations: '',
    reportStatus: 'borrador',
};

const emptyGeneralPhotoForm: PhotoFormState = {
    type: 'edificio',
    caption: '',
    file: null,
    observationId: '',
};

const emptyAreaPhotoForm: PhotoFormState = {
    type: 'area',
    caption: '',
    file: null,
    observationId: '',
};

const areaStatusLabels: Record<ExecutionAreaStatus, string> = {
    pendiente: 'Pendiente',
    en_revision: 'En revisión',
    observado: 'Observado',
    aprobado: 'Aprobado',
};

const areaStatusBadges: Record<ExecutionAreaStatus, string> = {
    pendiente: 'badge-warning',
    en_revision: 'badge-info',
    observado: 'badge-danger',
    aprobado: 'badge-success',
};

const severityBadges: Record<ObservationSeverity, string> = {
    leve: 'badge-success',
    media: 'badge-info',
    alta: 'badge-warning',
    critica: 'badge-danger',
};

const reportStatusLabels: Record<ExecutionReportStatus, string> = {
    borrador: 'Borrador',
    listo_para_revision: 'Listo para revisión',
    aprobado: 'Aprobado',
};

const photoTypeLabels: Record<ExecutionPhotoType, string> = {
    edificio: 'Edificio',
    plano: 'Plano',
    area: 'Área',
    observacion: 'Observación',
    general: 'General',
};

const inspectionStatusLabels: Record<string, string> = {
    pendiente: 'Pendiente',
    en_proceso: 'En proceso',
    lista_revision: 'Lista para revisión',
    finalizada: 'Finalizada',
    cancelada: 'Cancelada',
    reprogramada: 'Reprogramada',
};

export const InspectionExecution = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [execution, setExecution] = useState<InspectionExecutionData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [busyAction, setBusyAction] = useState<string | null>(null);
    const [isDownloadingReport, setIsDownloadingReport] = useState(false);
    const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
    const [showAreaCreator, setShowAreaCreator] = useState(false);
    const [editingObservationId, setEditingObservationId] = useState<string | null>(null);
    const [manualAreaForm, setManualAreaForm] = useState<AreaFormState>(emptyAreaForm);
    const [areaForm, setAreaForm] = useState<AreaFormState>(emptyAreaForm);
    const [observationForm, setObservationForm] = useState<ObservationFormState>(emptyObservationForm);
    const [summaryForm, setSummaryForm] = useState<SummaryFormState>(emptySummaryForm);
    const [generalPhotoForm, setGeneralPhotoForm] = useState<PhotoFormState>(emptyGeneralPhotoForm);
    const [areaPhotoForm, setAreaPhotoForm] = useState<PhotoFormState>(emptyAreaPhotoForm);
    const [queueItems, setQueueItems] = useState<OfflineSyncItem[]>([]);

    const loadExecution = useCallback(async (preferredAreaId?: string | null) => {
        if (!id) {
            navigate('/inspections', { replace: true });
            return;
        }

        setIsLoading(true);
        setErrorMessage(null);

        try {
            let remoteExecution: InspectionExecutionData | null = null;

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
            setQueueItems(pendingQueueItems);
            const mergedExecution = mergeExecutionWithQueue(remoteExecution, pendingQueueItems);

            setExecution(mergedExecution);

            const safeAreas = Array.isArray(mergedExecution?.areas) ? mergedExecution.areas : [];

            const nextSelectedAreaId = preferredAreaId
                && safeAreas.some((area) => area.id === preferredAreaId)
                ? preferredAreaId
                : safeAreas[0]?.id || null;

            setSelectedAreaId(nextSelectedAreaId);
        } catch (error: unknown) {
            const message = getApiErrorMessage(error, 'No se pudo cargar la ejecución de la inspección');
            setExecution(null);
            setErrorMessage(message);
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    }, [id]);

    const {
        isOnline,
        pendingCount,
        isSyncing,
        syncNow,
        refreshPendingCount,
    } = useOfflineSync(id, async () => {
        await loadExecution(selectedAreaId);
    });

    useEffect(() => {
        loadExecution();
    }, [loadExecution]);

    const areas = useMemo(() => Array.isArray(execution?.areas) ? execution.areas : [], [execution?.areas]);
    const observations = useMemo(() => Array.isArray(execution?.observations) ? execution.observations : [], [execution?.observations]);
    const photos = useMemo(() => Array.isArray(execution?.photos) ? execution.photos : [], [execution?.photos]);
    const summary = execution?.summary ?? null;
    const inspection = execution?.inspection || null;
    const stats = execution?.stats ?? {
        totalAreaM2: areas.reduce((sum, area) => sum + Number(area?.calculatedAreaM2 || 0), 0),
        areasRegistered: areas.length,
        totalObservations: observations.length,
        criticalObservations: observations.filter((observation) => observation?.severity === 'critica').length,
        highObservations: observations.filter((observation) => observation?.severity === 'alta').length,
        mediumObservations: observations.filter((observation) => observation?.severity === 'media').length,
        lightObservations: observations.filter((observation) => observation?.severity === 'leve').length,
        photosCount: photos.length,
        reportStatus: summary?.reportStatus || 'borrador',
    };

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

    const selectedArea = useMemo(() => areas.find((area) => area.id === selectedAreaId) || null, [areas, selectedAreaId]);

    useEffect(() => {
        if (!selectedArea) {
            setAreaForm(emptyAreaForm);
            setObservationForm(emptyObservationForm);
            setAreaPhotoForm(emptyAreaPhotoForm);
            setEditingObservationId(null);
            return;
        }

        setAreaForm({
            name: selectedArea.name,
            category: selectedArea.category,
            lengthM: selectedArea.lengthM?.toString() || '',
            widthM: selectedArea.widthM?.toString() || '',
            ceilingHeightM: selectedArea.ceilingHeightM?.toString() || '',
            status: selectedArea.status,
            notes: selectedArea.notes || '',
        });

        setObservationForm(emptyObservationForm);
        setAreaPhotoForm((current) => ({
            ...emptyAreaPhotoForm,
            type: current.type,
        }));
        setEditingObservationId(null);
    }, [selectedArea]);

    useEffect(() => {
        if (!id) {
            return;
        }

        void (async () => {
            const draft = await getExecutionDraft(id);
            if (!draft) {
                return;
            }

            if (draft.areaForm) {
                setAreaForm((current) => ({ ...current, ...draft.areaForm as AreaFormState }));
            }

            if (draft.manualAreaForm) {
                setManualAreaForm((current) => ({ ...current, ...draft.manualAreaForm as AreaFormState }));
            }

            if (draft.observationForm) {
                setObservationForm((current) => ({ ...current, ...draft.observationForm as ObservationFormState }));
            }

            if (draft.summaryForm) {
                setSummaryForm((current) => ({ ...current, ...draft.summaryForm as SummaryFormState }));
            }

            if (draft.generalPhotoForm) {
                setGeneralPhotoForm((current) => ({ ...current, ...draft.generalPhotoForm as PhotoFormState }));
            }

            if (draft.areaPhotoForm) {
                setAreaPhotoForm((current) => ({ ...current, ...draft.areaPhotoForm as PhotoFormState }));
            }

            if (draft.selectedAreaId) {
                setSelectedAreaId(draft.selectedAreaId);
            }
        })();
    }, [id, selectedArea?.id]);

    useEffect(() => {
        if (!id) {
            return;
        }

        void saveExecutionDraft({
            inspectionId: id,
            areaForm,
            manualAreaForm,
            observationForm,
            summaryForm,
            generalPhotoForm: {
                ...generalPhotoForm,
                file: null,
            },
            areaPhotoForm: {
                ...areaPhotoForm,
                file: null,
            },
            selectedAreaId,
            updatedAt: new Date().toISOString(),
        })
    }, [id, areaForm, manualAreaForm, observationForm, summaryForm, generalPhotoForm.type, generalPhotoForm.caption, areaPhotoForm.type, areaPhotoForm.caption, areaPhotoForm.observationId, selectedAreaId]);

    const selectedAreaObservations = observations.filter((observation) => observation.areaId === selectedAreaId);
    const selectedAreaPhotos = photos.filter((photo) => photo.areaId === selectedAreaId);
    const generalPhotos = photos.filter((photo) => ['edificio', 'plano', 'general'].includes(photo.type));
    const metadata = inspection ? parseDepartmentInspectionNotes(inspection.notes).metadata : null;
    const canApproveReport = user?.role === 'admin' || user?.role === 'arquitecto';
    const getEntitySyncState = useCallback((entityType: OfflineSyncItem['entityType'], entityId: string) => {
        const related = queueItems.find((item) => item.entityType === entityType && (
            ('clientId' in item && item.clientId === entityId)
            || ('targetId' in item && item.targetId === entityId)
        ));

        return related?.syncStatus || 'synced';
    }, [queueItems]);

    const areaCalculated = useMemo(() => {
        const length = Number(areaForm.lengthM);
        const width = Number(areaForm.widthM);

        if (!areaForm.lengthM || !areaForm.widthM || Number.isNaN(length) || Number.isNaN(width)) {
            return 0;
        }

        return Number((length * width).toFixed(2));
    }, [areaForm.lengthM, areaForm.widthM]);

    const areaCreatorCalculated = useMemo(() => {
        const length = Number(manualAreaForm.lengthM);
        const width = Number(manualAreaForm.widthM);

        if (!manualAreaForm.lengthM || !manualAreaForm.widthM || Number.isNaN(length) || Number.isNaN(width)) {
            return 0;
        }

        return Number((length * width).toFixed(2));
    }, [manualAreaForm.lengthM, manualAreaForm.widthM]);

    const districtLabel = metadata?.district || inspection?.state || 'Lima';
    const locationLabel = inspection ? getInspectionLocationLabel(inspection) : 'Sin ubicación';
    const serviceLabel = inspection ? getInspectionServiceLabel(inspection) : 'Inspección';

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
        preferredAreaId?: string | null,
        successMessage = 'Guardado offline'
    ) => {
        await addSyncQueueItem(item);
        await refreshPendingCount();
        await loadExecution(preferredAreaId ?? selectedAreaId);

        if (isOnline) {
            await syncNow();
            await loadExecution(preferredAreaId ?? selectedAreaId);
        } else {
            toast.success(successMessage);
        }
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
                await loadExecution(selectedAreaId);
                toast.success(missingAreas.length > 0 ? 'Áreas base guardadas offline' : 'Las áreas base ya estaban registradas');
                return;
            }

            const result = await inspectionService.createDefaultAreas(id);
            toast.success(result.createdCount > 0 ? 'Áreas base creadas correctamente' : 'Las áreas base ya existían');
            await loadExecution(selectedAreaId);
        });
    };

    const handleCreateArea = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!id) return;

        if (!manualAreaForm.name.trim()) {
            toast.error('Debes indicar el nombre del área');
            return;
        }

        await withBusyAction('create-area', async () => {
            const clientId = createLocalId('local-area');
            const payload: CreateInspectionAreaDto = {
                name: manualAreaForm.name.trim(),
                category: manualAreaForm.category.trim() || 'interior',
                lengthM: manualAreaForm.lengthM ? Number(manualAreaForm.lengthM) : null,
                widthM: manualAreaForm.widthM ? Number(manualAreaForm.widthM) : null,
                ceilingHeightM: manualAreaForm.ceilingHeightM ? Number(manualAreaForm.ceilingHeightM) : null,
                status: manualAreaForm.status,
                notes: manualAreaForm.notes.trim() || undefined,
            };

            setManualAreaForm(emptyAreaForm);
            setShowAreaCreator(false);

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

    const handleSaveSelectedArea = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!id || !selectedArea) return;

        await withBusyAction('save-area', async () => {
            const payload: UpdateInspectionAreaDto = {
                name: areaForm.name.trim(),
                category: areaForm.category.trim(),
                lengthM: areaForm.lengthM ? Number(areaForm.lengthM) : null,
                widthM: areaForm.widthM ? Number(areaForm.widthM) : null,
                ceilingHeightM: areaForm.ceilingHeightM ? Number(areaForm.ceilingHeightM) : null,
                status: areaForm.status,
                notes: areaForm.notes.trim() || undefined,
            };

            await queueMutation({
                inspectionId: id,
                entityType: 'area',
                action: 'update',
                targetId: selectedArea.id,
                data: payload,
            }, selectedArea.id, 'Área guardada offline');

            if (isOnline) {
                toast.success('Área actualizada');
            }
        });
    };

    const handleDeleteArea = async (area: InspectionArea) => {
        if (!id) return;
        if (!window.confirm(`¿Eliminar el área ${area.name}?`)) return;

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

    const handleObservationSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!id || !selectedArea) return;

        if (!observationForm.title.trim() || !observationForm.description.trim()) {
            toast.error('Debes completar el título y la descripción técnica');
            return;
        }

        await withBusyAction('save-observation', async () => {
            const clientId = createLocalId('local-observation');
            const payload: CreateInspectionObservationDto = {
                areaId: selectedArea.id,
                title: observationForm.title.trim(),
                description: observationForm.description.trim(),
                severity: observationForm.severity,
                type: observationForm.type,
                recommendation: observationForm.recommendation.trim() || undefined,
                metricValue: observationForm.metricValue ? Number(observationForm.metricValue) : null,
                metricUnit: observationForm.metricUnit.trim() || undefined,
                status: observationForm.status,
            };

            if (editingObservationId) {
                await queueMutation({
                    inspectionId: id,
                    entityType: 'observation',
                    action: 'update',
                    targetId: editingObservationId,
                    data: payload,
                }, selectedArea.id, 'Observación guardada offline');
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
                }, selectedArea.id, 'Observación guardada offline');
                if (isOnline) {
                    toast.success('Observación registrada');
                }
            }

            setObservationForm(emptyObservationForm);
            setEditingObservationId(null);
        });
    };

    const handleEditObservation = (observation: InspectionObservation) => {
        setEditingObservationId(observation.id);
        setObservationForm({
            title: observation.title,
            description: observation.description,
            severity: observation.severity,
            type: observation.type,
            recommendation: observation.recommendation || '',
            metricValue: observation.metricValue?.toString() || '',
            metricUnit: observation.metricUnit || '',
            status: observation.status,
        });
    };

    const handleDeleteObservation = async (observationId: string) => {
        if (!id || !selectedArea) return;
        if (!window.confirm('¿Eliminar esta observación técnica?')) return;

        await withBusyAction(`delete-observation-${observationId}`, async () => {
            await queueMutation({
                inspectionId: id,
                entityType: 'observation',
                action: 'delete',
                targetId: observationId,
            }, selectedArea.id, 'Observación eliminada offline');

            if (isOnline) {
                toast.success('Observación eliminada');
            }
            setObservationForm(emptyObservationForm);
            setEditingObservationId(null);
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
            }, selectedAreaId, 'Resumen guardado offline');

            if (isOnline) {
                toast.success('Resumen técnico actualizado');
            }
        });
    };

    const handlePhotoSubmit = async (
        event: FormEvent<HTMLFormElement>,
        form: PhotoFormState,
        source: 'general' | 'area'
    ) => {
        event.preventDefault();
        if (!id) return;

        if (!form.file) {
            toast.error('Debes seleccionar una imagen');
            return;
        }

        if (source === 'area' && !selectedArea) {
            toast.error('Selecciona un área para asociar la foto');
            return;
        }

        await withBusyAction(`photo-${source}`, async () => {
            const previewUrl = await fileToDataUrl(form.file as Blob);
            await queueMutation({
                inspectionId: id,
                entityType: 'photo',
                action: 'create',
                clientId: createLocalId('local-photo'),
                data: {
                    type: form.type,
                    caption: form.caption.trim() || undefined,
                    areaId: source === 'area' && selectedArea ? selectedArea.id : undefined,
                    observationId: form.type === 'observacion' ? form.observationId || undefined : undefined,
                },
                file: form.file,
                fileName: form.file?.name,
                fileType: form.file?.type,
                previewUrl,
            }, selectedAreaId, 'Foto guardada offline');

            if (isOnline) {
                toast.success('Foto registrada');
            }

            if (source === 'general') {
                setGeneralPhotoForm(emptyGeneralPhotoForm);
            } else {
                setAreaPhotoForm(emptyAreaPhotoForm);
            }
        });
    };

    const handleCompleteInspection = async () => {
        if (!id) return;
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
            }, selectedAreaId, 'Resumen guardado offline');

            await queueMutation({
                inspectionId: id,
                entityType: 'status',
                action: 'upsert',
                data: {
                    status: 'lista_revision',
                },
            }, selectedAreaId, 'Cambio de estado guardado offline');

            if (isOnline) {
                toast.success('Inspección enviada a revisión');
                await loadExecution(selectedAreaId);
            }
        });
    };

    const handleDownloadReport = async () => {
        if (!id || !inspection) return;

        setIsDownloadingReport(true);
        try {
            const blob = await inspectionService.downloadReport(id);
            const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;
            link.download = `informe-inspeccion-${inspection.projectName}.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            toast.success('Informe generado');
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'No se pudo generar el informe PDF'));
        } finally {
            setIsDownloadingReport(false);
        }
    };

    if (isLoading) {
        return <Loader fullScreen />;
    }

    if (errorMessage) {
        return (
            <div className="mx-auto max-w-3xl pb-10 pt-6">
                <div className="card space-y-4 text-center">
                    <AlertTriangle className="mx-auto h-10 w-10 text-red-500" />
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
                    <Home className="mx-auto h-10 w-10 text-primary-600" />
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

    return (
        <div className="space-y-6 pb-10">
            <ConnectionStatus
                pendingCount={pendingCount}
                onSyncNow={syncNow}
                isSyncing={isSyncing}
            />

            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-4">
                    <button
                        type="button"
                        onClick={() => navigate(`/inspections/${inspection.id}`)}
                        className="rounded-xl border border-gray-200 p-2 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
                    >
                        <ArrowLeft className="h-6 w-6" />
                    </button>

                    <div className="max-w-3xl">
                        <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary-600 dark:text-primary-400">
                            Módulo del inspector
                        </p>
                        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">{inspection.projectName}</h1>
                        <p className="mt-2 text-gray-600 dark:text-gray-400">
                            {serviceLabel} · {inspection.clientName} · {districtLabel}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-3 text-sm text-gray-600 dark:text-gray-300">
                            <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 shadow-sm ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
                                <MapPinned className="h-4 w-4 text-primary-600" />
                                {locationLabel}
                            </span>
                            <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 shadow-sm ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
                                <ClipboardCheck className="h-4 w-4 text-primary-600" />
                                {new Date(inspection.scheduledDate).toLocaleString('es-PE')}
                            </span>
                            <span className="badge badge-info">
                                Estado de visita: {inspectionStatusLabels[inspection.status] || inspection.status}
                            </span>
                        </div>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={handleDownloadReport}
                    disabled={isDownloadingReport}
                    className="btn btn-secondary flex w-full items-center justify-center gap-2 sm:w-auto"
                >
                    <FileText className="h-5 w-5" />
                    {isDownloadingReport ? 'Generando informe...' : 'Generar informe'}
                </button>

                <button
                    type="button"
                    onClick={handleCompleteInspection}
                    disabled={busyAction === 'complete-inspection'}
                    className="btn btn-primary flex w-full items-center justify-center gap-2 sm:w-auto"
                >
                    {busyAction === 'complete-inspection' ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                    Enviar a revisión
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
                <StatCard icon={Ruler} label="Área total" value={`${stats.totalAreaM2.toFixed(2)} m²`} accent="text-blue-600" />
                <StatCard icon={Home} label="Áreas registradas" value={stats.areasRegistered.toString()} accent="text-emerald-600" />
                <StatCard icon={AlertTriangle} label="Observaciones" value={stats.totalObservations.toString()} accent="text-amber-600" />
                <StatCard icon={AlertTriangle} label="Críticas" value={stats.criticalObservations.toString()} accent="text-red-600" />
                <StatCard icon={Camera} label="Fotos subidas" value={stats.photosCount.toString()} accent="text-violet-600" />
                <StatCard icon={FileText} label="Informe" value={reportStatusLabels[stats.reportStatus] || 'Borrador'} accent="text-primary-600" />
            </div>

            <div className="card space-y-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-lg font-semibold">Fotos generales</h2>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            Registra evidencia del edificio, plano del departamento y tomas generales de la inspección.
                        </p>
                    </div>
                </div>

                <form onSubmit={(event) => handlePhotoSubmit(event, generalPhotoForm, 'general')} className="grid grid-cols-1 gap-4 lg:grid-cols-[0.8fr_1fr_1fr_auto]">
                    <select
                        className="input"
                        value={generalPhotoForm.type}
                        onChange={(event) => setGeneralPhotoForm((current) => ({ ...current, type: event.target.value as ExecutionPhotoType }))}
                    >
                        {generalPhotoTypeOptions.map((option) => (
                            <option key={option} value={option}>{photoTypeLabels[option]}</option>
                        ))}
                    </select>
                    <input
                        className="input"
                        placeholder="Descripción o referencia visual"
                        value={generalPhotoForm.caption}
                        onChange={(event) => setGeneralPhotoForm((current) => ({ ...current, caption: event.target.value }))}
                    />
                    <input
                        type="file"
                        accept="image/*"
                        className="input px-3 py-2"
                        onChange={(event) => setGeneralPhotoForm((current) => ({ ...current, file: event.target.files?.[0] || null }))}
                    />
                    <button type="submit" className="btn btn-secondary flex items-center justify-center gap-2" disabled={busyAction === 'photo-general'}>
                        {busyAction === 'photo-general' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                        Agregar foto
                    </button>
                </form>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {generalPhotos.length === 0 ? (
                        <EmptyPanel message="Aún no hay fotos generales registradas." />
                    ) : generalPhotos.map((photo) => (
                        <PhotoCard key={photo.id} photo={photo} syncStatus={getEntitySyncState('photo', photo.id)} />
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
                <aside className="space-y-4">
                    <div className="card space-y-4 xl:sticky xl:top-24">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between xl:flex-col xl:items-stretch">
                            <div>
                                <h2 className="text-lg font-semibold">Áreas del departamento</h2>
                                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                    Selecciona un ambiente para cargar medidas, hallazgos y fotos.
                                </p>
                            </div>
                            <div className="flex flex-col gap-2">
                                <button type="button" className="btn btn-secondary flex items-center justify-center gap-2" onClick={handleCreateDefaultAreas} disabled={busyAction === 'default-areas'}>
                                    {busyAction === 'default-areas' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Home className="h-4 w-4" />}
                                    Crear áreas por defecto
                                </button>
                                <button type="button" className="btn btn-primary flex items-center justify-center gap-2" onClick={() => setShowAreaCreator((current) => !current)}>
                                    <PlusCircle className="h-4 w-4" />
                                    {showAreaCreator ? 'Cerrar formulario' : 'Agregar área'}
                                </button>
                            </div>
                        </div>

                        {showAreaCreator && (
                            <form onSubmit={handleCreateArea} className="space-y-3 rounded-2xl border border-dashed border-gray-300 p-4 dark:border-gray-600">
                                <input className="input" placeholder="Nombre del área" value={manualAreaForm.name} onChange={(event) => setManualAreaForm((current) => ({ ...current, name: event.target.value }))} />
                                <input className="input" placeholder="Categoría" value={manualAreaForm.category} onChange={(event) => setManualAreaForm((current) => ({ ...current, category: event.target.value }))} />
                                <div className="grid grid-cols-2 gap-3">
                                    <input className="input" type="number" min="0" step="0.01" placeholder="Largo m" value={manualAreaForm.lengthM} onChange={(event) => setManualAreaForm((current) => ({ ...current, lengthM: event.target.value }))} />
                                    <input className="input" type="number" min="0" step="0.01" placeholder="Ancho m" value={manualAreaForm.widthM} onChange={(event) => setManualAreaForm((current) => ({ ...current, widthM: event.target.value }))} />
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Área estimada: {areaCreatorCalculated.toFixed(2)} m²</p>
                                <button type="submit" className="btn btn-primary w-full" disabled={busyAction === 'create-area'}>
                                    {busyAction === 'create-area' ? 'Creando...' : 'Guardar área'}
                                </button>
                            </form>
                        )}

                        <div className="space-y-3">
                            {areas.length === 0 ? (
                                <EmptyPanel message="Todavía no hay áreas registradas para esta inspección." compact />
                            ) : areas.map((area) => (
                                <button
                                    key={area.id}
                                    type="button"
                                    onClick={() => setSelectedAreaId(area.id)}
                                    className={`w-full rounded-2xl border p-4 text-left transition-colors ${selectedAreaId === area.id
                                        ? 'border-primary-400 bg-primary-50 dark:border-primary-700 dark:bg-primary-900/20'
                                        : 'border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800/80'
                                        }`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-semibold text-gray-900 dark:text-white">{area.name}</p>
                                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{area.category}</p>
                                        </div>
                                        <span className={`badge ${areaStatusBadges[area.status]}`}>{areaStatusLabels[area.status]}</span>
                                    </div>
                                    <div className="mt-3 flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
                                        <span>{(area.calculatedAreaM2 || 0).toFixed(2)} m²</span>
                                        <span>{observations.filter((item) => item.areaId === area.id).length} obs.</span>
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

                <div className="space-y-6">
                    {selectedArea ? (
                        <>
                            <div className="card space-y-5">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <h2 className="text-lg font-semibold">Detalle del área seleccionada</h2>
                                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                            Ajusta medidas, estado y notas técnicas del ambiente.
                                        </p>
                                    </div>
                                    <button type="button" className="btn btn-danger flex items-center justify-center gap-2 sm:w-auto" onClick={() => handleDeleteArea(selectedArea)} disabled={busyAction === `delete-area-${selectedArea.id}`}>
                                        <Trash2 className="h-4 w-4" />
                                        Eliminar área
                                    </button>
                                </div>

                                <form onSubmit={handleSaveSelectedArea} className="space-y-4">
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                                        <InputField label="Nombre del área" value={areaForm.name} onChange={(value) => setAreaForm((current) => ({ ...current, name: value }))} />
                                        <InputField label="Categoría" value={areaForm.category} onChange={(value) => setAreaForm((current) => ({ ...current, category: value }))} />
                                        <div>
                                            <label className="mb-2 block text-sm font-medium">Estado</label>
                                            <select className="input" value={areaForm.status} onChange={(event) => setAreaForm((current) => ({ ...current, status: event.target.value as ExecutionAreaStatus }))}>
                                                {areaStatusOptions.map((option) => <option key={option} value={option}>{areaStatusLabels[option]}</option>)}
                                            </select>
                                        </div>
                                        <InputField label="Largo (m)" type="number" step="0.01" min="0" value={areaForm.lengthM} onChange={(value) => setAreaForm((current) => ({ ...current, lengthM: value }))} />
                                        <InputField label="Ancho (m)" type="number" step="0.01" min="0" value={areaForm.widthM} onChange={(value) => setAreaForm((current) => ({ ...current, widthM: value }))} />
                                        <InputField label="Altura libre (m)" type="number" step="0.01" min="0" value={areaForm.ceilingHeightM} onChange={(value) => setAreaForm((current) => ({ ...current, ceilingHeightM: value }))} />
                                    </div>

                                    <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:bg-gray-900/50 dark:text-gray-200">
                                        Área calculada automáticamente: <span className="font-semibold">{areaCalculated.toFixed(2)} m²</span>
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-medium">Notas del área</label>
                                        <textarea className="input min-h-[120px]" value={areaForm.notes} onChange={(event) => setAreaForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Estado de pisos, cielorraso, mobiliario fijo, ingreso, etc." />
                                    </div>

                                    <button type="submit" className="btn btn-primary flex items-center gap-2" disabled={busyAction === 'save-area'}>
                                        {busyAction === 'save-area' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                        Guardar área
                                    </button>
                                </form>
                            </div>

                            <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                                <div className="card space-y-5">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <h2 className="text-lg font-semibold">Observaciones por área</h2>
                                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                                Registra hallazgos, severidad, valor métrico y recomendación técnica.
                                            </p>
                                        </div>
                                        {editingObservationId && (
                                            <button type="button" className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400" onClick={() => {
                                                setEditingObservationId(null);
                                                setObservationForm(emptyObservationForm);
                                            }}>
                                                Cancelar edición
                                            </button>
                                        )}
                                    </div>

                                    <form onSubmit={handleObservationSubmit} className="space-y-4">
                                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                            <InputField label="Título" value={observationForm.title} onChange={(value) => setObservationForm((current) => ({ ...current, title: value }))} />
                                            <div>
                                                <label className="mb-2 block text-sm font-medium">Severidad</label>
                                                <select className="input" value={observationForm.severity} onChange={(event) => setObservationForm((current) => ({ ...current, severity: event.target.value as ObservationSeverity }))}>
                                                    {observationSeverityOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="mb-2 block text-sm font-medium">Tipo</label>
                                                <select className="input" value={observationForm.type} onChange={(event) => setObservationForm((current) => ({ ...current, type: event.target.value as ObservationType }))}>
                                                    {observationTypeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="mb-2 block text-sm font-medium">Estado</label>
                                                <select className="input" value={observationForm.status} onChange={(event) => setObservationForm((current) => ({ ...current, status: event.target.value as ObservationResolutionStatus }))}>
                                                    {observationStatusOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                                                </select>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-sm font-medium">Descripción técnica</label>
                                            <textarea className="input min-h-[110px]" value={observationForm.description} onChange={(event) => setObservationForm((current) => ({ ...current, description: event.target.value }))} placeholder="Describe el hallazgo, su ubicación, el alcance del daño o la desviación detectada." />
                                        </div>

                                        <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_180px_160px]">
                                            <div>
                                                <label className="mb-2 block text-sm font-medium">Recomendación</label>
                                                <input className="input" value={observationForm.recommendation} onChange={(event) => setObservationForm((current) => ({ ...current, recommendation: event.target.value }))} placeholder="Acción correctiva sugerida" />
                                            </div>
                                            <InputField label="Valor métrico" type="number" step="0.01" min="0" value={observationForm.metricValue} onChange={(value) => setObservationForm((current) => ({ ...current, metricValue: value }))} />
                                            <InputField label="Unidad" value={observationForm.metricUnit} onChange={(value) => setObservationForm((current) => ({ ...current, metricUnit: value }))} placeholder="m², %, und" />
                                        </div>

                                        <button type="submit" className="btn btn-primary flex items-center gap-2" disabled={busyAction === 'save-observation'}>
                                            {busyAction === 'save-observation' ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                                            {editingObservationId ? 'Guardar observación' : 'Agregar observación'}
                                        </button>
                                    </form>

                                    <div className="space-y-3">
                                        {selectedAreaObservations.length === 0 ? (
                                            <EmptyPanel message="No hay observaciones registradas para esta área." compact />
                                        ) : selectedAreaObservations.map((observation) => (
                                            <article key={observation.id} className="rounded-2xl border border-gray-200 p-4 dark:border-gray-700">
                                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                    <div>
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <h3 className="font-semibold text-gray-900 dark:text-white">{observation.title}</h3>
                                                            <span className={`badge ${severityBadges[observation.severity]}`}>{observation.severity}</span>
                                                        </div>
                                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                                    {observation.type} · {observation.status}
                                                </p>
                                                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                                    {getEntitySyncState('observation', observation.id) === 'pending' && 'Pendiente de sincronizar'}
                                                    {getEntitySyncState('observation', observation.id) === 'failed' && 'Error al sincronizar'}
                                                    {getEntitySyncState('observation', observation.id) === 'synced' && 'Guardado'}
                                                </p>
                                            </div>
                                                    <div className="flex items-center gap-2">
                                                        <button type="button" className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600" onClick={() => handleEditObservation(observation)}>
                                                            Editar
                                                        </button>
                                                        <button type="button" className="rounded-lg border border-red-300 px-3 py-2 text-sm text-red-600 dark:border-red-800 dark:text-red-300" onClick={() => handleDeleteObservation(observation.id)}>
                                                            Eliminar
                                                        </button>
                                                    </div>
                                                </div>
                                                <p className="mt-3 text-sm text-gray-700 dark:text-gray-200">{observation.description}</p>
                                                {observation.recommendation && (
                                                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                                                        <span className="font-medium text-gray-900 dark:text-white">Recomendación:</span> {observation.recommendation}
                                                    </p>
                                                )}
                                                {(observation.metricValue !== null && observation.metricValue !== undefined) && (
                                                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                                                        <span className="font-medium text-gray-900 dark:text-white">Métrica:</span> {observation.metricValue} {observation.metricUnit || ''}
                                                    </p>
                                                )}
                                            </article>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="card space-y-5">
                                        <div>
                                            <h2 className="text-lg font-semibold">Fotos del área</h2>
                                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                                Agrega evidencia visual del ambiente o de una observación puntual.
                                            </p>
                                        </div>

                                        <form onSubmit={(event) => handlePhotoSubmit(event, areaPhotoForm, 'area')} className="space-y-4">
                                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                <div>
                                                    <label className="mb-2 block text-sm font-medium">Tipo de foto</label>
                                                    <select className="input" value={areaPhotoForm.type} onChange={(event) => setAreaPhotoForm((current) => ({
                                                        ...current,
                                                        type: event.target.value as ExecutionPhotoType,
                                                        observationId: event.target.value === 'observacion' ? current.observationId : '',
                                                    }))}>
                                                        {areaPhotoTypeOptions.map((option) => <option key={option} value={option}>{photoTypeLabels[option]}</option>)}
                                                    </select>
                                                </div>

                                                {areaPhotoForm.type === 'observacion' && (
                                                    <div>
                                                        <label className="mb-2 block text-sm font-medium">Observación asociada</label>
                                                        <select className="input" value={areaPhotoForm.observationId} onChange={(event) => setAreaPhotoForm((current) => ({ ...current, observationId: event.target.value }))}>
                                                            <option value="">Selecciona observación</option>
                                                            {selectedAreaObservations.map((observation) => (
                                                                <option key={observation.id} value={observation.id}>{observation.title}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                )}
                                            </div>

                                            <input className="input" placeholder="Comentario o referencia" value={areaPhotoForm.caption} onChange={(event) => setAreaPhotoForm((current) => ({ ...current, caption: event.target.value }))} />
                                            <input type="file" accept="image/*" className="input px-3 py-2" onChange={(event) => setAreaPhotoForm((current) => ({ ...current, file: event.target.files?.[0] || null }))} />

                                            <button type="submit" className="btn btn-secondary flex items-center gap-2" disabled={busyAction === 'photo-area'}>
                                                {busyAction === 'photo-area' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                                                Agregar foto del área
                                            </button>
                                        </form>

                                        <div className="space-y-3">
                                            {selectedAreaPhotos.length === 0 ? (
                                                <EmptyPanel message="No hay fotos asociadas a esta área." compact />
                                            ) : selectedAreaPhotos.map((photo) => (
                                                <PhotoCard key={photo.id} photo={photo} syncStatus={getEntitySyncState('photo', photo.id)} />
                                            ))}
                                        </div>
                                    </div>

                                    <form onSubmit={handleSaveSummary} className="card space-y-5">
                                        <div>
                                            <h2 className="text-lg font-semibold">Recomendaciones finales</h2>
                                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                                Redacta la conclusión general de la visita y la salida técnica para revisión.
                                            </p>
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-sm font-medium">Conclusión general</label>
                                            <textarea className="input min-h-[130px]" value={summaryForm.generalConclusion} onChange={(event) => setSummaryForm((current) => ({ ...current, generalConclusion: event.target.value }))} placeholder="Resume el estado global del departamento, el nivel de riesgo y el criterio técnico principal." />
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-sm font-medium">Recomendaciones finales</label>
                                            <textarea className="input min-h-[130px]" value={summaryForm.finalRecommendations} onChange={(event) => setSummaryForm((current) => ({ ...current, finalRecommendations: event.target.value }))} placeholder="Indica acciones correctivas, prioridad de intervención y sugerencias para revisión posterior." />
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-sm font-medium">Estado del informe</label>
                                            <select className="input" value={summaryForm.reportStatus} onChange={(event) => setSummaryForm((current) => ({ ...current, reportStatus: event.target.value as ExecutionReportStatus }))}>
                                                <option value="borrador">Borrador</option>
                                                <option value="listo_para_revision">Listo para revisión</option>
                                                {canApproveReport && <option value="aprobado">Aprobado</option>}
                                            </select>
                                        </div>

                                        <button type="submit" className="btn btn-primary flex items-center gap-2" disabled={busyAction === 'save-summary'}>
                                            {busyAction === 'save-summary' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                            Guardar resumen
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="card">
                            <EmptyPanel message={areas.length === 0
                                ? 'Crea áreas por defecto o agrega un ambiente manual para comenzar la ejecución técnica.'
                                : 'Selecciona un área para registrar medidas, observaciones y fotos.'}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ icon: Icon, label, value, accent }: { icon: typeof Ruler; label: string; value: string; accent: string }) => (
    <div className="card">
        <div className="flex items-center justify-between gap-4">
            <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
                <p className={`mt-2 text-2xl font-bold ${accent}`}>{value}</p>
            </div>
            <div className="rounded-2xl bg-gray-100 p-3 dark:bg-gray-700/60">
                <Icon className={`h-6 w-6 ${accent}`} />
            </div>
        </div>
    </div>
);

const PhotoCard = ({ photo, syncStatus }: { photo: InspectionExecutionData['photos'][number]; syncStatus?: 'pending' | 'failed' | 'synced' }) => (
    <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800/80">
        <img src={photo.url} alt={photo.caption || photoTypeLabels[photo.type]} className="h-44 w-full object-cover" />
        <div className="space-y-2 p-4">
            <div className="flex items-center justify-between gap-3">
                <span className="badge badge-info">{photoTypeLabels[photo.type]}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{new Date(photo.createdAt).toLocaleDateString('es-PE')}</span>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-200">{photo.caption || 'Sin descripción adicional'}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
                {syncStatus === 'pending' && 'Pendiente de sincronizar'}
                {syncStatus === 'failed' && 'Error al sincronizar'}
                {(syncStatus === 'synced' || !syncStatus) && 'Guardado'}
            </p>
        </div>
    </article>
);

const EmptyPanel = ({ message, compact = false }: { message: string; compact?: boolean }) => (
    <div className={`rounded-2xl border border-dashed border-gray-300 bg-gray-50 text-center text-gray-500 dark:border-gray-600 dark:bg-gray-900/40 dark:text-gray-400 ${compact ? 'p-5' : 'p-8'}`}>
        {message}
    </div>
);

const InputField = ({
    label,
    value,
    onChange,
    type = 'text',
    step,
    min,
    placeholder,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: string;
    step?: string;
    min?: string;
    placeholder?: string;
}) => (
    <div>
        <label className="mb-2 block text-sm font-medium">{label}</label>
        <input
            className="input"
            type={type}
            step={step}
            min={min}
            value={value}
            placeholder={placeholder}
            onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
        />
    </div>
);
