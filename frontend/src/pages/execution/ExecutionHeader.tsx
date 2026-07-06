import { useNavigate } from 'react-router-dom';
import { CustomIcon } from '../../components/CustomIcon';

type ExecutionHeaderProps = {
    projectName: string;
    canComplete: boolean;
    busyAction: string | null;
    onComplete: () => void;
};

export const ExecutionHeader = ({
    projectName,
    canComplete,
    busyAction,
    onComplete,
}: ExecutionHeaderProps) => {
    const navigate = useNavigate();

    return (
        <div className="flex items-center gap-3">
            <button
                type="button"
                onClick={() => navigate('/inspections')}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
            >
                <CustomIcon name="arrow-left" size="xs" tone="mist" />
            </button>

            <h1 className="min-w-0 flex-1 truncate text-base font-bold text-gray-900 dark:text-white sm:text-lg">{projectName}</h1>

            {canComplete && (
                <button
                    type="button"
                    onClick={onComplete}
                    disabled={busyAction === 'complete-inspection'}
                    title="Enviar a revisión"
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#17324a] text-white transition-colors hover:bg-[#1d3d5c] dark:bg-primary-600 dark:hover:bg-primary-700"
                >
                    {busyAction === 'complete-inspection' ? (
                        <CustomIcon name="sync" size="xs" tone="white" spin />
                    ) : (
                        <CustomIcon name="seal-check" size="xs" tone="white" />
                    )}
                </button>
            )}
        </div>
    );
};
