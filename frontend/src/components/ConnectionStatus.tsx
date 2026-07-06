import { useState } from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { CustomIcon } from './CustomIcon';

interface ConnectionStatusProps {
    pendingCount?: number;
    onSyncNow?: () => void;
    isSyncing?: boolean;
    showSyncButton?: boolean;
    variant?: 'page' | 'navbar';
}

const ConnectionStatus = ({ pendingCount = 0, onSyncNow, isSyncing = false, showSyncButton = true, variant = 'page' }: ConnectionStatusProps) => {
    const { isOnline, manualOnlineEnabled, effectiveOnline, toggleManualOnline } = useOnlineStatus();
    const [showSynced, setShowSynced] = useState(false);
    const isNavbarVariant = variant === 'navbar';

    const getDotColor = () => {
        if (!isOnline) return 'bg-red-500';
        if (!manualOnlineEnabled) return 'bg-amber-400';
        return 'bg-emerald-500';
    };

    const getDotLabel = () => {
        if (!isOnline) return 'Sin señal';
        if (!manualOnlineEnabled) return 'Offline';
        return 'Online';
    };

    const handleSyncClick = () => {
        if (onSyncNow) {
            onSyncNow();
            setShowSynced(true);
            setTimeout(() => setShowSynced(false), 3000);
        }
    };

    // MOBILE: ultra-compact dot indicator
    if (isNavbarVariant) {
        return (
            <div className="flex items-center gap-2">
                {/* Dot — visible only on mobile */}
                <div className="relative sm:hidden" title={getDotLabel()}>
                    <span className={`block h-2.5 w-2.5 rounded-full ${getDotColor()} shadow-[0_0_6px_rgba(0,0,0,0.15)]`} />
                </div>

                {/* Full banner — visible on desktop */}
                <div className="hidden max-w-full min-w-0 rounded-[24px] border px-3 py-2.5 sm:block bg-emerald-50 text-emerald-800 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800/50">
                    <div className="flex min-w-0 items-center gap-2.5">
                        <CustomIcon name="wifi" size="xs" tone="sage" />
                        <div className="min-w-0">
                            <p className="truncate text-xs font-semibold sm:text-sm">Online activo</p>
                            {pendingCount > 0 && (
                                <p className="text-[11px] opacity-80">{pendingCount} pend.</p>
                            )}
                        </div>
                        <div className="ml-auto flex items-center gap-2">
                            <div className="flex items-center gap-2 rounded-full bg-white/80 px-2 py-1 ring-1 ring-black/5 dark:bg-slate-800/80 dark:ring-white/10">
                                <span className="text-xs font-semibold">ON</span>
                                <button
                                    type="button"
                                    onClick={toggleManualOnline}
                                    className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                                        manualOnlineEnabled
                                            ? 'bg-emerald-600 focus:ring-emerald-500'
                                            : 'bg-slate-300 focus:ring-slate-400'
                                    }`}
                                    role="switch"
                                    aria-checked={manualOnlineEnabled}
                                >
                                    <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform duration-200 ${manualOnlineEnabled ? 'translate-x-5' : 'translate-x-1'}`} />
                                </button>
                                <span className="text-xs font-semibold">OFF</span>
                            </div>
                            {showSyncButton && onSyncNow && pendingCount > 0 && effectiveOnline && (
                                <button type="button" onClick={handleSyncClick} disabled={isSyncing} className="btn btn-secondary flex items-center justify-center gap-2 px-2.5 py-2 text-xs">
                                    {isSyncing ? (
                                        <><CustomIcon name="sync" size="xs" tone="blue" spin /><span>Sync</span></>
                                    ) : showSynced ? (
                                        <><CustomIcon name="cloud" size="xs" tone="sage" /><span>OK</span></>
                                    ) : (
                                        <><CustomIcon name="cloud-upload" size="xs" tone="cream" /><span>Sync</span></>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // PAGE variant: dot on mobile, full banner on desktop
    return (
        <>
            {/* Mobile: single dot */}
            <div className="sm:hidden" title={getDotLabel()}>
                <span className={`block h-3 w-3 rounded-full ${getDotColor()} shadow-[0_0_8px_rgba(0,0,0,0.15)]`} />
            </div>

            {/* Desktop: full banner */}
            <div className="hidden max-w-full min-w-0 rounded-[24px] border px-3 py-2.5 sm:block bg-emerald-50 text-emerald-800 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800/50">
                <div className="flex min-w-0 items-center gap-3 sm:justify-between">
                    <div className="flex min-w-0 items-center gap-2.5">
                        <CustomIcon name="wifi" size="sm" tone="sage" />
                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">Online activo</p>
                            {pendingCount > 0 && (
                                <p className="text-sm opacity-80">{pendingCount} cambios pendientes</p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 rounded-full bg-white/80 px-2 py-1 ring-1 ring-black/5 dark:bg-slate-800/80 dark:ring-white/10 sm:gap-2.5">
                            <span className="text-xs font-semibold">ON</span>
                            <button
                                type="button"
                                onClick={toggleManualOnline}
                                className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                                    manualOnlineEnabled
                                        ? 'bg-emerald-600 focus:ring-emerald-500'
                                        : 'bg-slate-300 focus:ring-slate-400'
                                }`}
                                role="switch"
                                aria-checked={manualOnlineEnabled}
                            >
                                <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform duration-200 ${manualOnlineEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                            <span className="text-xs font-semibold">OFF</span>
                        </div>
                        {showSyncButton && onSyncNow && pendingCount > 0 && effectiveOnline && (
                            <button type="button" onClick={handleSyncClick} disabled={isSyncing} className="btn btn-secondary flex items-center justify-center gap-2">
                                {isSyncing ? (
                                    <><CustomIcon name="sync" size="xs" tone="blue" spin /><span>Sincronizando...</span></>
                                ) : showSynced ? (
                                    <><CustomIcon name="cloud" size="xs" tone="sage" /><span>Sincronizado</span></>
                                ) : (
                                    <><CustomIcon name="cloud-upload" size="xs" tone="cream" /><span>Sincronizar ahora</span></>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default ConnectionStatus;
