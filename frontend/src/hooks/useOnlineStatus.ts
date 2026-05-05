import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'curiel-manual-offline-mode';

export const useOnlineStatus = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [manualOfflineMode, setManualOfflineMode] = useState(() => {
        try {
            return localStorage.getItem(STORAGE_KEY) === 'true';
        } catch {
            return false;
        }
    });

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const effectiveOnline = isOnline && !manualOfflineMode;

    const toggleManualOffline = useCallback(() => {
        setManualOfflineMode(prev => {
            const next = !prev;
            try {
                localStorage.setItem(STORAGE_KEY, String(next));
            } catch {}
            return next;
        });
    }, []);

    const setManualOffline = useCallback((value: boolean) => {
        setManualOfflineMode(value);
        try {
            localStorage.setItem(STORAGE_KEY, String(value));
        } catch {}
    }, []);

    return {
        isOnline,
        manualOfflineMode,
        effectiveOnline,
        toggleManualOffline,
        setManualOffline,
    };
};
