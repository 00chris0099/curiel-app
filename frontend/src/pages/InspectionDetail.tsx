import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ClipboardCheck, FileText, Database } from 'lucide-react';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from '../api/axios';
import { Loader } from '../components/Loader';
import inspectionService from '../services/inspection.service';
import { useAuthStore } from '../store/authStore';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { saveCachedInspectionDetail, getCachedInspectionDetail } from '../utils/offlineDb';
import type { Inspection, UpdateInspectionStatusDto } from '../types';
import { getInspectionLocationLabel, getInspectionServiceLabel, getInspectorName, parseDepartmentInspectionNotes } from '../utils/inspectionMetadata';
import {
    buildStatusUpdatePayload,
    getAllowedStatusActions,
    getStatusReasonOptions,
    inspectionStatusBadgeClasses,
    inspectionStatusLabels,
    type StatusActionConfig,
} from '../utils/inspectionStatus';
import { canAccessInspectionExecution, canGenerateInspectionReport } from '../utils/inspectionPermissions';

type StatusModalState = {
    reasonCode: string;
    comment: string;
    notifyClient: boolean;
    notifyInspector: boolean;
    scheduledDate: string;
};

const emptyStatusModalState: StatusModalState = {
    reasonCode: '',
    comment: '',
    notifyClient: false,
    notifyInspector: false,
    scheduledDate: '',
};

function safeArray<T>(value: T[] | null | undefined) {
    return Array.isArray(value) ? value : [];
}

