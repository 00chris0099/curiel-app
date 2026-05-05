import { Wifi, WifiOff, AlertTriangle, Loader2, Save, Database } from 'lucide-react';
import { useState } from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface ConnectionStatusProps {
    pendingCount?: number;
    onSyncNow?: () => void;
    isSyncing?: boolean;
    showSyncButton?: boolean;
}

const ConnectionStatus = ({ pendingCount = 0, onSyncNow, isSyncing = false, showSyncButton = true }: ConnectionStatusProps) => {
    const { isOnline, manualOnlineEnabled, effectiveOnline, toggleManualOnline } = useOnlineStatus();
    const [showSynced, setShowSynced] = useState(false);

    const getStatusInfo = () => {
        if (!isOnline) {
            return {
                label: 'Sin señal detectada',
                color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
                icon: WifiOff,
            };
        }
        if (!manualOnlineEnabled) {
            return {
                label: 'Trabajando sin conexión',
                color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
                icon: AlertTriangle,
            };
        }
        return {
            label: 'Online activo',
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
        <div className={`rounded-2xl border px-4 py-3 ${status.color}`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5" />
                    <div>
                        <p className="font-semibold">{status.label}</p>
                        {pendingCount > 0 && (
                            <p className="text-sm opacity-80">{pendingCount} cambios pendientes</p>
                        )}
                    </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    {/* ON/OFF Switch */}
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">ON</span>
                        <button
                            type="button"
                            onClick={toggleManualOnline}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                                manualOnlineEnabled
                                    ? 'bg-emerald-600 focus:ring-emerald-500'
                                    : 'bg-gray-300 dark:bg-gray-600 focus:ring-gray-400'
                            }`}
                            role="switch"
                            aria-checked={manualOnlineEnabled}
                            aria-label="Cambiar modo online/offline"
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                                    manualOnlineEnabled ? 'translate-x-6' : 'translate-x-1'
                                }`}
                            />
                        </button>
                        <span className="text-sm font-medium">OFF</span>
                    </div>

                    {/* Sync Button */}
                    {showSyncButton && onSyncNow && pendingCount > 0 && effectiveOnline && (
                        <button
                            type="button"
                            onClick={handleSyncClick}
                            disabled={isSyncing}
                            className="btn btn-secondary flex items-center justify-center gap-2"
                        >
                            {isSyncing ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Sincronizando...
                                </>
                            ) : showSynced ? (
                                '¡Sincronizado!'
                            ) : (
                                <>
                                    <Save className="h-4 w-4" />
                                    Sincronizar ahora
                                </>
                            )}
                        </button>
                    )}

                    {/* Offline data indicator */}
                    {!effectiveOnline && isOnline && !manualOnlineEnabled && (
                        <span className="inline-flex items-center gap-1 text-sm opacity-80">
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
