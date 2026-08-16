/**
 * Run SQL fix scripts against the database(s).
 * MODO NUEVO: si DATABASE_URL está definida (base única), los aplica una vez
 *   contra esa base. MODO LEGACY: contra las 7 DATABASE_URL_*.
 * Idempotent: all scripts use IF NOT EXISTS / DO $$ blocks.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const FIXES_DIR = path.join(__dirname, 'sql-fixes');

// pg >= 8.13 trata sslmode=require como verify-full; sanea la URL y fuerza ssl.
const { sanitizeDatabaseUrl, resolveSsl } = require('../src/lib/dbConnection');

const DATABASES = process.env.DATABASE_URL
    ? [{ name: 'unificada', url: process.env.DATABASE_URL }]
    : [
        { name: 'auth', url: process.env.DATABASE_URL_AUTH },
        { name: 'inspecciones', url: process.env.DATABASE_URL_INSPECCIONES },
        { name: 'media', url: process.env.DATABASE_URL_MEDIA },
        { name: 'admin', url: process.env.DATABASE_URL_ADMIN },
        { name: 'notificaciones', url: process.env.DATABASE_URL_NOTIFICACIONES },
        { name: 'alertas', url: process.env.DATABASE_URL_ALERTAS },
        { name: 'auditoria', url: process.env.DATABASE_URL_AUDITORIA },
    ];

async function runFixes() {
    if (!fs.existsSync(FIXES_DIR)) {
        console.log('[sql-fixes] No sql-fixes directory found, skipping.');
        return;
    }

    const files = fs.readdirSync(FIXES_DIR).filter(f => f.endsWith('.sql'));
    if (files.length === 0) {
        console.log('[sql-fixes] No .sql files found, skipping.');
        return;
    }

    for (const db of DATABASES) {
        if (!db.url) continue;

        const client = new Client({ connectionString: sanitizeDatabaseUrl(db.url), ssl: resolveSsl(db.url) });
        try {
            await client.connect();

            for (const file of files) {
                const sql = fs.readFileSync(path.join(FIXES_DIR, file), 'utf-8');
                try {
                    await client.query(sql);
                    console.log(`  [${db.name}] ${file} applied`);
                } catch (err) {
                    // Ignore "already exists" type errors
                    if (err.code === '42710' || err.code === '42P07' || err.message?.includes('already exists')) {
                        console.log(`  [${db.name}] ${file} already applied, skipping.`);
                    } else {
                        console.log(`  [${db.name}] ${file} warning: ${err.message?.substring(0, 100)}`);
                    }
                }
            }
        } catch (err) {
            console.log(`  [${db.name}] connection failed: ${err.message?.substring(0, 80)}`);
        } finally {
            await client.end();
        }
    }

    console.log('[sql-fixes] Done.');
}

runFixes().catch(() => process.exit(0));
