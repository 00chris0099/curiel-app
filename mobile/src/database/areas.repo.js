import { getDB } from './schema';

const TABLE = 'areas';

const toRow = (data) => ({
    id: data.id,
    inspection_id: data.inspectionId,
    name: data.name,
    category: data.category,
    length_m: data.lengthM || null,
    width_m: data.widthM || null,
    calculated_area_m2: data.calculatedAreaM2 || null,
    ceiling_height_m: data.ceilingHeightM || null,
    notes: data.notes || null,
    status: data.status || 'pendiente',
    sort_order: data.sortOrder || 0,
    is_dirty: data.is_dirty ? 1 : 0,
    is_deleted: data.is_deleted ? 1 : 0,
    last_synced_at: data.last_synced_at || null,
    local_updated_at: data.local_updated_at || new Date().toISOString()
});

const fromRow = (row) => ({
    id: row.id,
    inspectionId: row.inspection_id,
    name: row.name,
    category: row.category,
    lengthM: row.length_m,
    widthM: row.width_m,
    calculatedAreaM2: row.calculated_area_m2,
    ceilingHeightM: row.ceiling_height_m,
    notes: row.notes,
    status: row.status,
    sortOrder: row.sort_order,
    is_dirty: row.is_dirty === 1,
    is_deleted: row.is_deleted === 1,
    last_synced_at: row.last_synced_at,
    local_updated_at: row.local_updated_at
});

export const areasRepo = {
    getByInspection: async (inspectionId) => {
        const db = await getDB();
        const rows = await db.getAllAsync(
            `SELECT * FROM ${TABLE} WHERE inspection_id = ? AND is_deleted = 0 ORDER BY sort_order`,
            [inspectionId]
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
            (id, inspection_id, name, category, length_m, width_m, calculated_area_m2,
             ceiling_height_m, notes, status, sort_order, is_dirty, is_deleted,
             last_synced_at, local_updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            row.id, row.inspection_id, row.name, row.category, row.length_m,
            row.width_m, row.calculated_area_m2, row.ceiling_height_m, row.notes,
            row.status, row.sort_order, row.is_dirty, row.is_deleted,
            row.last_synced_at, row.local_updated_at
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
