import { getDB } from './schema';

const TABLE = 'conflicts';

const fromRow = (row) => ({
    id: row.id,
    entity: row.entity,
    entityId: row.entity_id,
    localData: row.local_data ? JSON.parse(row.local_data) : null,
    serverData: row.server_data ? JSON.parse(row.server_data) : null,
    resolution: row.resolution,
    resolvedAt: row.resolved_at,
    createdAt: row.created_at
});

export const conflictsRepo = {
    getPending: async () => {
        const db = await getDB();
        const rows = await db.getAllAsync(`
            SELECT * FROM ${TABLE} WHERE resolution IS NULL ORDER BY created_at ASC
        `);
        return rows.map(fromRow);
    },

    getCount: async () => {
        const db = await getDB();
        const result = await db.getFirstAsync(`
            SELECT COUNT(*) as count FROM ${TABLE} WHERE resolution IS NULL
        `);
        return result?.count || 0;
    },

    create: async ({ entity, entityId, localData, serverData }) => {
        const db = await getDB();
        const now = new Date().toISOString();
        await db.runAsync(`
            INSERT INTO ${TABLE} (entity, entity_id, local_data, server_data, created_at)
            VALUES (?, ?, ?, ?, ?)
        `, [entity, entityId, JSON.stringify(localData), JSON.stringify(serverData), now]);
    },

    resolve: async (id, resolution) => {
        const db = await getDB();
        await db.runAsync(`
            UPDATE ${TABLE} SET resolution = ?, resolved_at = ? WHERE id = ?
        `, [resolution, new Date().toISOString(), id]);
    },

    getById: async (id) => {
        const db = await getDB();
        const row = await db.getFirstAsync(`SELECT * FROM ${TABLE} WHERE id = ?`, [id]);
        return row ? fromRow(row) : null;
    },

    clear: async () => {
        const db = await getDB();
        await db.runAsync(`DELETE FROM ${TABLE}`);
    }
};
