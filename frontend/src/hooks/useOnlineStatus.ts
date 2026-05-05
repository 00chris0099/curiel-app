import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'curiel-manual-online-enabled';

export const useOnlineStatus = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [manualOnlineEnabled, setManualOnlineEnabled] = useState(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored === null ? true : stored === 'true';
        } catch {
            return true;
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

    const effectiveOnline = isOnline && manualOnlineEnabled;

    const setManualOnline = useCallback((enabled: boolean) => {
        setManualOnlineEnabled(enabled);
        try {
            localStorage.setItem(STORAGE_KEY, String(enabled));
        } catch {}
    }, []);

    const toggleManualOnline = useCallback(() => {
        setManualOnlineEnabled(prev => {
            const next = !prev;
            try {
                localStorage.setItem(STORAGE_KEY, String(next));
            } catch {}
            return next;
        });
    }, []);

    return {
        isOnline,
        manualOnlineEnabled,
        effectiveOnline,
        toggleManualOnline,
        setManualOnline,
    };
};
