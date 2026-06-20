import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { syncQueueRepo } from '../database/syncQueue.repo';
import { conflictsRepo } from '../database/conflicts.repo';
import { inspectionsRepo } from '../database/inspections.repo';
import { runSync } from '../services/syncEngine';
import config from '../config';

const OfflineContext = createContext({});

export const OfflineProvider = ({ children }) => {
    const [isOnline, setIsOnline] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [pendingCount, setPendingCount] = useState(0);
    const [conflictCount, setConflictCount] = useState(0);
    const [lastSyncAt, setLastSyncAt] = useState(null);
    const syncIntervalRef = useRef(null);

    const refreshCounts = useCallback(async () => {
        try {
            const pending = await syncQueueRepo.getCount();
            setPendingCount(pending);
            const conflicts = await conflictsRepo.getCount();
            setConflictCount(conflicts);
        } catch {
            // DB may not be initialized yet
        }
    }, []);

    const processAutoComplete = useCallback(async () => {
        try {
            const ready = await inspectionsRepo.getReadyToComplete();
            for (const insp of ready) {
                await inspectionsRepo.upsert({
                    ...insp,
                    status: 'lista_revision',
                    readyToComplete: false,
                    is_dirty: 1,
                    local_updated_at: new Date().toISOString()
                });
                await syncQueueRepo.add({
                    operation: 'update',
                    entity: 'inspection',
                    entityId: insp.id,
                    payload: { id: insp.id, status: 'lista_revision' }
                });
            }
        } catch {
            // DB may not be initialized
        }
    }, []);

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener((state) => {
            const online = state.isConnected && state.isInternetReachable !== false;
            setIsOnline(online);
            if (online) {
                refreshCounts();
            }
        });

        return () => unsubscribe();
    }, [refreshCounts]);

    useEffect(() => {
        refreshCounts();
        syncIntervalRef.current = setInterval(async () => {
            await refreshCounts();
            // Auto-sync if online and there are pending items
            const pending = await syncQueueRepo.getCount();
            if (pending > 0) {
                await syncNow();
            }
        }, config.SYNC_INTERVAL_MS);
        return () => {
            if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
        };
    }, [refreshCounts, syncNow]);

    const syncNow = useCallback(async () => {
        if (isSyncing) return;
        setIsSyncing(true);
        try {
            await processAutoComplete();
            await runSync();
            setLastSyncAt(new Date().toISOString());
            await refreshCounts();
        } catch (error) {
            console.error('Sync error:', error);
        } finally {
            setIsSyncing(false);
        }
    }, [isSyncing, refreshCounts, processAutoComplete]);

    const autoSyncOnReconnect = useCallback(async () => {
        const pending = await syncQueueRepo.getCount();
        if (pending > 0) {
            await syncNow();
        }
    }, [syncNow]);

    useEffect(() => {
        if (isOnline) {
            autoSyncOnReconnect();
        }
    }, [isOnline, autoSyncOnReconnect]);

    const value = {
        isOnline,
        isSyncing,
        pendingCount,
        conflictCount,
        lastSyncAt,
        syncNow,
        refreshCounts
    };

    return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
};

export const useOffline = () => {
    const context = useContext(OfflineContext);
    if (!context || Object.keys(context).length === 0) {
        throw new Error('useOffline debe usarse dentro de OfflineProvider');
    }
    return context;
};

export default OfflineContext;
