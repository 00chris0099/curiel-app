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
        <div className="space-y-3">
            {/* Top row: back + title + actions */}
            <div className="flex items-center gap-2 sm:gap-3">
                <button
                    type="button"
                    onClick={() => navigate(`/inspections/${inspectionId}`)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:border-gray-700 dark:hover:bg-gray-800 sm:h-11 sm:w-11"
                >
                    <CustomIcon name="arrow-left" size="xs" tone="mist" />
                </button>

                <div className="min-w-0 flex-1">
                    <h1 className="truncate text-base font-bold leading-tight sm:text-xl lg:text-2xl">{projectName}</h1>
                </div>

                {/* Action buttons — icon-only on mobile */}
                <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                    {canDownloadReport && (
                        <button
                            type="button"
                            onClick={onDownloadReport}
                            disabled={isDownloadingReport}
                            title="Generar informe"
                            className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white transition-colors hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800 sm:h-11 sm:w-11 sm:border-0 sm:bg-transparent sm:hover:bg-gray-100"
                        >
                            <CustomIcon name={isDownloadingReport ? 'sync' : 'file-pdf'} size="xs" tone="cream" spin={isDownloadingReport} />
                        </button>
                    )}

                    {canComplete && (
                        <button
                            type="button"
                            onClick={onComplete}
                            disabled={busyAction === 'complete-inspection'}
                            title="Enviar a revisión"
                            className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#17324a] text-white transition-colors hover:bg-[#1d3d5c] dark:bg-primary-600 dark:hover:bg-primary-700 sm:h-11 sm:w-11 sm:rounded-2xl sm:px-4 sm:w-auto sm:gap-2"
                        >
                            {busyAction === 'complete-inspection' ? (
                                <CustomIcon name="sync" size="xs" tone="white" spin />
                            ) : (
                                <CustomIcon name="seal-check" size="xs" tone="white" />
                            )}
                            <span className="hidden sm:inline">Enviar a revisión</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Meta row: status + date — compact */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 sm:gap-2">
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ${
                    status === 'en_proceso' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                        : status === 'lista_revision' ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                            : 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                }`}>
                    <CustomIcon name={inspectionStatusLabels[status as keyof typeof inspectionStatusLabels] ? 'check-circle' : 'clipboard-check'} size="xs" tone={status === 'en_proceso' ? 'sage' : status === 'lista_revision' ? 'amber' : 'blue'} />
                    {inspectionStatusLabels[status as keyof typeof inspectionStatusLabels] || status}
                </span>
                <span className="hidden text-gray-300 sm:inline">·</span>
                <span className="hidden truncate text-gray-400 sm:inline">{clientName}</span>
                <span className="hidden text-gray-300 sm:inline">·</span>
                <span className="hidden truncate text-gray-400 sm:inline">{locationLabel}</span>
                <span className="hidden text-gray-300 sm:inline">·</span>
                <span className="hidden sm:inline">{new Date(scheduledDate).toLocaleString('es-PE')}</span>
                <span className="sm:hidden">{new Date(scheduledDate).toLocaleDateString('es-PE')}</span>
            </div>
        </div>
    );
};
