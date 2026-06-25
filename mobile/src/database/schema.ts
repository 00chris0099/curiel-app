import * as SQLite from 'expo-sqlite';
import config from '../config';

let db = null;

export const getDB = async () => {
    if (!db) {
        db = await SQLite.openDatabaseAsync(config.DB_NAME);
        await initTables(db);
    }
    return db;
};

const initTables = async (database) => {
    await database.execAsync(`
        CREATE TABLE IF NOT EXISTS inspections (
            id TEXT PRIMARY KEY,
            projectName TEXT,
            clientName TEXT,
            address TEXT,
            inspectionType TEXT,
            status TEXT,
            scheduledDate TEXT,
            completedDate TEXT,
            inspectorId TEXT,
            createdById TEXT,
            notes TEXT,
            clientId TEXT,
            is_dirty INTEGER DEFAULT 0,
            ready_to_complete INTEGER DEFAULT 0,
            last_synced_at TEXT,
            local_updated_at TEXT,
            created_at_server TEXT,
            updated_at_server TEXT
        );

        CREATE TABLE IF NOT EXISTS areas (
            id TEXT PRIMARY KEY,
            inspection_id TEXT NOT NULL,
            name TEXT,
            category TEXT,
            length_m REAL,
            width_m REAL,
            calculated_area_m2 REAL,
            ceiling_height_m REAL,
            notes TEXT,
            status TEXT DEFAULT 'pendiente',
            sort_order INTEGER DEFAULT 0,
            is_dirty INTEGER DEFAULT 0,
            is_deleted INTEGER DEFAULT 0,
            last_synced_at TEXT,
            local_updated_at TEXT
        );

        CREATE TABLE IF NOT EXISTS observations (
            id TEXT PRIMARY KEY,
            inspection_id TEXT NOT NULL,
            area_id TEXT NOT NULL,
            title TEXT,
            description TEXT,
            severity TEXT,
            type TEXT,
            recommendation TEXT,
            metric_value REAL,
            metric_unit TEXT,
            status TEXT DEFAULT 'pendiente',
            created_by TEXT,
            is_dirty INTEGER DEFAULT 0,
            is_deleted INTEGER DEFAULT 0,
            last_synced_at TEXT,
            local_updated_at TEXT
        );

        CREATE TABLE IF NOT EXISTS photos (
            id TEXT PRIMARY KEY,
            inspection_id TEXT NOT NULL,
            area_id TEXT,
            observation_id TEXT,
            type TEXT,
            url TEXT,
            local_path TEXT,
            caption TEXT,
            latitude REAL,
            longitude REAL,
            uploaded_by TEXT,
            upload_status TEXT DEFAULT 'pending',
            is_deleted INTEGER DEFAULT 0,
            last_synced_at TEXT,
            local_updated_at TEXT
        );

        CREATE TABLE IF NOT EXISTS sync_queue (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            operation TEXT NOT NULL,
            entity TEXT NOT NULL,
            entity_id TEXT NOT NULL,
            payload TEXT,
            attempts INTEGER DEFAULT 0,
            max_attempts INTEGER DEFAULT 3,
            status TEXT DEFAULT 'pending',
            error_message TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT
        );

        CREATE TABLE IF NOT EXISTS conflicts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            entity TEXT NOT NULL,
            entity_id TEXT NOT NULL,
            local_data TEXT,
            server_data TEXT,
            resolution TEXT,
            resolved_at TEXT,
            created_at TEXT NOT NULL
        );
    `);
};

export const closeDB = async () => {
    if (db) {
        await db.closeAsync();
        db = null;
    }
};
