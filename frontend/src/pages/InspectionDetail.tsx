import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from '../api/axios';
import { CustomIcon } from '../components/CustomIcon';
import { Loader } from '../components/Loader';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import inspectionService from '../services/inspection.service';
import { useAuthStore } from '../store/authStore';
import type { Inspection, UpdateInspectionStatusDto } from '../types';
import { inspectionStatusIconMap } from '../utils/iconSystem';
import { canAccessInspectionExecution, canGenerateInspectionReport } from '../utils/inspectionPermissions';
import { getInspectionLocationLabel, getInspectionServiceLabel, getInspectorName, parseDepartmentInspectionNotes } from '../utils/inspectionMetadata';
import { saveCachedInspectionDetail, getCachedInspectionDetail } from '../utils/offlineDb';
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
                await saveCachedInspectionDetail(id, data);
            } catch (error: unknown) {
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
            try {
                const cached = await getCachedInspectionDetail(id);
                if (cached) {
                    setInspection(cached.data);
                    setIsOfflineData(true);
                } else {
                    toast.error('No hay datos disponibles offline para esta inspección. Abre esta inspección con internet al menos una vez.');
                }
            } catch {
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
    const availableStatusActions = useMemo(() => (inspection ? getAllowedStatusActions(inspection, user || null) : []), [inspection, user]);
    const statusHistory = useMemo(() => [...safeStatusHistory].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()), [safeStatusHistory]);
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
            scheduledDate: action.requiresSchedule ? new Date(inspection.scheduledDate).toISOString().slice(0, 16) : '',
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
                <div className="card py-12 text-center">
                    <div className="mb-4 flex justify-center">
                        <CustomIcon name="database" size="lg" tone="mist" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900">No hay datos disponibles</h3>
                    <p className="mt-2 text-slate-600">
                        {effectiveOnline
                            ? 'La inspección no existe o no tienes acceso.'
                            : 'No hay datos guardados offline para esta inspección. Abre esta inspección con internet al menos una vez.'}
                    </p>
                    <button onClick={() => navigate('/inspections')} className="btn btn-primary mt-5 flex items-center gap-3">
                        <CustomIcon name="arrow-left" size="xs" tone="white" />
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
        <div className="space-y-6 pb-10">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="flex items-start gap-4">
                    <button
                        onClick={() => navigate('/inspections')}
                        className="rounded-[22px] border border-slate-200 bg-white p-2.5 transition-colors hover:bg-slate-50"
                    >
                        <CustomIcon name="arrow-left" size="sm" tone="mist" />
                    </button>
                    <div>
                        <div className="flex flex-wrap items-center gap-3">
                            <p className="section-eyebrow">Detalle operativo</p>
                            {isOfflineData && (
                                <span className="badge badge-warning">
                                    <CustomIcon name="database" size="xs" tone="white" />
                                    Datos offline
                                </span>
                            )}
                        </div>
                        <h1 className="mt-2 font-display text-3xl text-slate-900">{inspection.projectName}</h1>
                        <p className="mt-2 text-slate-600">{serviceLabel} · {inspection.clientName} · {locationLabel}</p>
                        <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-600">
                            <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 ring-1 ring-slate-200">
                                <CustomIcon name="calendar" size="xs" tone="cream" />
                                {new Date(inspection.scheduledDate).toLocaleString('es-ES')}
                            </span>
                            <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 ring-1 ring-slate-200">
                                <CustomIcon name="map-pin" size="xs" tone="blue" />
                                {locationLabel}
                            </span>
                            <span className={`badge ${inspectionStatusBadgeClasses[inspection.status]}`}>
                                <CustomIcon name={inspectionStatusIconMap[inspection.status]} size="xs" tone="white" />
                                {inspectionStatusLabels[inspection.status]}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                    {canExecuteInspection && (
                        <button onClick={() => navigate(`/inspections/${id}/execute`)} className="btn btn-primary flex items-center gap-3">
                            <CustomIcon name="clipboard-check" size="xs" tone="white" />
                            Ejecutar
                        </button>
                    )}

                    {canDownloadReport && (
                        <button onClick={handleDownloadReport} disabled={isDownloadingReport} className="btn btn-secondary flex items-center gap-3">
                            <CustomIcon name={isDownloadingReport ? 'sync' : 'download'} size="xs" tone="cream" spin={isDownloadingReport} />
                            {isDownloadingReport ? 'Generando...' : 'Informe'}
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="card">
                    <div className="mb-5 flex items-center gap-3">
                        <CustomIcon name="clipboard-check" size="sm" tone="cream" />
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">Información general</h2>
                            <p className="text-sm text-slate-500">Estado, agenda e inspector responsable.</p>
                        </div>
                    </div>
                    <dl className="space-y-4">
                        <div className="rounded-[22px] bg-[#fbfbfa] px-4 py-4 ring-1 ring-slate-200/70">
                            <dt className="text-sm text-slate-500">Estado</dt>
                            <dd className="mt-2">
                                <span className={`badge ${inspectionStatusBadgeClasses[inspection.status]}`}>
                                    <CustomIcon name={inspectionStatusIconMap[inspection.status]} size="xs" tone="white" />
                                    {inspectionStatusLabels[inspection.status]}
                                </span>
                            </dd>
                        </div>
                        <div className="rounded-[22px] bg-[#fbfbfa] px-4 py-4 ring-1 ring-slate-200/70">
                            <dt className="text-sm text-slate-500">Fecha programada</dt>
                            <dd className="mt-2 font-semibold text-slate-900">{new Date(inspection.scheduledDate).toLocaleString('es-ES')}</dd>
                        </div>
                        <div className="rounded-[22px] bg-[#fbfbfa] px-4 py-4 ring-1 ring-slate-200/70">
                            <dt className="text-sm text-slate-500">Inspector</dt>
                            <dd className="mt-2 font-semibold text-slate-900">{inspectorName}</dd>
                        </div>
                    </dl>
                </div>

                {availableStatusActions.length > 0 && (
                    <div className="card">
                        <div className="mb-5 flex items-center gap-3">
                            <CustomIcon name="settings" size="sm" tone="mist" />
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900">Cambiar estado</h2>
                                <p className="text-sm text-slate-500">Acciones disponibles para esta inspección.</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            {availableStatusActions.map((action) => (
                                <button key={action.status} onClick={() => openStatusModal(action)} className={`btn ${action.primary ? 'btn-primary' : 'btn-secondary'} flex items-center gap-3`}>
                                    <CustomIcon name={inspectionStatusIconMap[action.status] ?? 'clipboard-check'} size="xs" tone={action.primary ? 'white' : 'cream'} />
                                    {action.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {notes && notes.plainNotes && (
                <div className="card">
                    <div className="mb-4 flex items-center gap-3">
                        <CustomIcon name="note-pencil" size="sm" tone="blue" />
                        <h2 className="text-lg font-semibold text-slate-900">Notas de inspección</h2>
                    </div>
                    <p className="whitespace-pre-wrap text-slate-700">{notes.plainNotes}</p>
                </div>
            )}

            {statusHistory.length > 0 && (
                <div className="card">
                    <div className="mb-5 flex items-center gap-3">
                        <CustomIcon name="clock" size="sm" tone="cream" />
                        <h2 className="text-lg font-semibold text-slate-900">Historial de estados</h2>
                    </div>
                    <div className="space-y-4">
                        {statusHistory.map((entry, index) => (
                            <div key={index} className="flex gap-4 border-b border-slate-200 pb-4 last:border-0">
                                <CustomIcon name={inspectionStatusIconMap[entry.toStatus]} size="sm" tone="mist" />
                                <div className="flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className={`badge ${inspectionStatusBadgeClasses[entry.toStatus]}`}>
                                            <CustomIcon name={inspectionStatusIconMap[entry.toStatus]} size="xs" tone="white" />
                                            {inspectionStatusLabels[entry.toStatus]}
                                        </span>
                                        <span className="text-sm text-slate-500">{new Date(entry.createdAt).toLocaleString('es-ES')}</span>
                                    </div>
                                    {entry.reasonLabel && <p className="mt-1 text-sm text-slate-800">{entry.reasonLabel}</p>}
                                    {entry.comment && <p className="mt-1 text-sm text-slate-600">{entry.comment}</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {statusAction && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17324a]/18 px-4 backdrop-blur-sm">
                    <div className="card w-full max-w-md">
                        <div className="mb-5 flex items-center gap-3">
                            <CustomIcon name={inspectionStatusIconMap[statusAction.status] ?? 'clipboard-check'} size="sm" tone="cream" />
                            <h3 className="text-lg font-semibold text-slate-900">{statusAction.label}</h3>
                        </div>
                        <div className="space-y-4">
                            {statusAction.requiresReason && (
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-slate-700">Motivo</label>
                                    <select
                                        value={statusModal.reasonCode}
                                        onChange={(e) => setStatusModal((prev) => ({ ...prev, reasonCode: e.target.value }))}
                                        className="input"
                                    >
                                        <option value="">Seleccionar motivo...</option>
                                        {reasonOptions.map((opt) => (
                                            <option key={opt.code} value={opt.code}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-700">Comentario</label>
                                <textarea
                                    value={statusModal.comment}
                                    onChange={(e) => setStatusModal((prev) => ({ ...prev, comment: e.target.value }))}
                                    className="input min-h-[100px]"
                                    placeholder="Agregar comentario..."
                                />
                            </div>
                            {statusAction.requiresSchedule && (
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-slate-700">Nueva fecha</label>
                                    <input
                                        type="datetime-local"
                                        value={statusModal.scheduledDate}
                                        onChange={(e) => setStatusModal((prev) => ({ ...prev, scheduledDate: e.target.value }))}
                                        className="input"
                                    />
                                </div>
                            )}
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                                <label className="flex items-center gap-2 text-sm text-slate-700">
                                    <input
                                        type="checkbox"
                                        checked={statusModal.notifyClient}
                                        onChange={(e) => setStatusModal((prev) => ({ ...prev, notifyClient: e.target.checked }))}
                                    />
                                    Notificar cliente
                                </label>
                                <label className="flex items-center gap-2 text-sm text-slate-700">
                                    <input
                                        type="checkbox"
                                        checked={statusModal.notifyInspector}
                                        onChange={(e) => setStatusModal((prev) => ({ ...prev, notifyInspector: e.target.checked }))}
                                    />
                                    Notificar inspector
                                </label>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button onClick={closeStatusModal} className="btn btn-secondary">Cancelar</button>
                            <button onClick={handleStatusChange} disabled={isUpdating} className="btn btn-primary flex items-center gap-3">
                                <CustomIcon name={isUpdating ? 'sync' : inspectionStatusIconMap[statusAction.status] ?? 'clipboard-check'} size="xs" tone="white" spin={isUpdating} />
                                {isUpdating ? 'Actualizando...' : 'Confirmar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
