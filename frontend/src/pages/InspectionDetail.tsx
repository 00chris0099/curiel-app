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
import type { Inspection, InspectionStatus, UpdateInspectionStatusDto } from '../types';
import { inspectionStatusIconMap } from '../utils/iconSystem';
import { canGenerateInspectionReport } from '../utils/inspectionPermissions';
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

const statusBadgeStyles: Record<InspectionStatus, string> = {
    pendiente: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800/40',
    en_proceso: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800/40',
    lista_revision: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800/40',
    finalizada: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800/40',
    cancelada: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800/40',
    reprogramada: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
};

const workflowSteps: Array<{ key: InspectionStatus; label: string }> = [
    { key: 'pendiente', label: 'Programada' },
    { key: 'en_proceso', label: 'En Proceso' },
    { key: 'lista_revision', label: 'En Revisión' },
    { key: 'finalizada', label: 'Finalizada' },
];

export const InspectionDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { effectiveOnline } = useOnlineStatus();
    const [inspection, setInspection] = useState<Inspection | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
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
                    toast.error(getApiErrorMessage(error, 'Error al cargar la inspección'));
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
                    toast.error('No hay datos disponibles offline para esta inspección.');
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
        if (!inspection) return;

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
        if (!inspection || !id || !statusAction) return;

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
            toast.success('Estado actualizado correctamente');
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'No se pudo actualizar el estado'));
        } finally {
            setIsUpdating(false);
        }
    };

    if (isLoading) {
        return <Loader fullScreen />;
    }

    if (!inspection) {
        return (
            <div className="space-y-6 animate-in fade-in duration-300">
                <div className="card py-12 text-center">
                    <div className="mb-4 flex justify-center">
                        <CustomIcon name="database" size="lg" tone="mist" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No hay datos disponibles</h3>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        {effectiveOnline
                            ? 'La inspección no existe o no tienes permisos para acceder.'
                            : 'No hay datos guardados offline para esta inspección.'}
                    </p>
                    <button onClick={() => navigate('/inspections')} className="btn btn-primary mt-5 inline-flex items-center gap-2">
                        <CustomIcon name="arrow-left" size="xs" tone="white" />
                        Volver a inspecciones
                    </button>
                </div>
            </div>
        );
    }

    const locationLabel = getInspectionLocationLabel(inspection);
    const inspectorName = getInspectorName(inspection);
    const canDownloadReport = canGenerateInspectionReport(inspection, user || null);

    const clientDisplayName = inspection.client
        ? (inspection.client.razonSocial || `${inspection.client.firstName || ''} ${inspection.client.lastName || ''}`.trim() || 'Cliente no registrado')
        : 'Cliente no registrado';

    // Calculate current step index for workflow bar
    const currentStepIndex = workflowSteps.findIndex(s => s.key === inspection.status);
    const activeStepIdx = currentStepIndex >= 0 ? currentStepIndex : (inspection.status === 'finalizada' ? 3 : 0);

    return (
        <div className="space-y-6 pb-12 animate-in fade-in duration-300">
            {/* Header section */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/inspections')}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                        title="Volver"
                    >
                        <CustomIcon name="arrow-left" size="xs" tone="mist" />
                    </button>
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-2xl">{inspection.projectName}</h1>
                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-xs font-semibold uppercase tracking-wider ${statusBadgeStyles[inspection.status] || 'bg-gray-100 text-gray-700'}`}>
                                <CustomIcon name={inspectionStatusIconMap[inspection.status] ?? 'clipboard-check'} size="xs" tone="mist" />
                                {inspectionStatusLabels[inspection.status] || inspection.status}
                            </span>
                        </div>
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                            Código: <span className="font-mono font-medium text-gray-700 dark:text-gray-300">{inspection.id.slice(0, 8)}</span> · Programado: {new Date(inspection.scheduledDate).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' })}
                        </p>
                    </div>
                </div>

                {/* Quick actions top bar */}
                <div className="flex items-center gap-2">
                    {canDownloadReport && (
                        <button
                            onClick={() => setShowPreview(true)}
                            className="btn btn-secondary flex items-center gap-2 text-xs"
                        >
                            <CustomIcon name="file-pdf" size="xs" tone="cream" />
                            <span>Informe PDF</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Workflow Progress Timeline Stepper */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-5">
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Estado del Flujo de Inspección</p>
                <div className="relative flex items-center justify-between">
                    <div className="absolute left-0 top-1/2 -z-0 h-0.5 w-full -translate-y-1/2 bg-gray-200 dark:bg-gray-800" />
                    {workflowSteps.map((step, idx) => {
                        const isDone = idx < activeStepIdx || inspection.status === 'finalizada';
                        const isCurrent = idx === activeStepIdx && inspection.status !== 'finalizada';

                        return (
                            <div key={step.key} className="relative z-10 flex flex-col items-center gap-1.5">
                                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                                    isCurrent ? 'bg-[#17324a] text-white ring-4 ring-[#17324a]/20 dark:bg-blue-600 dark:ring-blue-600/30' :
                                    isDone ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500'
                                }`}>
                                    {isDone ? '✓' : idx + 1}
                                </div>
                                <span className={`text-[11px] font-medium hidden sm:inline ${
                                    isCurrent ? 'text-[#17324a] font-bold dark:text-blue-400' :
                                    isDone ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'
                                }`}>
                                    {step.label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Actions Bar (Contextual buttons depending on status) */}
            {availableStatusActions.length > 0 && (
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Acciones Disponibles</p>
                    <div className="flex flex-wrap gap-3">
                        {availableStatusActions.map((action) => (
                            <button
                                key={action.status}
                                onClick={() => openStatusModal(action)}
                                className={`btn ${action.primary ? 'btn-primary' : 'btn-secondary'} flex items-center gap-2 text-sm font-medium`}
                            >
                                <CustomIcon name={inspectionStatusIconMap[action.status] ?? 'clipboard-check'} size="xs" tone={action.primary ? 'white' : 'cream'} />
                                <span>{action.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Grid Layout: Main info (8 cols) + Side cards (4 cols) */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                {/* Main 8 Cols */}
                <div className="space-y-6 lg:col-span-8">
                    {/* Client & Project Overview Card */}
                    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                        <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
                            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <CustomIcon name="buildings" size="xs" tone="mist" />
                                Detalle del Cliente y Proyecto
                            </h3>
                            <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                                {inspection.client?.documentType?.toUpperCase() || 'DNI'}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <p className="text-xs font-medium text-gray-400 dark:text-gray-500">Cliente</p>
                                <p className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">{clientDisplayName}</p>
                                {inspection.client?.documentNumber && (
                                    <p className="text-xs text-gray-500 font-mono">{inspection.client.documentType?.toUpperCase()}: {inspection.client.documentNumber}</p>
                                )}
                            </div>

                            <div>
                                <p className="text-xs font-medium text-gray-400 dark:text-gray-500">Contacto Directo</p>
                                <div className="mt-1 flex items-center gap-2">
                                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{inspection.client?.phone || 'Sin teléfono'}</p>
                                    {inspection.client?.phone && (
                                        <a
                                            href={`https://wa.me/51${inspection.client.phone.replace(/\D/g, '')}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400"
                                        >
                                            WhatsApp
                                        </a>
                                    )}
                                </div>
                                {inspection.client?.email && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{inspection.client.email}</p>
                                )}
                            </div>

                            <div>
                                <p className="text-xs font-medium text-gray-400 dark:text-gray-500">Ubicación / Dirección</p>
                                <p className="mt-0.5 text-sm font-medium text-gray-800 dark:text-gray-200">{locationLabel}</p>
                            </div>

                            <div>
                                <p className="text-xs font-medium text-gray-400 dark:text-gray-500">Fecha y Hora Programada</p>
                                <p className="mt-0.5 text-sm font-medium text-gray-800 dark:text-gray-200">
                                    {new Date(inspection.scheduledDate).toLocaleString('es-PE', { dateStyle: 'full', timeStyle: 'short' })}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Observational & Execution Metrics Card */}
                    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                        <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
                            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <CustomIcon name="clipboard-check" size="xs" tone="mist" />
                                Avance Técnico y Hallazgos
                            </h3>
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                {inspection.status === 'finalizada' ? '100% Completado' : inspection.status === 'en_proceso' ? 'En Ejecución' : 'Pendiente'}
                            </span>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-3 text-center dark:border-emerald-900/30 dark:bg-emerald-900/10">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Leves</p>
                                <p className="mt-1 text-xl font-bold text-emerald-700 dark:text-emerald-300">0</p>
                            </div>
                            <div className="rounded-lg border border-amber-100 bg-amber-50/50 p-3 text-center dark:border-amber-900/30 dark:bg-amber-900/10">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Moderadas</p>
                                <p className="mt-1 text-xl font-bold text-amber-700 dark:text-amber-300">0</p>
                            </div>
                            <div className="rounded-lg border border-rose-100 bg-rose-50/50 p-3 text-center dark:border-rose-900/30 dark:bg-rose-900/10">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Graves</p>
                                <p className="mt-1 text-xl font-bold text-rose-700 dark:text-rose-300">0</p>
                            </div>
                        </div>
                    </div>

                    {/* Status Audit History Log */}
                    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                        <h3 className="mb-4 text-base font-bold text-gray-900 dark:text-white border-b border-gray-100 pb-3 dark:border-gray-800 flex items-center gap-2">
                            <CustomIcon name="clock" size="xs" tone="mist" />
                            Historial de Auditoría de Estados
                        </h3>

                        {!inspection.statusHistory || inspection.statusHistory.length === 0 ? (
                            <p className="text-xs text-gray-400 dark:text-gray-500 py-4 text-center">No hay registros previos de cambio de estado.</p>
                        ) : (
                            <div className="space-y-4">
                                {inspection.statusHistory.map((item, idx) => (
                                    <div key={item.id || idx} className="flex gap-3 text-xs">
                                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#17324a] text-white">
                                            <CustomIcon name="check-circle" size="xs" tone="white" />
                                        </div>
                                        <div className="min-w-0 flex-1 rounded-lg border border-gray-100 bg-gray-50/50 p-3 dark:border-gray-800 dark:bg-gray-800/40">
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-gray-900 dark:text-white capitalize">{inspectionStatusLabels[item.toStatus] || item.toStatus}</span>
                                                <span className="text-[10px] text-gray-400">{new Date(item.createdAt).toLocaleString('es-PE')}</span>
                                            </div>
                                            {item.reasonCode && (
                                                <p className="mt-1 font-medium text-amber-700 dark:text-amber-400">Motivo: {item.reasonCode}</p>
                                            )}
                                            {item.comment && (
                                                <p className="mt-1 text-gray-600 dark:text-gray-300">"{item.comment}"</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Side 4 Cols */}
                <div className="space-y-6 lg:col-span-4">
                    {/* Assigned Team Card */}
                    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                        <h3 className="mb-4 text-base font-bold text-gray-900 dark:text-white border-b border-gray-100 pb-3 dark:border-gray-800 flex items-center gap-2">
                            <CustomIcon name="user-gear" size="xs" tone="mist" />
                            Equipo Asignado
                        </h3>

                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#17324a] font-bold text-white text-xs">
                                    {inspectorName.slice(0, 2).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Inspector Asignado</p>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{inspectorName}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Location Card */}
                    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                        <h3 className="mb-3 text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <CustomIcon name="map-pin" size="xs" tone="mist" />
                            Dirección de Inspección
                        </h3>
                        <p className="text-xs text-gray-600 dark:text-gray-300 font-medium">{locationLabel}</p>
                    </div>
                </div>
            </div>

            {/* Status change modal */}
            {statusAction && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17324a]/25 px-4 backdrop-blur-sm">
                    <div className="card w-full max-w-md animate-in zoom-in-95 duration-200">
                        <div className="mb-5 flex items-center gap-3 border-b border-gray-100 pb-3 dark:border-gray-800">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#17324a] text-white">
                                <CustomIcon name={inspectionStatusIconMap[statusAction.status] ?? 'clipboard-check'} size="xs" tone="white" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{statusAction.label}</h3>
                        </div>
                        <div className="space-y-4">
                            {statusAction.requiresReason && (
                                <div>
                                    <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">Motivo</label>
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
                                <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">Comentario</label>
                                <textarea
                                    value={statusModal.comment}
                                    onChange={(e) => setStatusModal((prev) => ({ ...prev, comment: e.target.value }))}
                                    className="input min-h-[90px]"
                                    placeholder="Agregar comentario u observaciones..."
                                />
                            </div>
                            {statusAction.requiresSchedule && (
                                <div>
                                    <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">Nueva fecha y hora</label>
                                    <input
                                        type="datetime-local"
                                        value={statusModal.scheduledDate}
                                        onChange={(e) => setStatusModal((prev) => ({ ...prev, scheduledDate: e.target.value }))}
                                        className="input"
                                    />
                                </div>
                            )}
                            <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center sm:gap-4">
                                <label className="flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-300">
                                    <input
                                        type="checkbox"
                                        checked={statusModal.notifyClient}
                                        onChange={(e) => setStatusModal((prev) => ({ ...prev, notifyClient: e.target.checked }))}
                                        className="rounded border-gray-300 text-[#17324a]"
                                    />
                                    Notificar cliente
                                </label>
                                <label className="flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-300">
                                    <input
                                        type="checkbox"
                                        checked={statusModal.notifyInspector}
                                        onChange={(e) => setStatusModal((prev) => ({ ...prev, notifyInspector: e.target.checked }))}
                                        className="rounded border-gray-300 text-[#17324a]"
                                    />
                                    Notificar inspector
                                </label>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
                            <button onClick={closeStatusModal} className="btn btn-secondary flex-1 sm:flex-initial">Cancelar</button>
                            <button onClick={handleStatusChange} disabled={isUpdating} className="btn btn-primary flex-1 sm:flex-initial inline-flex items-center justify-center gap-2">
                                <CustomIcon name={isUpdating ? 'sync' : inspectionStatusIconMap[statusAction.status] ?? 'clipboard-check'} size="xs" tone="white" spin={isUpdating} />
                                {isUpdating ? 'Guardando...' : 'Confirmar'}
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
