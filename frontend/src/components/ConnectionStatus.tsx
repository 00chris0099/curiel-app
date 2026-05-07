import { useState } from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { CustomIcon, type CustomIconName } from './CustomIcon';

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

    const getStatusInfo = (): {
        label: string;
        compactLabel: string;
        color: string;
        icon: CustomIconName;
        tone: 'rose' | 'amber' | 'sage';
    } => {
        if (!isOnline) {
            return {
                label: 'Sin señal detectada',
                compactLabel: 'Sin señal',
                color: 'bg-red-50 text-red-800 border-red-100',
                icon: 'wifi-off',
                tone: 'rose',
            };
        }
        if (!manualOnlineEnabled) {
            return {
                label: 'Trabajando sin conexión',
                compactLabel: 'Offline',
                color: 'bg-amber-50 text-amber-800 border-amber-100',
                icon: 'warning-circle',
                tone: 'amber',
            };
        }
        return {
            label: 'Online activo',
            compactLabel: 'Online',
            color: 'bg-emerald-50 text-emerald-800 border-emerald-100',
            icon: 'wifi',
            tone: 'sage',
        };
    };

    const status = getStatusInfo();

    const handleSyncClick = () => {
        if (onSyncNow) {
            onSyncNow();
            setShowSynced(true);
            setTimeout(() => setShowSynced(false), 3000);
        }
    };

    return (
        <div className={`max-w-full min-w-0 rounded-[24px] border px-3 py-2.5 ${status.color}`}>
            <div className={`flex min-w-0 gap-3 ${isNavbarVariant ? 'items-center' : 'flex-col sm:flex-row sm:items-center sm:justify-between'}`}>
                <div className="flex min-w-0 items-center gap-2.5">
                    <CustomIcon name={status.icon} size={isNavbarVariant ? 'xs' : 'sm'} tone={status.tone} />
                    <div className="min-w-0">
                        <p className={`truncate font-semibold ${isNavbarVariant ? 'max-w-[4.8rem] text-xs sm:max-w-none sm:text-sm' : 'text-sm sm:text-base'}`}>
                            <span className="sm:hidden">{status.compactLabel}</span>
                            <span className="hidden sm:inline">{status.label}</span>
                        </p>
                        {pendingCount > 0 && !isNavbarVariant && (
                            <p className="hidden text-sm opacity-80 sm:block">{pendingCount} cambios pendientes</p>
                        )}
                        {pendingCount > 0 && isNavbarVariant && (
                            <p className="text-[11px] opacity-80 sm:hidden">{pendingCount} pend.</p>
                        )}
                    </div>
                </div>

                <div className={`flex items-center gap-2 ${isNavbarVariant ? 'ml-auto max-w-full flex-shrink-0' : 'flex-col sm:flex-row'}`}>
                    <div className="flex flex-shrink-0 items-center gap-2 rounded-full bg-white/80 px-2 py-1 ring-1 ring-black/5 sm:gap-2.5">
                        <span className="hidden text-xs font-semibold sm:inline">ON</span>
                        <button
                            type="button"
                            onClick={toggleManualOnline}
                            className={`relative inline-flex flex-shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${isNavbarVariant ? 'h-5 w-9' : 'h-6 w-11'} ${
                                manualOnlineEnabled
                                    ? 'bg-emerald-600 focus:ring-emerald-500'
                                    : 'bg-slate-300 focus:ring-slate-400'
                            }`}
                            role="switch"
                            aria-checked={manualOnlineEnabled}
                            aria-label="Cambiar modo online u offline"
                        >
                            <span
                                className={`inline-block rounded-full bg-white transition-transform duration-200 ${isNavbarVariant ? 'h-3.5 w-3.5' : 'h-4 w-4'} ${
                                    manualOnlineEnabled
                                        ? isNavbarVariant ? 'translate-x-5' : 'translate-x-6'
                                        : 'translate-x-1'
                                }`}
                            />
                        </button>
                        <span className="hidden text-xs font-semibold sm:inline">OFF</span>
                    </div>

                    {showSyncButton && onSyncNow && pendingCount > 0 && effectiveOnline && (
                        <button
                            type="button"
                            onClick={handleSyncClick}
                            disabled={isSyncing}
                            className={`btn btn-secondary flex items-center justify-center gap-2 ${isNavbarVariant ? 'px-2.5 py-2 text-xs' : ''}`}
                        >
                            {isSyncing ? (
                                <>
                                    <CustomIcon name="sync" size="xs" tone="blue" spin />
                                    <span className="hidden sm:inline">Sincronizando...</span>
                                    <span className="sm:hidden">Sync</span>
                                </>
                            ) : showSynced ? (
                                <>
                                    <CustomIcon name="cloud" size="xs" tone="sage" />
                                    <span className="hidden sm:inline">Sincronizado</span>
                                    <span className="sm:hidden">OK</span>
                                </>
                            ) : (
                                <>
                                    <CustomIcon name="cloud-upload" size="xs" tone="cream" />
                                    <span className="hidden sm:inline">Sincronizar ahora</span>
                                    <span className="sm:hidden">Sync</span>
                                </>
                            )}
                        </button>
                    )}

                    {!effectiveOnline && isOnline && !manualOnlineEnabled && (
                        <span className={`inline-flex items-center gap-2 opacity-80 ${isNavbarVariant ? 'hidden text-xs sm:inline-flex' : 'hidden text-sm sm:inline-flex'}`}>
                            <CustomIcon name="database" size="xs" tone="mist" />
                            Usando datos offline
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ConnectionStatus;
