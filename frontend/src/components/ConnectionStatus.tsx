import { Wifi, WifiOff, AlertTriangle, Loader2, Save, Database } from 'lucide-react';
import { useState } from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

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

    const getStatusInfo = () => {
        if (!isOnline) {
            return {
                label: 'Sin señal detectada',
                compactLabel: 'Sin señal',
                color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
                icon: WifiOff,
            };
        }
        if (!manualOnlineEnabled) {
            return {
                label: 'Trabajando sin conexión',
                compactLabel: 'Offline',
                color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
                icon: AlertTriangle,
            };
        }
        return {
            label: 'Online activo',
            compactLabel: 'Online',
            color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200',
            icon: Wifi,
        };
    };

    const status = getStatusInfo();
    const Icon = status.icon;

    const handleSyncClick = () => {
        if (onSyncNow) {
            onSyncNow();
            setShowSynced(true);
            setTimeout(() => setShowSynced(false), 3000);
        }
    };

    return (
        <div className={`max-w-full min-w-0 rounded-2xl border ${isNavbarVariant ? 'px-2.5 py-2 sm:px-3' : 'px-4 py-3'} ${status.color}`}>
            <div className={`flex min-w-0 gap-3 ${isNavbarVariant ? 'items-center' : 'flex-col sm:flex-row sm:items-center sm:justify-between'}`}>
                <div className="flex min-w-0 items-center gap-2.5">
                    <Icon className={`${isNavbarVariant ? 'h-4 w-4 flex-shrink-0' : 'h-5 w-5 flex-shrink-0'}`} />
                    <div className="min-w-0">
                        <p className={`truncate font-semibold ${isNavbarVariant ? 'max-w-[4.75rem] text-xs sm:max-w-none sm:text-sm' : 'text-sm sm:text-base'}`}>
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
                    <div className="flex flex-shrink-0 items-center gap-1.5 sm:gap-2">
                        <span className="hidden text-xs font-medium sm:inline">ON</span>
                        <button
                            type="button"
                            onClick={toggleManualOnline}
                            className={`relative inline-flex flex-shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${isNavbarVariant ? 'h-5 w-9' : 'h-6 w-11'} ${
                                manualOnlineEnabled
                                    ? 'bg-emerald-600 focus:ring-emerald-500'
                                    : 'bg-gray-300 dark:bg-gray-600 focus:ring-gray-400'
                            }`}
                            role="switch"
                            aria-checked={manualOnlineEnabled}
                            aria-label="Cambiar modo online/offline"
                        >
                            <span
                                className={`inline-block rounded-full bg-white transition-transform duration-200 ${isNavbarVariant ? 'h-3.5 w-3.5' : 'h-4 w-4'} ${
                                    manualOnlineEnabled
                                        ? isNavbarVariant ? 'translate-x-5' : 'translate-x-6'
                                        : 'translate-x-1'
                                }`}
                            />
                        </button>
                        <span className="hidden text-xs font-medium sm:inline">OFF</span>
                    </div>

                    {showSyncButton && onSyncNow && pendingCount > 0 && effectiveOnline && (
                        <button
                            type="button"
                            onClick={handleSyncClick}
                            disabled={isSyncing}
                            className={`btn btn-secondary flex items-center justify-center gap-2 ${isNavbarVariant ? 'px-2 py-1.5 text-xs' : ''}`}
                        >
                            {isSyncing ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span className="hidden sm:inline">Sincronizando...</span>
                                    <span className="sm:hidden">Sync</span>
                                </>
                            ) : showSynced ? (
                                <>
                                    <span className="hidden sm:inline">Sincronizado</span>
                                    <span className="sm:hidden">OK</span>
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4" />
                                    <span className="hidden sm:inline">Sincronizar ahora</span>
                                    <span className="sm:hidden">Sync</span>
                                </>
                            )}
                        </button>
                    )}

                    {!effectiveOnline && isOnline && !manualOnlineEnabled && (
                        <span className={`inline-flex items-center gap-1 opacity-80 ${isNavbarVariant ? 'hidden text-xs sm:inline-flex' : 'hidden text-sm sm:inline-flex'}`}>
                            <Database className="h-4 w-4" />
                            Usando datos offline
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ConnectionStatus;
