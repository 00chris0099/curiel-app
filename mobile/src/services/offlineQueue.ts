import { addToSyncQueue } from './syncEngine';
import { inspectionsRepo } from '../database/inspections.repo';
import { areasRepo } from '../database/areas.repo';
import { observationsRepo } from '../database/observations.repo';

export const offlineQueue = {
    saveInspection: async (inspectionData, isOnline) => {
        const now = new Date().toISOString();
        const data = {
            ...inspectionData,
            is_dirty: 1,
            local_updated_at: now
        };

        await inspectionsRepo.upsert(data);

        if (isOnline) {
            try {
                const { inspectionService } = await import('./api');
                const result = await inspectionService.update(inspectionData.id, inspectionData);
                if (result.success) {
                    await inspectionsRepo.markSynced(inspectionData.id, result.data.inspection.updatedAt);
                    return { synced: true };
                }
            } catch {
                // Fall through to queue
            }
        }

        await addToSyncQueue('update', 'inspection', inspectionData.id, inspectionData);
        return { synced: false, queued: true };
    },

    createInspection: async (inspectionData, isOnline) => {
        const now = new Date().toISOString();
        const data = {
            ...inspectionData,
            is_dirty: 1,
            local_updated_at: now
        };

        await inspectionsRepo.upsert(data);

        if (isOnline) {
            try {
                const { inspectionService } = await import('./api');
                const result = await inspectionService.create(inspectionData);
                if (result.success) {
                    await inspectionsRepo.markSynced(inspectionData.id, result.data.inspection.updatedAt);
                    return { synced: true, data: result.data.inspection };
                }
            } catch {
                // Fall through to queue
            }
        }

        await addToSyncQueue('create', 'inspection', inspectionData.id, inspectionData);
        return { synced: false, queued: true };
    },

    saveArea: async (inspectionId, areaData, isOnline) => {
        const now = new Date().toISOString();
        const data = {
            ...areaData,
            inspectionId,
            is_dirty: 1,
            local_updated_at: now
        };

        await areasRepo.upsert(data);

        if (isOnline) {
            try {
                const { inspectionService } = await import('./api');
                await inspectionService.update(inspectionId, { areas: [data] });
                await areasRepo.markSynced(areaData.id);
                return { synced: true };
            } catch {
                // Fall through
            }
        }

        await addToSyncQueue('update', 'area', areaData.id, data);
        return { synced: false, queued: true };
    },

    saveObservation: async (inspectionId, obsData, isOnline) => {
        const now = new Date().toISOString();
        const data = {
            ...obsData,
            inspectionId,
            is_dirty: 1,
            local_updated_at: now
        };

        await observationsRepo.upsert(data);

        if (isOnline) {
            try {
                const { inspectionService } = await import('./api');
                await inspectionService.update(inspectionId, { observations: [data] });
                await observationsRepo.markSynced(obsData.id);
                return { synced: true };
            } catch {
                // Fall through
            }
        }

        await addToSyncQueue('update', 'observation', obsData.id, data);
        return { synced: false, queued: true };
    },

    savePhoto: async (photoData, isOnline) => {
        const now = new Date().toISOString();
        const data = {
            ...photoData,
            is_dirty: 1,
            local_updated_at: now
        };

        await (await import('../database/photos.repo')).photosRepo.upsert(data);

        if (isOnline) {
            try {
                const { photoService } = await import('./api');
                if (photoData.localPath) {
                    const result = await photoService.upload(
                        photoData.localPath,
                        photoData.inspectionId,
                        photoData.observationId,
                        photoData.caption
                    );
                    if (result.success) {
                        await (await import('../database/photos.repo')).photosRepo.updateUploadStatus(
                            photoData.id, 'uploaded', result.data.url
                        );
                        return { synced: true };
                    }
                }
            } catch {
                // Fall through
            }
        }

        await addToSyncQueue('create', 'photo', photoData.id, data);
        return { synced: false, queued: true };
    }
};
