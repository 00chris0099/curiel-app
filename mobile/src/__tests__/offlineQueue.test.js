jest.mock('../database/inspections.repo', () => ({
    inspectionsRepo: {
        upsert: jest.fn().mockResolvedValue(undefined),
        getById: jest.fn().mockResolvedValue(null),
        markSynced: jest.fn().mockResolvedValue(undefined),
    },
}));

jest.mock('../database/areas.repo', () => ({
    areasRepo: {
        upsert: jest.fn().mockResolvedValue(undefined),
        markSynced: jest.fn().mockResolvedValue(undefined),
    },
}));

jest.mock('../database/observations.repo', () => ({
    observationsRepo: {
        upsert: jest.fn().mockResolvedValue(undefined),
        markSynced: jest.fn().mockResolvedValue(undefined),
    },
}));

jest.mock('../database/photos.repo', () => ({
    photosRepo: {
        upsert: jest.fn().mockResolvedValue(undefined),
        updateUploadStatus: jest.fn().mockResolvedValue(undefined),
    },
}));

jest.mock('../services/syncEngine', () => ({
    addToSyncQueue: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../services/api', () => ({
    inspectionService: {
        create: jest.fn().mockResolvedValue({ success: true, data: { inspection: { id: 'ins-1', updatedAt: '2024-01-02T00:00:00.000Z' } } }),
        update: jest.fn().mockResolvedValue({ success: true, data: { inspection: { id: 'ins-1', updatedAt: '2024-01-02T00:00:00.000Z' } } }),
    },
    photoService: {
        upload: jest.fn().mockResolvedValue({ success: true, data: { url: 'https://example.com/photo.jpg' } }),
    },
}));

const { offlineQueue } = require('../services/offlineQueue');
const { inspectionsRepo } = require('../database/inspections.repo');
const { areasRepo } = require('../database/areas.repo');
const { observationsRepo } = require('../database/observations.repo');
const { photosRepo } = require('../database/photos.repo');
const { addToSyncQueue } = require('../services/syncEngine');

describe('OfflineQueue', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('saveInspection', () => {
        it('saves inspection locally when offline', async () => {
            const data = { id: 'ins-1', status: 'programada', address: 'Test' };

            const result = await offlineQueue.saveInspection(data, false);

            expect(inspectionsRepo.upsert).toHaveBeenCalled();
            expect(addToSyncQueue).toHaveBeenCalledWith('update', 'inspection', 'ins-1', data);
            expect(result).toEqual({ synced: false, queued: true });
        });

        it('syncs immediately when online and API succeeds', async () => {
            const data = { id: 'ins-1', status: 'programada', address: 'Test' };

            const result = await offlineQueue.saveInspection(data, true);

            expect(inspectionsRepo.upsert).toHaveBeenCalled();
            expect(inspectionsRepo.markSynced).toHaveBeenCalled();
            expect(result).toEqual({ synced: true });
        });

        it('queues when online but API fails', async () => {
            const { inspectionService } = require('../services/api');
            inspectionService.update.mockResolvedValueOnce({ success: false });

            const data = { id: 'ins-1', status: 'programada', address: 'Test' };

            const result = await offlineQueue.saveInspection(data, true);

            expect(addToSyncQueue).toHaveBeenCalled();
            expect(result).toEqual({ synced: false, queued: true });
        });
    });

    describe('createInspection', () => {
        it('creates inspection locally when offline', async () => {
            const data = { status: 'programada', address: 'New' };

            const result = await offlineQueue.createInspection(data, false);

            expect(inspectionsRepo.upsert).toHaveBeenCalled();
            expect(addToSyncQueue).toHaveBeenCalledWith('create', 'inspection', data.id, data);
            expect(result).toEqual({ synced: false, queued: true });
        });

        it('syncs immediately when online', async () => {
            const data = { status: 'programada', address: 'New' };

            const result = await offlineQueue.createInspection(data, true);

            expect(inspectionsRepo.markSynced).toHaveBeenCalled();
            expect(result).toEqual({ synced: true, data: expect.any(Object) });
        });
    });

    describe('saveArea', () => {
        it('saves area locally when offline', async () => {
            const data = { id: 'area-1', name: 'Living Room' };

            const result = await offlineQueue.saveArea('ins-1', data, false);

            expect(areasRepo.upsert).toHaveBeenCalled();
            expect(addToSyncQueue).toHaveBeenCalledWith('update', 'area', 'area-1', expect.objectContaining(data));
            expect(result).toEqual({ synced: false, queued: true });
        });
    });

    describe('saveObservation', () => {
        it('saves observation locally when offline', async () => {
            const data = { id: 'obs-1', title: 'Crack', severity: 'alta' };

            const result = await offlineQueue.saveObservation('ins-1', data, false);

            expect(observationsRepo.upsert).toHaveBeenCalled();
            expect(addToSyncQueue).toHaveBeenCalledWith('update', 'observation', 'obs-1', expect.objectContaining(data));
            expect(result).toEqual({ synced: false, queued: true });
        });
    });

    describe('savePhoto', () => {
        it('saves photo locally when offline', async () => {
            const data = { id: 'photo-1', inspectionId: 'ins-1', localPath: '/path/photo.jpg' };

            const result = await offlineQueue.savePhoto(data, false);

            expect(photosRepo.upsert).toHaveBeenCalled();
            expect(addToSyncQueue).toHaveBeenCalledWith('create', 'photo', 'photo-1', expect.objectContaining(data));
            expect(result).toEqual({ synced: false, queued: true });
        });

        it('uploads photo immediately when online', async () => {
            const data = { id: 'photo-1', inspectionId: 'ins-1', localPath: '/path/photo.jpg' };

            const result = await offlineQueue.savePhoto(data, true);

            expect(photosRepo.upsert).toHaveBeenCalled();
            expect(photosRepo.updateUploadStatus).toHaveBeenCalledWith('photo-1', 'uploaded', 'https://example.com/photo.jpg');
            expect(result).toEqual({ synced: true });
        });
    });
});
