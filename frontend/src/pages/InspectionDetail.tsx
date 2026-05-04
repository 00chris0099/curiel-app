import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ClipboardCheck, FileText, MessageSquare, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from '../api/axios';
import { Loader } from '../components/Loader';
import inspectionService from '../services/inspection.service';
import { useAuthStore } from '../store/authStore';
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

export const InspectionDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [inspection, setInspection] = useState<Inspection | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isDownloadingReport, setIsDownloadingReport] = useState(false);
    const [statusAction, setStatusAction] = useState<StatusActionConfig | null>(null);
    const [statusModal, setStatusModal] = useState<StatusModalState>(emptyStatusModalState);

    const loadInspection = useCallback(async () => {
        if (!id) {
            navigate('/inspections', { replace: true });
            return;
        }

        setIsLoading(true);
        try {
            const data = await inspectionService.getInspectionById(id);
            setInspection(data);
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'Error al cargar la inspeccion'));
            navigate('/inspections', { replace: true });
        } finally {
            setIsLoading(false);
        }
    }, [id, navigate]);

    useEffect(() => {
        loadInspection();
    }, [loadInspection]);

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

    const handleDelete = async () => {
        if (!inspection || !id) {
            return;
        }

        const confirmed = window.confirm('¿Seguro que deseas eliminar esta inspeccion?');
        if (!confirmed) {
            return;
        }

        setIsUpdating(true);
        try {
            await inspectionService.deleteInspection(id);
            toast.success('Inspeccion eliminada');
            navigate('/inspections');
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'No se pudo eliminar la inspeccion'));
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
        return null;
    }

    const canDelete = user?.role === 'admin';
    const canExecute = Boolean(
        user?.role === 'admin'
        || user?.role === 'arquitecto'
        || (user?.role === 'inspector' && user.id === inspection.inspectorId)
    );
    const { metadata, plainNotes } = parseDepartmentInspectionNotes(inspection.notes);
    const reviewPointsLabel = metadata?.reviewPoints?.length
        ? metadata.reviewPoints.join(', ')
        : 'Sin puntos específicos';
    const availableStatusActions = useMemo(
        () => getAllowedStatusActions(inspection, user || null),
        [inspection, user]
    );
    const statusHistory = [...(inspection.statusHistory || [])].sort((left, right) => {
        return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });
    const reasonOptions = statusAction ? getStatusReasonOptions(inspection.status, statusAction.status) : [];

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/inspections')}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold">{inspection.projectName}</h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">
                            {getInspectionServiceLabel(inspection)} · {inspection.clientName}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-3">
                    <button
                        onClick={handleDownloadReport}
                        disabled={isDownloadingReport}
                        className="btn btn-primary flex items-center gap-2"
                    >
                        <FileText className="w-4 h-4" />
                        {isDownloadingReport ? 'Generando...' : 'Generar informe'}
                    </button>

                    {canExecute && (
                        <button
                            onClick={() => navigate(`/inspections/${inspection.id}/execute`)}
                            className="btn btn-secondary flex items-center gap-2"
                        >
                            <ClipboardCheck className="w-4 h-4" />
                            Ejecutar inspección
                        </button>
                    )}

                    {canDelete && (
                        <button
                            onClick={handleDelete}
                            disabled={isUpdating}
                            className="btn btn-danger flex items-center gap-2"
                        >
                            <Trash2 className="w-4 h-4" />
                            Eliminar
                        </button>
                    )}
                </div>
            </div>

            <div className="card grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Servicio</p>
                    <p className="font-medium">{getInspectionServiceLabel(inspection)}</p>
                </div>
                <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Estado</p>
                    <p className="font-medium">{inspectionStatusLabels[inspection.status]}</p>
                </div>
                <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Fecha programada</p>
                    <p className="font-medium">{new Date(inspection.scheduledDate).toLocaleString('es-ES')}</p>
                </div>
                <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Inspector</p>
                    <p className="font-medium">{getInspectorName(inspection)}</p>
                </div>
                <div className="md:col-span-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Ubicación</p>
                    <p className="font-medium">{getInspectionLocationLabel(inspection)}</p>
                </div>
                {metadata && (
                    <>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Canal de contacto</p>
                            <p className="font-medium">{metadata.contactChannel}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Prioridad</p>
                            <p className="font-medium">{metadata.priority}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Inmueble</p>
                            <p className="font-medium">{metadata.propertyType}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Departamento</p>
                            <p className="font-medium">{metadata.apartmentNumber}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Estado del inmueble</p>
                            <p className="font-medium">{metadata.propertyCondition}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Informe técnico</p>
                            <p className="font-medium">{metadata.technicalReport}</p>
                        </div>
                        <div className="md:col-span-2">
                            <p className="text-sm text-gray-500 dark:text-gray-400">Puntos a revisar</p>
                            <p className="font-medium">{reviewPointsLabel}</p>
                            {metadata.reviewPointOther && (
                                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Otro: {metadata.reviewPointOther}</p>
                            )}
                        </div>
                    </>
                )}
                <div className="md:col-span-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Notas</p>
                    <p className="font-medium whitespace-pre-wrap">
                        {metadata?.observations || plainNotes || 'Sin observaciones'}
                    </p>
                </div>
            </div>

            <div className="card">
                <h2 className="text-lg font-bold mb-4">Actualizar estado</h2>
                {availableStatusActions.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        No tienes transiciones disponibles para el estado actual.
                    </p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {availableStatusActions.map((action) => (
                            <button
                                key={action.status}
                                type="button"
                                disabled={isUpdating}
                                onClick={() => openStatusModal(action)}
                                className="rounded-xl border border-gray-200 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <span className="font-medium text-gray-900 dark:text-white">{action.label}</span>
                                    <span className={`badge ${inspectionStatusBadgeClasses[action.status]}`}>{inspectionStatusLabels[action.status]}</span>
                                </div>
                                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{action.description}</p>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="card">
                <div className="flex items-center gap-3 mb-4">
                    <MessageSquare className="w-5 h-5 text-primary-600" />
                    <h2 className="text-lg font-bold">Historial de estados</h2>
                </div>
                {statusHistory.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">Aún no hay cambios de estado registrados.</p>
                ) : (
                    <div className="space-y-4">
                        {statusHistory.map((entry) => (
                            <article key={entry.id} className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className={`badge ${inspectionStatusBadgeClasses[entry.fromStatus]}`}>{inspectionStatusLabels[entry.fromStatus]}</span>
                                            <span className="text-gray-400">→</span>
                                            <span className={`badge ${inspectionStatusBadgeClasses[entry.toStatus]}`}>{inspectionStatusLabels[entry.toStatus]}</span>
                                        </div>
                                        <p className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                                            {entry.changedByUser?.fullName
                                                || entry.changedByUser?.name
                                                || [entry.changedByUser?.firstName, entry.changedByUser?.lastName].filter(Boolean).join(' ')
                                                || 'Usuario del sistema'}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {new Date(entry.createdAt).toLocaleString('es-ES')}
                                        </p>
                                    </div>

                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                        <p>Notificar cliente: {entry.notifyClient ? 'Sí' : 'No'}</p>
                                        <p>Notificar inspector: {entry.notifyInspector ? 'Sí' : 'No'}</p>
                                    </div>
                                </div>

                                {entry.reasonLabel && (
                                    <p className="mt-3 text-sm text-gray-700 dark:text-gray-200">
                                        <span className="font-medium">Motivo:</span> {entry.reasonLabel}
                                    </p>
                                )}

                                {entry.comment && (
                                    <p className="mt-2 text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap">
                                        <span className="font-medium">Comentario:</span> {entry.comment}
                                    </p>
                                )}
                            </article>
                        ))}
                    </div>
                )}
            </div>

            {statusAction && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
                    <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-sm font-medium uppercase tracking-[0.16em] text-primary-600 dark:text-primary-400">
                                    Cambio de estado
                                </p>
                                <h2 className="mt-2 text-xl font-bold text-gray-900 dark:text-white">{statusAction.label}</h2>
                                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{statusAction.description}</p>
                            </div>
                            <button type="button" onClick={closeStatusModal} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">Cerrar</button>
                        </div>

                        <div className="mt-6 space-y-5">
                            <div className="rounded-xl bg-gray-50 p-4 text-sm dark:bg-gray-800/70">
                                <p>
                                    <span className="font-medium">Nuevo estado:</span> {inspectionStatusLabels[statusAction.status]}
                                </p>
                            </div>

                            {reasonOptions.length > 0 && (
                                <div>
                                    <label className="mb-2 block text-sm font-medium">Motivo {statusAction.requiresReason ? '*' : ''}</label>
                                    <select
                                        className="input"
                                        value={statusModal.reasonCode}
                                        onChange={(event) => setStatusModal((current) => ({ ...current, reasonCode: event.target.value }))}
                                    >
                                        <option value="">Selecciona un motivo</option>
                                        {reasonOptions.map((option) => (
                                            <option key={option.code} value={option.code}>{option.label}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {statusAction.requiresSchedule && (
                                <div>
                                    <label className="mb-2 block text-sm font-medium">Nueva fecha y hora *</label>
                                    <input
                                        type="datetime-local"
                                        className="input"
                                        value={statusModal.scheduledDate}
                                        onChange={(event) => setStatusModal((current) => ({ ...current, scheduledDate: event.target.value }))}
                                    />
                                </div>
                            )}

                            <div>
                                <label className="mb-2 block text-sm font-medium">
                                    Comentario {statusAction.recommendComment ? '(recomendado)' : '(opcional)'}
                                </label>
                                <textarea
                                    className="input min-h-[120px]"
                                    value={statusModal.comment}
                                    onChange={(event) => setStatusModal((current) => ({ ...current, comment: event.target.value }))}
                                    placeholder="Agrega contexto para el cambio de estado, aprobación o devolución."
                                />
                            </div>

                            {(statusAction.status === 'cancelada' || statusAction.status === 'reprogramada' || statusAction.status === 'en_proceso' || statusAction.status === 'finalizada') && (
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <label className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 dark:border-gray-700">
                                        <input
                                            type="checkbox"
                                            checked={statusModal.notifyClient}
                                            onChange={(event) => setStatusModal((current) => ({ ...current, notifyClient: event.target.checked }))}
                                        />
                                        <span className="text-sm">Preparar notificación al cliente</span>
                                    </label>
                                    <label className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 dark:border-gray-700">
                                        <input
                                            type="checkbox"
                                            checked={statusModal.notifyInspector}
                                            onChange={(event) => setStatusModal((current) => ({ ...current, notifyInspector: event.target.checked }))}
                                        />
                                        <span className="text-sm">Notificar al inspector</span>
                                    </label>
                                </div>
                            )}
                        </div>

                        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                            <button type="button" onClick={closeStatusModal} className="btn btn-secondary">Cancelar</button>
                            <button type="button" onClick={handleStatusChange} disabled={isUpdating} className="btn btn-primary">
                                {isUpdating ? 'Guardando...' : statusAction.confirmLabel}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
