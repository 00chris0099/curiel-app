import { getDB } from './schema';

const TABLE = 'sync_queue';

export const syncQueueRepo = {
    add: async ({ operation, entity, entityId, payload }) => {
        const db = await getDB();
        const now = new Date().toISOString();
        const result = await db.runAsync(`
            INSERT INTO ${TABLE} (operation, entity, entity_id, payload, created_at)
            VALUES (?, ?, ?, ?, ?)
        `, [operation, entity, entityId, JSON.stringify(payload), now]);
        return result.lastInsertRowId;
    },

    getPending: async () => {
        const db = await getDB();
        const rows = await db.getAllAsync(`
            SELECT * FROM ${TABLE}
            WHERE status = 'pending' AND attempts < max_attempts
            ORDER BY created_at ASC
        `);
        return rows.map(r => ({ ...r, payload: r.payload ? JSON.parse(r.payload) : null }));
    },

    getById: async (id) => {
        const db = await getDB();
        const row = await db.getFirstAsync(`SELECT * FROM ${TABLE} WHERE id = ?`, [id]);
        return row ? { ...row, payload: row.payload ? JSON.parse(row.payload) : null } : null;
    },

    markProcessing: async (id) => {
        const db = await getDB();
        await db.runAsync(`
            UPDATE ${TABLE} SET status = 'processing', updated_at = ? WHERE id = ?
        `, [new Date().toISOString(), id]);
    },

    markCompleted: async (id) => {
        const db = await getDB();
        await db.runAsync(`
            UPDATE ${TABLE} SET status = 'completed', updated_at = ? WHERE id = ?
        `, [new Date().toISOString(), id]);
    },

    markFailed: async (id, errorMessage) => {
        const db = await getDB();
        await db.runAsync(`
            UPDATE ${TABLE}
            SET status = 'failed', attempts = attempts + 1, error_message = ?, updated_at = ?
            WHERE id = ?
        `, [errorMessage, new Date().toISOString(), id]);
    },

    incrementAttempts: async (id) => {
        const db = await getDB();
        await db.runAsync(`
            UPDATE ${TABLE}
            SET attempts = attempts + 1, status = CASE
                WHEN attempts + 1 >= max_attempts THEN 'failed'
                ELSE 'pending'
            END, updated_at = ?
            WHERE id = ?
        `, [new Date().toISOString(), id]);
    },

    getCount: async () => {
        const db = await getDB();
        const result = await db.getFirstAsync(`
            SELECT COUNT(*) as count FROM ${TABLE} WHERE status IN ('pending', 'processing')
        `);
        return result?.count || 0;
    },

    clear: async () => {
        const db = await getDB();
        await db.runAsync(`DELETE FROM ${TABLE}`);
    },

    removeCompleted: async () => {
        const db = await getDB();
        await db.runAsync(`DELETE FROM ${TABLE} WHERE status = 'completed'`);
    }
};
