jest.mock('expo-sqlite', () => ({
    openDatabaseAsync: jest.fn().mockResolvedValue({
        execAsync: jest.fn().mockResolvedValue(undefined),
        getAllAsync: jest.fn().mockResolvedValue([]),
        getFirstAsync: jest.fn().mockResolvedValue(null),
        runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 1 }),
    }),
}));

jest.mock('../config', () => ({
    default: {
        API_URL: 'https://test.example.com',
        API_TIMEOUT: 30000,
        DB_NAME: 'test.db',
        SYNC_INTERVAL_MS: 30000,
        ENABLE_OFFLINE_MODE: true,
        STORAGE_KEYS: {
            AUTH_TOKEN: '@curiel:auth_token',
            REFRESH_TOKEN: '@curiel:refresh_token',
            USER_DATA: '@curiel:user_data',
            OFFLINE_QUEUE: '@curiel:offline_queue',
            CACHED_INSPECTIONS: '@curiel:cached_inspections',
        },
        APP_CONFIG: {
            MAX_PHOTO_SIZE: 5 * 1024 * 1024,
            PHOTO_QUALITY: 0.8,
        },
    },
}));

describe('Schema', () => {
    it('getDB returns a database instance and initializes tables', async () => {
        const { getDB } = require('../database/schema');
        const db = await getDB();
        expect(db).toBeDefined();
        expect(db.execAsync).toBeDefined();
        expect(db.runAsync).toBeDefined();
        expect(db.getAllAsync).toBeDefined();
        expect(db.getFirstAsync).toBeDefined();
        expect(db.execAsync).toHaveBeenCalled();
        const sql = db.execAsync.mock.calls[0][0];
        expect(sql).toContain('CREATE TABLE IF NOT EXISTS inspections');
        expect(sql).toContain('CREATE TABLE IF NOT EXISTS areas');
        expect(sql).toContain('CREATE TABLE IF NOT EXISTS observations');
        expect(sql).toContain('CREATE TABLE IF NOT EXISTS photos');
        expect(sql).toContain('CREATE TABLE IF NOT EXISTS sync_queue');
        expect(sql).toContain('CREATE TABLE IF NOT EXISTS conflicts');
    });
});

describe('InspectionsRepo', () => {
    let db;
    let inspectionsRepo;

    beforeEach(async () => {
        jest.clearAllMocks();
        const { getDB } = require('../database/schema');
        db = await getDB();
        inspectionsRepo = require('../database/inspections.repo').inspectionsRepo;
    });

    it('upsert calls runAsync with INSERT OR REPLACE', async () => {
        const data = {
            id: 'ins-1',
            projectName: 'Test Project',
            clientName: 'Client',
            address: '123 Main St',
            inspectionType: 'general',
            status: 'programada',
            scheduledDate: '2024-01-01',
        };

        await inspectionsRepo.upsert(data);

        expect(db.runAsync).toHaveBeenCalled();
        const sql = db.runAsync.mock.calls[0][0];
        expect(sql).toContain('INSERT OR REPLACE INTO inspections');
    });

    it('markSynced updates is_dirty and timestamps', async () => {
        await inspectionsRepo.markSynced('ins-1', '2024-01-02T00:00:00.000Z');

        expect(db.runAsync).toHaveBeenCalled();
        const sql = db.runAsync.mock.calls[0][0];
        expect(sql).toContain('UPDATE inspections');
        expect(sql).toContain('is_dirty = 0');
    });

    it('markDirty sets is_dirty to 1', async () => {
        await inspectionsRepo.markDirty('ins-1');

        expect(db.runAsync).toHaveBeenCalled();
        const sql = db.runAsync.mock.calls[0][0];
        expect(sql).toContain('is_dirty = 1');
    });

    it('remove deletes by id', async () => {
        await inspectionsRepo.remove('ins-1');

        expect(db.runAsync).toHaveBeenCalled();
        const sql = db.runAsync.mock.calls[0][0];
        expect(sql).toContain('DELETE FROM inspections');
    });
});

describe('AreasRepo', () => {
    let db;
    let areasRepo;

    beforeEach(async () => {
        jest.clearAllMocks();
        const { getDB } = require('../database/schema');
        db = await getDB();
        areasRepo = require('../database/areas.repo').areasRepo;
    });

    it('upsert calls runAsync with INSERT OR REPLACE', async () => {
        const data = {
            id: 'area-1',
            inspectionId: 'ins-1',
            name: 'Living Room',
        };

        await areasRepo.upsert(data);

        expect(db.runAsync).toHaveBeenCalled();
        const sql = db.runAsync.mock.calls[0][0];
        expect(sql).toContain('INSERT OR REPLACE INTO areas');
    });

    it('softDelete sets is_deleted and is_dirty', async () => {
        await areasRepo.softDelete('area-1');

        expect(db.runAsync).toHaveBeenCalled();
        const sql = db.runAsync.mock.calls[0][0];
        expect(sql).toContain('is_deleted = 1');
        expect(sql).toContain('is_dirty = 1');
    });

    it('markSynced updates is_dirty', async () => {
        await areasRepo.markSynced('area-1');

        expect(db.runAsync).toHaveBeenCalled();
        const sql = db.runAsync.mock.calls[0][0];
        expect(sql).toContain('is_dirty = 0');
    });
});

