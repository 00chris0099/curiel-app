/**
 * Migra usando SQL puro (sin shadow DB).
 * Si DATABASE_URL está definida (base única), migra desde el schema
 * UNIFICADO; si no, migra los módulos restantes legacy.
 * Ejecuta: node scripts/migrate-remaining.js
 */
require('dotenv').config();
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');

const UNIFIED_SCHEMA = 'prisma/schema.prisma';
const SINGLE_URL = process.env.DATABASE_URL || null;

// pg >= 8.13 trata sslmode=require como verify-full; sanea la URL y fuerza ssl.
const { sanitizeDatabaseUrl, resolveSsl } = require('../src/lib/dbConnection');

const MODULES = [
    {
        name: 'notificaciones',
        schema: 'src/modules/notificaciones/prisma/schema.prisma',
        url: process.env.DATABASE_URL_NOTIFICACIONES,
    },
    {
        name: 'alertas',
        schema: 'src/modules/alertas/prisma/schema.prisma',
        url: process.env.DATABASE_URL_ALERTAS,
    },
    {
        name: 'auditoria',
        schema: 'src/modules/auditoria/prisma/schema.prisma',
        url: process.env.DATABASE_URL_AUDITORIA,
    },
];

async function applySql(url, sql, migrationName) {
    const client = new Client({ connectionString: sanitizeDatabaseUrl(url), ssl: resolveSsl(url) });
    await client.connect();
    try {
        await client.query('BEGIN');

        await client.query(`
            CREATE TABLE IF NOT EXISTS _prisma_migrations (
                id                  VARCHAR(36) PRIMARY KEY,
                checksum            VARCHAR(64) NOT NULL,
                finished_at         TIMESTAMPTZ,
                migration_name      VARCHAR(255) NOT NULL,
                logs                TEXT,
                rolled_back_at      TIMESTAMPTZ,
                started_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
                applied_steps_count INTEGER NOT NULL DEFAULT 0
            );
        `);

        const existing = await client.query(
            'SELECT id FROM _prisma_migrations WHERE migration_name = $1',
            [migrationName]
        );

        if (existing.rows.length > 0) {
            console.log(`  Migration "${migrationName}" already applied, skipping.`);
            await client.query('ROLLBACK');
            return;
        }

        await client.query(sql);

        const id = crypto.randomUUID();
        const checksum = crypto.createHash('sha256').update(sql).digest('hex');
        await client.query(
            `INSERT INTO _prisma_migrations (id, checksum, migration_name, finished_at, started_at, applied_steps_count)
             VALUES ($1, $2, $3, now(), now(), 1)`,
            [id, checksum, migrationName]
        );

        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        await client.end();
    }
}

async function run() {
    // Modo único: migrar el schema UNIFICADO y terminar
    if (SINGLE_URL) {
        console.log('\nModo UNIFICADO: DATABASE_URL detectada (una sola base de datos).');
        const schemaPath = path.join(ROOT, UNIFIED_SCHEMA);
        const sqlFile = path.join(ROOT, 'prisma', 'temp_unified.sql');
        try {
            execSync(
                `npx prisma migrate diff --from-empty --to-schema "${schemaPath}" --script > "${sqlFile}"`,
                { cwd: ROOT, stdio: 'pipe', env: { ...process.env } }
            );
            const sql = fs.readFileSync(sqlFile, 'utf-8').trim();
            console.log(`  SQL: ${sql.length} chars`);
            await applySql(SINGLE_URL, sql, 'init_unified');
            fs.unlinkSync(sqlFile);
            console.log('✅ Base única: migración exitosa');
            return;
        } catch (err) {
            if (fs.existsSync(sqlFile)) fs.unlinkSync(sqlFile);
            throw err;
        }
    }

    for (const mod of MODULES) {
        console.log(`\nMigrando: ${mod.name}`);
        const schemaPath = path.join(ROOT, mod.schema);
        const sqlFile = path.join(ROOT, 'prisma', `temp_${mod.name}.sql`);

        execSync(
            `npx prisma migrate diff --from-empty --to-schema "${schemaPath}" --script > "${sqlFile}"`,
            { cwd: ROOT, stdio: 'pipe', env: { ...process.env } }
        );

        const sql = fs.readFileSync(sqlFile, 'utf-8').trim();
        console.log(`  SQL: ${sql.length} chars`);
        console.log(`  Aplicando...`);

        await applySql(mod.url, sql, 'init');
        fs.unlinkSync(sqlFile);

        console.log(`✅ ${mod.name}: migracion exitosa`);
    }
    console.log('\n✅ Todas las migraciones completadas!');
}

run().catch(e => {
    console.error(`❌ Error:`, e.message);
    process.exit(1);
});