export const InspectionDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { effectiveOnline } = useOnlineStatus();
    const [inspection, setInspection] = useState<Inspection | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isDownloadingReport, setIsDownloadingReport] = useState(false);
    const [statusAction, setStatusAction] = useState<StatusActionConfig | null>(null);
    const [statusModal, setStatusModal] = useState<StatusModalState>(emptyStatusModalState);
    const [isOfflineData, setIsOfflineData] = useState(false);

    const loadInspection = useCallback(async () => {
        if (!id) {
            navigate('/inspections', { replace: true });
            return;
        }

        setIsLoading(true);
        setIsOfflineData(false);

        if (effectiveOnline) {
            try {
                const data = await inspectionService.getInspectionById(id);
                setInspection(data);
                // Cache for offline use
                await saveCachedInspectionDetail(id, data);
            } catch (error: unknown) {
                // If API fails, try to load from cache
                const cached = await getCachedInspectionDetail(id);
                if (cached) {
                    setInspection(cached.data);
                    setIsOfflineData(true);
                    toast.success('Mostrando datos guardados offline');
                } else {
                    toast.error(getApiErrorMessage(error, 'Error al cargar la inspeccion'));
                    navigate('/inspections', { replace: true });
                }
            } finally {
                setIsLoading(false);
            }
        } else {
            // Offline: load from cache
            try {
                const cached = await getCachedInspectionDetail(id);
                if (cached) {
                    setInspection(cached.data);
                    setIsOfflineData(true);
                } else {
                    toast.error('No hay datos disponibles offline para esta inspección. Abre esta inspección con internet al menos una vez.');
                }
            } catch (error) {
                toast.error('Error al cargar datos locales');
            } finally {
                setIsLoading(false);
            }
        }
    }, [id, navigate, effectiveOnline]);

    useEffect(() => {
        loadInspection();
    }, [loadInspection]);

    const safeStatusHistory = useMemo(() => safeArray(inspection?.statusHistory), [inspection?.statusHistory]);
    const availableStatusActions = useMemo(
        () => (inspection ? getAllowedStatusActions(inspection, user || null) : []),
        [inspection, user]
    );
    const statusHistory = useMemo(() => {
        return [...safeStatusHistory].sort((left, right) => {
            return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
        });
    }, [safeStatusHistory]);
    const reasonOptions = useMemo(() => {
        if (!inspection || !statusAction) {
            return [];
        }

        return getStatusReasonOptions(inspection.status, statusAction.status);
    }, [inspection, statusAction]);

    const openStatusModal = (action: StatusActionConfig) => {
        if (!inspection) {
            return;
        }

        setStatusAction(action);
        setStatusModal({
            reasonCode: '',
            comment: '',
            notifyClient: action.defaultNotifyClient ?? false,
            notifyInspector: action.defaultNotifyInspector ?? false,
            scheduledDate: action.requiresSchedule
                ? new Date(inspection.scheduledDate).toISOString().slice(0, 16)
                : '',
        });
    };

    const closeStatusModal = () => {
        setStatusAction(null);
        setStatusModal(emptyStatusModalState);
    };

    const handleStatusChange = async () => {
        if (!inspection || !id || !statusAction) {
            return;
        }

        if (statusAction.requiresReason && !statusModal.reasonCode) {
            toast.error('Debes seleccionar un motivo');
            return;
        }

        if (statusAction.requiresSchedule && !statusModal.scheduledDate) {
            toast.error('Debes seleccionar la nueva fecha y hora');
            return;
        }

        setIsUpdating(true);
        try {
            const payload: UpdateInspectionStatusDto = buildStatusUpdatePayload({
                status: statusAction.status,
                reasonCode: statusModal.reasonCode || undefined,
                comment: statusModal.comment.trim() || undefined,
                notifyClient: statusModal.notifyClient,
                notifyInspector: statusModal.notifyInspector,
                scheduledDate: statusModal.scheduledDate ? new Date(statusModal.scheduledDate).toISOString() : undefined,
            }, inspection.status, statusAction.status);

            const updated = await inspectionService.updateStatus(id, payload);
            setInspection(updated);
            closeStatusModal();
            toast.success('Estado actualizado');
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'No se pudo actualizar el estado'));
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDownloadReport = async () => {
        if (!inspection || !id) {
            return;
        }

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

    if (!inspection) {
        return (
            <div className="space-y-6">
                <div className="card text-center py-12">
                    <Database className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No hay datos disponibles</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                        {effectiveOnline
                            ? 'La inspección no existe o no tienes acceso.'
                            : 'No hay datos guardados offline para esta inspección. Abre esta inspección con internet al menos una vez.'}
                    </p>
                    <button
                        onClick={() => navigate('/inspections')}
                        className="btn btn-primary"
                    >
                        Volver a inspecciones
                    </button>
                </div>
            </div>
        );
    }

    const serviceLabel = getInspectionServiceLabel(inspection);
    const locationLabel = getInspectionLocationLabel(inspection);
    const inspectorName = getInspectorName(inspection);
    const notes = parseDepartmentInspectionNotes(inspection?.notes);
    const canExecuteInspection = canAccessInspectionExecution(inspection, user || null);
    const canDownloadReport = canGenerateInspectionReport(inspection, user || null);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                    <button
                        onClick={() => navigate('/inspections')}
                        className="mt-1 rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold">{inspection.projectName}</h1>
                            {isOfflineData && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800">
                                    <Database className="w-3 h-3" />
                                    Datos offline
                                </span>
                            )}
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">
                            {serviceLabel} · {inspection.clientName} · {locationLabel}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {canExecuteInspection && (
                        <>
                            <button
                                onClick={() => navigate(`/inspections/${id}/execute`)}
                                className="btn btn-primary flex items-center gap-2"
                            >
                                <ClipboardCheck className="w-4 h-4" />
                                Ejecutar
                            </button>
                        </>
                    )}

                    {canDownloadReport && (
                        <>
                            <button
                                onClick={handleDownloadReport}
                                disabled={isDownloadingReport}
                                className="btn btn-secondary flex items-center gap-2"
                            >
                                <FileText className="w-4 h-4" />
                                {isDownloadingReport ? 'Generando...' : 'Informe'}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Status and Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="card">
                    <h2 className="text-lg font-semibold mb-4">Información General</h2>
                    <dl className="space-y-3">
                        <div>
                            <dt className="text-sm text-gray-500">Estado</dt>
                            <dd>
                                <span className={`badge ${inspectionStatusBadgeClasses[inspection.status]}`}>
                                    {inspectionStatusLabels[inspection.status]}
                                </span>
                            </dd>
                        </div>
                        <div>
                            <dt className="text-sm text-gray-500">Fecha Programada</dt>
                            <dd className="font-medium">
                                {new Date(inspection.scheduledDate).toLocaleString('es-ES')}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-sm text-gray-500">Inspector</dt>
                            <dd className="font-medium">{inspectorName}</dd>
                        </div>
                    </dl>
                </div>

                {/* Status Actions */}
                {availableStatusActions.length > 0 && (
                    <div className="card">
                        <h2 className="text-lg font-semibold mb-4">Cambiar Estado</h2>
                        <div className="flex flex-wrap gap-2">
                            {availableStatusActions.map((action) => (
                                <button
                                    key={action.status}
                                    onClick={() => openStatusModal(action)}
                                    className={`btn ${action.primary ? 'btn-primary' : 'btn-secondary'}`}
                                >
                                    {action.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Notes */}
            {notes && notes.plainNotes && (
                <div className="card">
                    <h2 className="text-lg font-semibold mb-4">Notas de Inspección</h2>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{notes.plainNotes}</p>
                </div>
            )}

            {/* Status History */}
            {statusHistory.length > 0 && (
                <div className="card">
                    <h2 className="text-lg font-semibold mb-4">Historial de Estados</h2>
                    <div className="space-y-4">
                        {statusHistory.map((entry, index) => (
                                    <div key={index} className="flex gap-4 pb-4 border-b border-gray-200 dark:border-gray-700 last:border-0">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className={`badge ${inspectionStatusBadgeClasses[entry.toStatus]}`}>
                                                    {inspectionStatusLabels[entry.toStatus]}
                                                </span>
                                                <span className="text-sm text-gray-500">
                                                    {new Date(entry.createdAt).toLocaleString('es-ES')}
                                                </span>
                                            </div>
                                            {entry.reasonLabel && <p className="text-sm mt-1">{entry.reasonLabel}</p>}
                                            {entry.comment && (
                                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{entry.comment}</p>
                                            )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Status Modal */}
            {statusAction && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="card w-full max-w-md mx-4">
                        <h3 className="text-lg font-semibold mb-4">{statusAction.label}</h3>
                        <div className="space-y-4">
                            {statusAction.requiresReason && (
                                <div>
                                    <label className="block text-sm font-medium mb-2">Motivo</label>
                                    <select
                                        value={statusModal.reasonCode}
                                        onChange={(e) => setStatusModal(prev => ({ ...prev, reasonCode: e.target.value }))}
                                        className="input"
                                    >
                                        <option value="">Seleccionar motivo...</option>
                                        {reasonOptions.map(opt => (
                                            <option key={opt.code} value={opt.code}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium mb-2">Comentario</label>
                                <textarea
                                    value={statusModal.comment}
                                    onChange={(e) => setStatusModal(prev => ({ ...prev, comment: e.target.value }))}
                                    className="input min-h-[100px]"
                                    placeholder="Agregar comentario..."
                                />
                            </div>
                            {statusAction.requiresSchedule && (
                                <div>
                                    <label className="block text-sm font-medium mb-2">Nueva Fecha</label>
                                    <input
                                        type="datetime-local"
                                        value={statusModal.scheduledDate}
                                        onChange={(e) => setStatusModal(prev => ({ ...prev, scheduledDate: e.target.value }))}
                                        className="input"
                                    />
                                </div>
                            )}
                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={statusModal.notifyClient}
                                        onChange={(e) => setStatusModal(prev => ({ ...prev, notifyClient: e.target.checked }))}
                                    />
                                    <span className="text-sm">Notificar cliente</span>
                                </label>
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={statusModal.notifyInspector}
                                        onChange={(e) => setStatusModal(prev => ({ ...prev, notifyInspector: e.target.checked }))}
                                    />
                                    <span className="text-sm">Notificar inspector</span>
                                </label>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={closeStatusModal} className="btn btn-secondary">
                                Cancelar
                            </button>
                            <button
                                onClick={handleStatusChange}
                                disabled={isUpdating}
                                className="btn btn-primary"
                            >
                                {isUpdating ? 'Actualizando...' : 'Confirmar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
