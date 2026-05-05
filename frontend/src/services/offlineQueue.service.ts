import {
    addSyncQueueItem,
    getPendingQueueItems,
    updateSyncQueueItem,
    removeSyncQueueItem,
    getPendingQueueCount,
} from '../utils/offlineDb';
import type {
    OfflineSyncItem,
    OfflineSyncItemPayload,
    OfflineEntityType,
    OfflineEntityAction,
} from '../utils/offlineDb';

export type { OfflineSyncItem as PendingChange };

export const enqueueChange = async (
    change: {
        inspectionId: string;
        entityType: OfflineEntityType;
        action: OfflineEntityAction;
        payload: any;
    } & OfflineSyncItemPayload
) => {
    return addSyncQueueItem({
        ...change,
        syncStatus: 'pending',
        errorMessage: null,
    });
};

export const getPendingChanges = async (inspectionId?: string): Promise<OfflineSyncItem[]> => {
    return getPendingQueueItems(inspectionId);
};

export const markChangeSynced = async (id: string) => {
    return updateSyncQueueItem(id, { syncStatus: 'synced', errorMessage: null });
};

export const markChangeFailed = async (id: string, error: string) => {
    return updateSyncQueueItem(id, { syncStatus: 'failed', errorMessage: error });
};

export const clearSyncedChanges = async () => {
    const db = await (await import('../utils/offlineDb')).dbPromise;
    const syncedItems = (await db.getAll('syncQueue')).filter(item => item.syncStatus === 'synced');
    for (const item of syncedItems) {
        await removeSyncQueueItem(item.id);
    }
};

export const getPendingCount = async (inspectionId?: string): Promise<number> => {
    return getPendingQueueCount(inspectionId);
};
