import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface ConnectionStatusProps {
    pendingCount?: number;
    onSyncNow?: () => void;
    isSyncing?: boolean;
    showSyncButton?: boolean;
    variant?: 'page' | 'navbar';
}

const ConnectionStatus = ({ pendingCount, onSyncNow, isSyncing }: ConnectionStatusProps) => {
    const { manualOnlineEnabled, toggleManualOnline } = useOnlineStatus();

    return (
        <div className="flex items-center gap-2">
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
            {pendingCount && pendingCount > 0 && onSyncNow && (
                <button
                    type="button"
                    onClick={onSyncNow}
                    disabled={isSyncing}
                    className="flex items-center gap-1 rounded-lg bg-amber-100 px-2 py-1 text-[10px] font-semibold text-amber-700 transition-colors hover:bg-amber-200 disabled:opacity-50 dark:bg-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-900/50"
                >
                    {isSyncing ? (
                        <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                    ) : (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" />
                        </svg>
                    )}
                    Sync
                </button>
            )}
        </div>
    );
};

export default ConnectionStatus;
