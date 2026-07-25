import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from '../api/axios';
import { CustomIcon } from '../components/CustomIcon';
import { Loader } from '../components/Loader';
import { ReportPreview } from '../components/inspections/ReportPreview';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import inspectionService from '../services/inspection.service';
import { useAuthStore } from '../store/authStore';
import type { Inspection, UpdateInspectionStatusDto } from '../types';
import { inspectionStatusIconMap } from '../utils/iconSystem';
import { canAccessInspectionExecution, canGenerateInspectionReport } from '../utils/inspectionPermissions';
import { getInspectionLocationLabel, getInspectorName } from '../utils/inspectionMetadata';
import { saveCachedInspectionDetail, getCachedInspectionDetail } from '../utils/offlineDb';
import {
    buildStatusUpdatePayload,
    getAllowedStatusActions,
    getStatusReasonOptions,
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
    const { effectiveOnline } = useOnlineStatus();
    const [inspection, setInspection] = useState<Inspection | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isDownloadingReport, setIsDownloadingReport] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [statusAction, setStatusAction] = useState<StatusActionConfig | null>(null);
    const [statusModal, setStatusModal] = useState<StatusModalState>(emptyStatusModalState);

    const loadInspection = useCallback(async () => {
        if (!id) {
            navigate('/inspections', { replace: true });
            return;
        }

        setIsLoading(true);

        if (effectiveOnline) {
            try {
                const data = await inspectionService.getInspectionById(id);
                setInspection(data);
                await saveCachedInspectionDetail(id, data);
            } catch (error: unknown) {
                const cached = await getCachedInspectionDetail(id);
                if (cached) {
                    setInspection(cached.data);
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

    const availableStatusActions = useMemo(() => (inspection ? getAllowedStatusActions(inspection, user || null) : []), [inspection, user]);
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
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">No hay datos disponibles</h3>
                    <p className="mt-2 text-slate-600 dark:text-slate-400">
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

    const locationLabel = getInspectionLocationLabel(inspection);
    const inspectorName = getInspectorName(inspection);
    const canExecuteInspection = canAccessInspectionExecution(inspection, user || null);
    const canDownloadReport = canGenerateInspectionReport(inspection, user || null);
    const canEditPdf = canExecuteInspection;

    return (
        <div className="space-y-4 pb-10">
            {/* Compact header */}
            <div className="flex items-center gap-3">
                <button
                    onClick={() => navigate('/inspections')}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white transition-colors hover:bg-slate-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                >
                    <CustomIcon name="arrow-left" size="xs" tone="mist" />
                </button>
                <div className="min-w-0 flex-1">
                    <h1 className="truncate text-lg font-bold text-slate-900 dark:text-slate-100 sm:text-xl">{inspection.projectName}</h1>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                    {canExecuteInspection && (
                        <button onClick={() => navigate(`/inspections/${id}/execute`)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#17324a] text-white transition-colors hover:bg-[#1d3d5c] sm:h-11 sm:w-11 sm:rounded-2xl sm:w-auto sm:gap-2 sm:px-4" aria-label="Ejecutar inspeccion" title="Ejecutar inspeccion">
                            <CustomIcon name="clipboard-check" size="xs" tone="white" />
                            <span className="hidden sm:inline">Ejecutar</span>
                        </button>
                    )}
                    {canEditPdf && (
                        <button onClick={() => navigate(`/inspections/${id}/pdf-editor`)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white transition-colors hover:bg-slate-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 sm:h-11 sm:w-11 sm:rounded-2xl sm:w-auto sm:gap-2 sm:px-4" aria-label="Editar PDF" title="Editar PDF">
                            <CustomIcon name="pencil" size="xs" tone="cream" />
                            <span className="hidden sm:inline">Editar PDF</span>
                        </button>
                    )}
                    {canDownloadReport && (
                        <>
                            <button onClick={() => setShowPreview(true)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white transition-colors hover:bg-slate-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700" aria-label="Vista previa del informe" title="Vista previa del informe">
                                <CustomIcon name="file-pdf" size="xs" tone="cream" />
                            </button>
                            <button onClick={handleDownloadReport} disabled={isDownloadingReport} className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white transition-colors hover:bg-slate-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700" aria-label="Descargar informe" title="Descargar informe">
                                <CustomIcon name={isDownloadingReport ? 'sync' : 'download'} size="xs" tone="cream" spin={isDownloadingReport} />
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Status + meta row */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ${
                    inspection.status === 'en_proceso' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                        : inspection.status === 'lista_revision' ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                            : 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                }`}>
                    {inspectionStatusLabels[inspection.status] || inspection.status}
                </span>
                <span>·</span>
                <span>{new Date(inspection.scheduledDate).toLocaleDateString('es-PE')}</span>
                <span className="hidden sm:inline">·</span>
                <span className="hidden sm:inline">{locationLabel}</span>
                <span className="hidden sm:inline">·</span>
                <span className="hidden sm:inline">{inspectorName}</span>
            </div>

            {/* Status actions (if any) */}
            {availableStatusActions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {availableStatusActions.map((action) => (
                        <button key={action.status} onClick={() => openStatusModal(action)} className={`btn ${action.primary ? 'btn-primary' : 'btn-secondary'} flex items-center gap-2 text-sm`}>
                            <CustomIcon name={inspectionStatusIconMap[action.status] ?? 'clipboard-check'} size="xs" tone={action.primary ? 'white' : 'cream'} />
                            {action.label}
                        </button>
                    ))}
                </div>
            )}

            {/* Status change modal */}
            {statusAction && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17324a]/18 px-4 backdrop-blur-sm">
                    <div className="card w-full max-w-md">
                        <div className="mb-5 flex items-center gap-3">
                            <CustomIcon name={inspectionStatusIconMap[statusAction.status] ?? 'clipboard-check'} size="sm" tone="cream" />
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{statusAction.label}</h3>
                        </div>
                        <div className="space-y-4">
                            {statusAction.requiresReason && (
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Motivo</label>
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
                                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Comentario</label>
                                <textarea
                                    value={statusModal.comment}
                                    onChange={(e) => setStatusModal((prev) => ({ ...prev, comment: e.target.value }))}
                                    className="input min-h-[100px]"
                                    placeholder="Agregar comentario..."
                                />
                            </div>
                            {statusAction.requiresSchedule && (
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Nueva fecha</label>
                                    <input
                                        type="datetime-local"
                                        value={statusModal.scheduledDate}
                                        onChange={(e) => setStatusModal((prev) => ({ ...prev, scheduledDate: e.target.value }))}
                                        className="input"
                                    />
                                </div>
                            )}
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                                    <input
                                        type="checkbox"
                                        checked={statusModal.notifyClient}
                                        onChange={(e) => setStatusModal((prev) => ({ ...prev, notifyClient: e.target.checked }))}
                                    />
                                    Notificar cliente
                                </label>
                                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
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

            <ReportPreview
                inspectionId={id || ''}
                projectName={inspection.projectName}
                isOpen={showPreview}
                onClose={() => setShowPreview(false)}
            />
        </div>
    );
};
