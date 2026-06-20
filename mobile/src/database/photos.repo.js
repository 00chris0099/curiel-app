import { getDB } from './schema';

const TABLE = 'photos';

const toRow = (data) => ({
    id: data.id,
    inspection_id: data.inspectionId,
    area_id: data.areaId || null,
    observation_id: data.observationId || null,
    type: data.type,
    url: data.url || null,
    local_path: data.localPath || null,
    caption: data.caption || null,
    latitude: data.latitude || null,
    longitude: data.longitude || null,
    uploaded_by: data.uploadedBy || null,
    upload_status: data.uploadStatus || 'pending',
    is_deleted: data.is_deleted ? 1 : 0,
    last_synced_at: data.last_synced_at || null,
    local_updated_at: data.local_updated_at || new Date().toISOString()
});

const fromRow = (row) => ({
    id: row.id,
    inspectionId: row.inspection_id,
    areaId: row.area_id,
    observationId: row.observation_id,
    type: row.type,
    url: row.url,
    localPath: row.local_path,
    caption: row.caption,
    latitude: row.latitude,
    longitude: row.longitude,
    uploadedBy: row.uploaded_by,
    uploadStatus: row.upload_status,
    is_deleted: row.is_deleted === 1,
    last_synced_at: row.last_synced_at,
    local_updated_at: row.local_updated_at
});

export const photosRepo = {
    getByInspection: async (inspectionId) => {
        const db = await getDB();
        const rows = await db.getAllAsync(
            `SELECT * FROM ${TABLE} WHERE inspection_id = ? AND is_deleted = 0`,
            [inspectionId]
        );
        return rows.map(fromRow);
    },

    getPendingUpload: async () => {
        const db = await getDB();
        const rows = await db.getAllAsync(
            `SELECT * FROM ${TABLE} WHERE upload_status = 'pending' AND is_deleted = 0`
        );
        return rows.map(fromRow);
    },

    getById: async (id) => {
        const db = await getDB();
        const row = await db.getFirstAsync(`SELECT * FROM ${TABLE} WHERE id = ?`, [id]);
        return row ? fromRow(row) : null;
    },

    upsert: async (data) => {
        const db = await getDB();
        const row = toRow(data);
        await db.runAsync(`
            INSERT OR REPLACE INTO ${TABLE}
            (id, inspection_id, area_id, observation_id, type, url, local_path,
             caption, latitude, longitude, uploaded_by, upload_status,
             is_deleted, last_synced_at, local_updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            row.id, row.inspection_id, row.area_id, row.observation_id,
            row.type, row.url, row.local_path, row.caption,
            row.latitude, row.longitude, row.uploaded_by, row.upload_status,
            row.is_deleted, row.last_synced_at, row.local_updated_at
        ]);
    },

    updateUploadStatus: async (id, status, url) => {
        const db = await getDB();
        if (url) {
            await db.runAsync(`
                UPDATE ${TABLE} SET upload_status = ?, url = ?, last_synced_at = ? WHERE id = ?
            `, [status, url, new Date().toISOString(), id]);
        } else {
            await db.runAsync(`
                UPDATE ${TABLE} SET upload_status = ? WHERE id = ?
            `, [status, id]);
        }
    },

    remove: async (id) => {
        const db = await getDB();
        await db.runAsync(`DELETE FROM ${TABLE} WHERE id = ?`, [id]);
    },

    clear: async () => {
        const db = await getDB();
        await db.runAsync(`DELETE FROM ${TABLE}`);
    }
};
