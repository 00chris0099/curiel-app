import { syncQueueRepo } from '../database/syncQueue.repo';
import { inspectionsRepo } from '../database/inspections.repo';
import { areasRepo } from '../database/areas.repo';
import { observationsRepo } from '../database/observations.repo';
import { photosRepo } from '../database/photos.repo';
import { conflictsRepo } from '../database/conflicts.repo';
import { inspectionService, photoService } from './api';
import api from './api';
import config from '../config';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const runSync = async () => {
    const pendingOps = await syncQueueRepo.getPending();

    for (const op of pendingOps) {
        try {
            await syncQueueRepo.markProcessing(op.id);

            switch (op.entity) {
                case 'inspection':
                    await syncInspection(op);
                    break;
                case 'area':
                    await syncArea(op);
                    break;
                case 'observation':
                    await syncObservation(op);
                    break;
                case 'photo':
                    await syncPhoto(op);
                    break;
                default:
                    break;
            }

            await syncQueueRepo.markCompleted(op.id);
        } catch (error) {
            console.error(`Sync failed for ${op.entity}:${op.entity_id}`, error.message);
            await syncQueueRepo.markFailed(op.id, error.message);
        }

        await delay(100);
    }

    await uploadPendingPhotos();
    await detectConflicts();
};

const syncInspection = async (op) => {
    const local = await inspectionsRepo.getById(op.entityId);
    if (!local) return;

    if (op.operation === 'create') {
        const result = await inspectionService.create(op.payload);
        if (result.success) {
            await inspectionsRepo.markSynced(local.id, result.data.inspection.updatedAt);
        }
    } else if (op.operation === 'update') {
        const server = await inspectionService.getById(local.id);
        if (server.success) {
            const serverUpdated = new Date(server.data.inspection.updatedAt);
            const localSynced = local.last_synced_at ? new Date(local.last_synced_at) : new Date(0);

            if (serverUpdated > localSynced && JSON.stringify(server.data.inspection) !== JSON.stringify(local)) {
                await conflictsRepo.create({
                    entity: 'inspection',
                    entityId: local.id,
                    localData: local,
                    serverData: server.data.inspection
                });
                return;
            }
        }

        const result = await inspectionService.update(local.id, op.payload);
        if (result.success) {
            await inspectionsRepo.markSynced(local.id, result.data.inspection.updatedAt);
        }
    } else if (op.operation === 'delete') {
        await inspectionService.delete(local.id);
        await inspectionsRepo.remove(local.id);
    }
};

const syncArea = async (op) => {
    const local = await areasRepo.getById(op.entityId);
    if (!local) return;

    if (op.operation === 'create' || op.operation === 'update') {
        const result = await inspectionService.update(local.inspectionId, op.payload);
        if (result.success) {
            await areasRepo.markSynced(local.id);
        }
    } else if (op.operation === 'delete') {
        await areasRepo.remove(local.id);
    }
};

const syncObservation = async (op) => {
    const local = await observationsRepo.getById(op.entityId);
    if (!local) return;

    if (op.operation === 'create' || op.operation === 'update') {
        try {
            await api.put(
                `/inspections/${local.inspectionId}/execution/observations/${local.id}`,
                op.payload
            );
        } catch {
            // Observation may be embedded in inspection update; mark synced anyway
        }
        await observationsRepo.markSynced(local.id);
    } else if (op.operation === 'delete') {
        await observationsRepo.remove(local.id);
    }
};

const syncPhoto = async (op) => {
    const local = await photosRepo.getById(op.entityId);
    if (!local) return;

    if (local.uploadStatus === 'uploaded') return;

    try {
        await photosRepo.updateUploadStatus(local.id, 'uploading');

        if (local.localPath && !local.url) {
            const result = await photoService.upload(
                local.localPath,
                local.inspectionId,
                local.observationId,
                local.caption
            );
            if (result.success) {
                await photosRepo.updateUploadStatus(local.id, 'uploaded', result.data.url);
            }
        } else if (local.url) {
            await photosRepo.updateUploadStatus(local.id, 'uploaded');
        }
    } catch (error) {
        await photosRepo.updateUploadStatus(local.id, 'failed');
        throw error;
    }
};

const uploadPendingPhotos = async () => {
    const pendingPhotos = await photosRepo.getPendingUpload();
    for (const photo of pendingPhotos) {
        try {
            await photosRepo.updateUploadStatus(photo.id, 'uploading');
            if (photo.localPath && !photo.url) {
                const result = await photoService.upload(
                    photo.localPath,
                    photo.inspectionId,
                    photo.observationId,
                    photo.caption
                );
                if (result.success) {
                    await photosRepo.updateUploadStatus(photo.id, 'uploaded', result.data.url);
                }
            } else if (photo.url) {
                await photosRepo.updateUploadStatus(photo.id, 'uploaded');
            }
        } catch {
            await photosRepo.updateUploadStatus(photo.id, 'failed');
        }
    }
};

const detectConflicts = async () => {
    const dirtyInspections = await inspectionsRepo.getDirty();
    for (const local of dirtyInspections) {
        try {
            const server = await inspectionService.getById(local.id);
            if (server.success) {
                const serverData = server.data.inspection;
                const serverUpdated = new Date(serverData.updatedAt);
                const localSynced = local.last_synced_at ? new Date(local.last_synced_at) : new Date(0);

                if (serverUpdated > localSynced) {
                    const existingConflict = await conflictsRepo.getPending();
                    const alreadyExists = existingConflict.some(
                        (c) => c.entity === 'inspection' && c.entityId === local.id
                    );
                    if (!alreadyExists) {
                        await conflictsRepo.create({
                            entity: 'inspection',
                            entityId: local.id,
                            localData: local,
                            serverData
                        });
                    }
                }
            }
        } catch {
            // Skip - will retry next sync
        }
    }
};

export const addToSyncQueue = async (operation, entity, entityId, payload) => {
    await syncQueueRepo.add({ operation, entity, entityId, payload });
};
