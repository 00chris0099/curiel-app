import { Wifi, WifiOff, AlertTriangle, Loader2, Save } from 'lucide-react';
import { useState } from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface ConnectionStatusProps {
    pendingCount?: number;
    onSyncNow?: () => void;
    isSyncing?: boolean;
}

const ConnectionStatus = ({ pendingCount = 0, onSyncNow, isSyncing = false }: ConnectionStatusProps) => {
    const { isOnline, isForcedOffline, effectiveOnline, toggleForcedOffline } = useOnlineStatus();
    const [showSynced, setShowSynced] = useState(false);

    const status = isForcedOffline
        ? { label: 'Offline simulado 🧪', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200', icon: AlertTriangle }
        : !isOnline
        ? { label: 'Offline ❌', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200', icon: WifiOff }
        : { label: 'Online ✅', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200', icon: Wifi };

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
                    {onSyncNow && pendingCount > 0 && effectiveOnline && (
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

                    {isForcedOffline ? (
                        <button
                            type="button"
                            onClick={toggleForcedOffline}
                            className="btn btn-secondary flex items-center justify-center gap-2"
                        >
                            Volver online
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={toggleForcedOffline}
                            className="btn btn-secondary flex items-center justify-center gap-2"
                        >
                            Simular offline
                        </button>
                    )}

                    {!isForcedOffline && !effectiveOnline && (
                        <span className="text-sm opacity-80">Sin conexión detectada</span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ConnectionStatus;
