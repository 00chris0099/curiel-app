import { getDB } from './schema';

const TABLE = 'inspections';

const toRow = (data) => ({
    id: data.id,
    projectName: data.projectName,
    clientName: data.clientName,
    address: data.address,
    inspectionType: data.inspectionType,
    status: data.status,
    scheduledDate: data.scheduledDate,
    completedDate: data.completedDate || null,
    inspectorId: data.inspectorId,
    createdById: data.createdById,
    notes: data.notes || null,
    clientId: data.clientId || null,
    is_dirty: data.is_dirty ? 1 : 0,
    ready_to_complete: data.readyToComplete ? 1 : 0,
    last_synced_at: data.last_synced_at || null,
    local_updated_at: data.local_updated_at || new Date().toISOString(),
    created_at_server: data.createdAt || null,
    updated_at_server: data.updatedAt || null
});

const fromRow = (row) => ({
    id: row.id,
    projectName: row.projectName,
    clientName: row.clientName,
    address: row.address,
    inspectionType: row.inspectionType,
    status: row.status,
    scheduledDate: row.scheduledDate,
    completedDate: row.completedDate,
    inspectorId: row.inspectorId,
    createdById: row.createdById,
    notes: row.notes,
    clientId: row.clientId,
    is_dirty: row.is_dirty === 1,
    readyToComplete: row.ready_to_complete === 1,
    last_synced_at: row.last_synced_at,
    local_updated_at: row.local_updated_at,
    createdAt: row.created_at_server,
    updatedAt: row.updated_at_server
});

export const inspectionsRepo = {
    getAll: async () => {
        const db = await getDB();
        const rows = await db.getAllAsync(`SELECT * FROM ${TABLE} ORDER BY scheduledDate DESC`);
        return rows.map(fromRow);
    },

    getAllByInspector: async (inspectorId) => {
        const db = await getDB();
        const rows = await db.getAllAsync(
            `SELECT * FROM ${TABLE} WHERE inspectorId = ? ORDER BY scheduledDate DESC`,
            [inspectorId]
        );
        return rows.map(fromRow);
    },

    getById: async (id) => {
        const db = await getDB();
        const row = await db.getFirstAsync(`SELECT * FROM ${TABLE} WHERE id = ?`, [id]);
        return row ? fromRow(row) : null;
    },

    getDirty: async () => {
        const db = await getDB();
        const rows = await db.getAllAsync(`SELECT * FROM ${TABLE} WHERE is_dirty = 1`);
        return rows.map(fromRow);
    },

    getReadyToComplete: async () => {
        const db = await getDB();
        const rows = await db.getAllAsync(
            `SELECT * FROM ${TABLE} WHERE ready_to_complete = 1 AND status = 'en_proceso'`
        );
        return rows.map(fromRow);
    },

    upsert: async (data) => {
        const db = await getDB();
        const row = toRow(data);
        await db.runAsync(`
            INSERT OR REPLACE INTO ${TABLE}
            (id, projectName, clientName, address, inspectionType, status,
             scheduledDate, completedDate, inspectorId, createdById, notes, clientId,
             is_dirty, ready_to_complete, last_synced_at, local_updated_at, created_at_server, updated_at_server)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            row.id, row.projectName, row.clientName, row.address, row.inspectionType,
            row.status, row.scheduledDate, row.completedDate, row.inspectorId,
            row.createdById, row.notes, row.clientId,
            row.is_dirty, row.ready_to_complete, row.last_synced_at, row.local_updated_at,
            row.created_at_server, row.updated_at_server
        ]);
    },

    upsertMany: async (inspections) => {
        const db = await getDB();
        for (const insp of inspections) {
            const row = toRow(insp);
            await db.runAsync(`
                INSERT OR REPLACE INTO ${TABLE}
                (id, projectName, clientName, address, inspectionType, status,
                 scheduledDate, completedDate, inspectorId, createdById, notes, clientId,
                 is_dirty, ready_to_complete, last_synced_at, local_updated_at, created_at_server, updated_at_server)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                row.id, row.projectName, row.clientName, row.address, row.inspectionType,
                row.status, row.scheduledDate, row.completedDate, row.inspectorId,
                row.createdById, row.notes, row.clientId,
                row.is_dirty, row.ready_to_complete, row.last_synced_at, row.local_updated_at,
                row.created_at_server, row.updated_at_server
            ]);
        }
    },

    markSynced: async (id, serverUpdatedAt) => {
        const db = await getDB();
        await db.runAsync(`
            UPDATE ${TABLE}
            SET is_dirty = 0, last_synced_at = ?, local_updated_at = ?, updated_at_server = ?
            WHERE id = ?
        `, [new Date().toISOString(), new Date().toISOString(), serverUpdatedAt, id]);
    },

    markDirty: async (id) => {
        const db = await getDB();
        await db.runAsync(`
            UPDATE ${TABLE} SET is_dirty = 1, local_updated_at = ? WHERE id = ?
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
