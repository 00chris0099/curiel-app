import { getDB } from './schema';

const TABLE = 'observations';

const toRow = (data) => ({
    id: data.id,
    inspection_id: data.inspectionId,
    area_id: data.areaId,
    title: data.title,
    description: data.description,
    severity: data.severity,
    type: data.type,
    recommendation: data.recommendation || null,
    metric_value: data.metricValue || null,
    metric_unit: data.metricUnit || null,
    status: data.status || 'pendiente',
    created_by: data.createdBy || null,
    is_dirty: data.is_dirty ? 1 : 0,
    is_deleted: data.is_deleted ? 1 : 0,
    last_synced_at: data.last_synced_at || null,
    local_updated_at: data.local_updated_at || new Date().toISOString()
});

const fromRow = (row) => ({
    id: row.id,
    inspectionId: row.inspection_id,
    areaId: row.area_id,
    title: row.title,
    description: row.description,
    severity: row.severity,
    type: row.type,
    recommendation: row.recommendation,
    metricValue: row.metric_value,
    metricUnit: row.metric_unit,
    status: row.status,
    createdBy: row.created_by,
    is_dirty: row.is_dirty === 1,
    is_deleted: row.is_deleted === 1,
    last_synced_at: row.last_synced_at,
    local_updated_at: row.local_updated_at
});

export const observationsRepo = {
    getByInspection: async (inspectionId) => {
        const db = await getDB();
        const rows = await db.getAllAsync(
            `SELECT * FROM ${TABLE} WHERE inspection_id = ? AND is_deleted = 0`,
            [inspectionId]
        );
        return rows.map(fromRow);
    },

    getByArea: async (areaId) => {
        const db = await getDB();
        const rows = await db.getAllAsync(
            `SELECT * FROM ${TABLE} WHERE area_id = ? AND is_deleted = 0`,
            [areaId]
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
            (id, inspection_id, area_id, title, description, severity, type,
             recommendation, metric_value, metric_unit, status, created_by,
             is_dirty, is_deleted, last_synced_at, local_updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            row.id, row.inspection_id, row.area_id, row.title, row.description,
            row.severity, row.type, row.recommendation, row.metric_value,
            row.metric_unit, row.status, row.created_by,
            row.is_dirty, row.is_deleted, row.last_synced_at, row.local_updated_at
        ]);
    },

    markSynced: async (id) => {
        const db = await getDB();
        await db.runAsync(`
            UPDATE ${TABLE} SET is_dirty = 0, last_synced_at = ? WHERE id = ?
        `, [new Date().toISOString(), id]);
    },

    markDirty: async (id) => {
        const db = await getDB();
        await db.runAsync(`
            UPDATE ${TABLE} SET is_dirty = 1, local_updated_at = ? WHERE id = ?
        `, [new Date().toISOString(), id]);
    },

    softDelete: async (id) => {
        const db = await getDB();
        await db.runAsync(`
            UPDATE ${TABLE} SET is_deleted = 1, is_dirty = 1, local_updated_at = ? WHERE id = ?
        `, [new Date().toISOString(), id]);
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