describe('ObservationsRepo', () => {
    let db;
    let observationsRepo;

    beforeEach(async () => {
        jest.clearAllMocks();
        const { getDB } = require('../database/schema');
        db = await getDB();
        observationsRepo = require('../database/observations.repo').observationsRepo;
    });

    it('upsert calls runAsync with INSERT OR REPLACE', async () => {
        const data = {
            id: 'obs-1',
            inspectionId: 'ins-1',
            areaId: 'area-1',
            title: 'Crack in wall',
            severity: 'alta',
            type: 'estructural',
        };

        await observationsRepo.upsert(data);

        expect(db.runAsync).toHaveBeenCalled();
        const sql = db.runAsync.mock.calls[0][0];
        expect(sql).toContain('INSERT OR REPLACE INTO observations');
    });

    it('softDelete sets is_deleted and is_dirty', async () => {
        await observationsRepo.softDelete('obs-1');

        expect(db.runAsync).toHaveBeenCalled();
        const sql = db.runAsync.mock.calls[0][0];
        expect(sql).toContain('is_deleted = 1');
        expect(sql).toContain('is_dirty = 1');
    });
});

describe('PhotosRepo', () => {
    let db;
    let photosRepo;

    beforeEach(async () => {
        jest.clearAllMocks();
        const { getDB } = require('../database/schema');
        db = await getDB();
        photosRepo = require('../database/photos.repo').photosRepo;
    });

    it('upsert calls runAsync with INSERT OR REPLACE', async () => {
        const data = {
            id: 'photo-1',
            inspectionId: 'ins-1',
            type: 'before',
            localPath: '/path/to/photo.jpg',
        };

        await photosRepo.upsert(data);

        expect(db.runAsync).toHaveBeenCalled();
        const sql = db.runAsync.mock.calls[0][0];
        expect(sql).toContain('INSERT OR REPLACE INTO photos');
    });

    it('updateUploadStatus without url updates only status', async () => {
        await photosRepo.updateUploadStatus('photo-1', 'uploading');

        expect(db.runAsync).toHaveBeenCalled();
        const sql = db.runAsync.mock.calls[0][0];
        expect(sql).toContain('upload_status = ?');
    });

    it('updateUploadStatus with url updates status and url', async () => {
        await photosRepo.updateUploadStatus('photo-1', 'uploaded', 'https://example.com/photo.jpg');

        expect(db.runAsync).toHaveBeenCalled();
        const sql = db.runAsync.mock.calls[0][0];
        expect(sql).toContain('upload_status = ?');
        expect(sql).toContain('url = ?');
    });
});

describe('SyncQueueRepo', () => {
    let db;
    let syncQueueRepo;

    beforeEach(async () => {
        jest.clearAllMocks();
        const { getDB } = require('../database/schema');
        db = await getDB();
        syncQueueRepo = require('../database/syncQueue.repo').syncQueueRepo;
    });

    it('add inserts a new queue item', async () => {
        db.runAsync.mockResolvedValueOnce({ lastInsertRowId: 42 });

        const id = await syncQueueRepo.add({
            operation: 'upsert',
            entity: 'inspection',
            entityId: 'ins-1',
            payload: { test: true },
        });

        expect(id).toBe(42);
        expect(db.runAsync).toHaveBeenCalled();
        const sql = db.runAsync.mock.calls[0][0];
        expect(sql).toContain('INSERT INTO sync_queue');
    });

    it('markProcessing updates status to processing', async () => {
        await syncQueueRepo.markProcessing(1);

        expect(db.runAsync).toHaveBeenCalled();
        const sql = db.runAsync.mock.calls[0][0];
        expect(sql).toContain("status = 'processing'");
    });

    it('markCompleted updates status to completed', async () => {
        await syncQueueRepo.markCompleted(1);

        expect(db.runAsync).toHaveBeenCalled();
        const sql = db.runAsync.mock.calls[0][0];
        expect(sql).toContain("status = 'completed'");
    });

    it('markFailed updates status and increments attempts', async () => {
        await syncQueueRepo.markFailed(1, 'Network error');

        expect(db.runAsync).toHaveBeenCalled();
        const sql = db.runAsync.mock.calls[0][0];
        expect(sql).toContain("status = 'failed'");
        expect(sql).toContain('attempts = attempts + 1');
    });

    it('getCount returns count from DB', async () => {
        db.getFirstAsync.mockResolvedValueOnce({ count: 5 });

        const count = await syncQueueRepo.getCount();
        expect(count).toBe(5);
    });
});

describe('ConflictsRepo', () => {
    let db;
    let conflictsRepo;

    beforeEach(async () => {
        jest.clearAllMocks();
        const { getDB } = require('../database/schema');
        db = await getDB();
        conflictsRepo = require('../database/conflicts.repo').conflictsRepo;
    });

    it('create inserts a new conflict', async () => {
        await conflictsRepo.create({
            entity: 'inspection',
            entityId: 'ins-1',
            localData: { status: 'local' },
            serverData: { status: 'server' },
        });

        expect(db.runAsync).toHaveBeenCalled();
        const sql = db.runAsync.mock.calls[0][0];
        expect(sql).toContain('INSERT INTO conflicts');
    });

    it('resolve updates resolution and resolved_at', async () => {
        await conflictsRepo.resolve(1, 'local');

        expect(db.runAsync).toHaveBeenCalled();
        const sql = db.runAsync.mock.calls[0][0];
        expect(sql).toContain('UPDATE conflicts');
        expect(sql).toContain('resolution = ?');
        expect(sql).toContain('resolved_at = ?');
    });

    it('getCount returns count of unresolved conflicts', async () => {
        db.getFirstAsync.mockResolvedValueOnce({ count: 3 });

        const count = await conflictsRepo.getCount();
        expect(count).toBe(3);
    });

    it('getCount returns 0 when no result', async () => {
        db.getFirstAsync.mockResolvedValueOnce(null);

        const count = await conflictsRepo.getCount();
        expect(count).toBe(0);
    });
});
