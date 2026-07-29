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
    canComplete: _canComplete,
    busyAction: _busyAction,
    onComplete: _onComplete,
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
        </div>
    );
};
