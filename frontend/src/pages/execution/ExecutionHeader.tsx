import { useNavigate } from 'react-router-dom';
import { CustomIcon } from '../../components/CustomIcon';
import { inspectionStatusLabels } from '../../utils/inspectionStatus';

type ExecutionHeaderProps = {
    inspectionId: string;
    projectName: string;
    clientName: string;
    scheduledDate: string;
    status: string;
    locationLabel: string;
    canDownloadReport: boolean;
    canComplete: boolean;
    isDownloadingReport: boolean;
    busyAction: string | null;
    onDownloadReport: () => void;
    onComplete: () => void;
};

export const ExecutionHeader = ({
    inspectionId,
    projectName,
    clientName,
    scheduledDate,
    status,
    locationLabel,
    canDownloadReport,
    canComplete,
    isDownloadingReport,
    busyAction,
    onDownloadReport,
    onComplete,
}: ExecutionHeaderProps) => {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-3 sm:gap-4">
                <button
                    type="button"
                    onClick={() => navigate(`/inspections/${inspectionId}`)}
                    className="min-h-11 shrink-0 rounded-xl border border-gray-200 bg-white p-2 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:border-gray-700 dark:hover:bg-gray-800"
                >
                    <CustomIcon name="arrow-left" size="sm" tone="mist" />
                </button>

                <div className="min-w-0 max-w-3xl">
                    <h1 className="text-xl font-bold leading-tight sm:text-2xl">{projectName}</h1>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <span>{clientName}</span>
                        <span>·</span>
                        <span>{locationLabel}</span>
                        <span>·</span>
                        <span>{new Date(scheduledDate).toLocaleString('es-PE')}</span>
                        <span className={`badge badge-sm ${status === 'en_proceso' ? 'badge-success' : status === 'lista_revision' ? 'badge-warning' : 'badge-info'}`}>
                            {inspectionStatusLabels[status as keyof typeof inspectionStatusLabels] || status}
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap gap-2">
                {canDownloadReport && (
                    <button
                        type="button"
                        onClick={onDownloadReport}
                        disabled={isDownloadingReport}
                        className="btn btn-secondary flex items-center justify-center gap-2"
                    >
                        <CustomIcon name={isDownloadingReport ? 'sync' : 'file-pdf'} size="xs" tone="cream" spin={isDownloadingReport} />
                        {isDownloadingReport ? 'Generando...' : 'Generar informe'}
                    </button>
                )}

                {canComplete && (
                    <button
                        type="button"
                        onClick={onComplete}
                        disabled={busyAction === 'complete-inspection'}
                        className="btn btn-primary flex items-center justify-center gap-2"
                    >
                        {busyAction === 'complete-inspection' ? <CustomIcon name="sync" size="xs" tone="white" spin /> : <CustomIcon name="seal-check" size="xs" tone="white" />}
                        Enviar a revisión
                    </button>
                )}
            </div>
        </div>
    );
};
