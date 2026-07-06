import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface ConnectionStatusProps {
    pendingCount?: number;
    onSyncNow?: () => void;
    isSyncing?: boolean;
    showSyncButton?: boolean;
    variant?: 'page' | 'navbar';
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ConnectionStatus = (_props: ConnectionStatusProps) => {
    const { manualOnlineEnabled, toggleManualOnline } = useOnlineStatus();

    return (
        <button
            type="button"
            onClick={toggleManualOnline}
            className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                manualOnlineEnabled
                    ? 'bg-emerald-500 focus:ring-emerald-400'
                    : 'bg-gray-300 dark:bg-gray-600 focus:ring-gray-400'
            }`}
            role="switch"
            aria-checked={manualOnlineEnabled}
            aria-label="Modo online/offline"
        >
            <span
                className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                    manualOnlineEnabled ? 'translate-x-[18px]' : 'translate-x-[3px]'
                }`}
            />
        </button>
    );
};

export default ConnectionStatus;
