/**
 * Migra cada módulo generando SQL puro y ejecutándolo directamente.
 * Sin shadow database, sin conflictos entre módulos.
 *
 * Uso: node scripts/migrate-all.js [modulo]
 */
require('dotenv').config();
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const MODULES = [
    {
        name: 'auth',
        schema: 'src/modules/auth/prisma/schema.prisma',
        url: process.env.DATABASE_URL_AUTH,
    },
    {
        name: 'inspecciones',
        schema: 'src/modules/inspecciones/prisma/schema.prisma',
        url: process.env.DATABASE_URL_INSPECCIONES,
    },
    {
        name: 'media',
        schema: 'src/modules/media/prisma/schema.prisma',
        url: process.env.DATABASE_URL_MEDIA,
    },
    {
        name: 'admin',
        schema: 'src/modules/admin/prisma/schema.prisma',
        url: process.env.DATABASE_URL_ADMIN,
    },
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

const ROOT = path.resolve(__dirname, '..');
const TEMP_SQL = path.join(ROOT, 'prisma', 'temp_migration.sql');

async function applySql(url, sql, migrationName) {
    const client = new Client({ connectionString: url, ssl: false });
    await client.connect();
    try {
        await client.query('BEGIN');
        
        // Create _prisma_migrations table if not exists
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
        
        // Check if this migration already applied
        const existing = await client.query(
            'SELECT id FROM _prisma_migrations WHERE migration_name = $1',
            [migrationName]
        );
        
        if (existing.rows.length > 0) {
            console.log(`  Migration "${migrationName}" already applied, skipping.`);
            await client.query('ROLLBACK');
            return;
        }
        
        // Make SQL idempotent: CREATE TABLE -> CREATE TABLE IF NOT EXISTS
        // For enums/types: split SQL and skip statements that fail with "already exists"
        let safeSql = sql
            .replace(/CREATE TABLE\s+/g, 'CREATE TABLE IF NOT EXISTS ');

        // Apply the SQL statement by statement so we can skip existing-type errors
        const statements = safeSql.split(/;\s*\n/).filter(s => s.trim());
        for (const stmt of statements) {
            try {
                await client.query(stmt + ';');
            } catch (stmtErr) {
                // Skip errors about already-existing types/enums
                if (stmtErr.code === '42710' || stmtErr.code === '42P07' ||
                    stmtErr.message?.includes('already exists') ||
                    stmtErr.message?.includes('duplicate_object')) {
                    continue;
                }
                throw stmtErr;
            }
        }
        
        // Record migration
        const id = require('crypto').randomUUID();
        const checksum = require('crypto').createHash('sha256').update(sql).digest('hex');
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
    const args = process.argv.slice(2);
    const targetModule = args[0];

    const modulesToMigrate = targetModule
        ? MODULES.filter(m => m.name === targetModule)
        : MODULES;

    if (modulesToMigrate.length === 0) {
        console.error(`Modulo "${targetModule}" no encontrado. Opciones: ${MODULES.map(m => m.name).join(', ')}`);
        process.exit(1);
    }

    let successCount = 0;
    let failCount = 0;

    for (const mod of modulesToMigrate) {
        const schemaPath = path.join(ROOT, mod.schema);

        console.log(`\n${'='.repeat(60)}`);
        console.log(`Migrando: ${mod.name}`);
        console.log(`Schema:   ${mod.schema}`);
        console.log(`${'='.repeat(60)}`);

        try {
            // 1. Generate SQL from schema diff (empty -> schema)
            console.log(`  Generando SQL...`);
            execSync(
                `npx prisma migrate diff --from-empty --to-schema "${schemaPath}" --script > "${TEMP_SQL}"`,
                { cwd: ROOT, stdio: 'pipe', env: { ...process.env } }
            );

            const sql = fs.readFileSync(TEMP_SQL, 'utf-8').trim();
            if (!sql) {
                throw new Error('Generated SQL is empty');
            }
            console.log(`  SQL generado (${sql.length} caracteres)`);

            // 2. Apply directly to database
            console.log(`  Aplicando a base de datos...`);
            await applySql(mod.url, sql, 'init');
            
            successCount++;
            console.log(`✅ ${mod.name}: migracion exitosa`);
        } catch (err) {
            failCount++;
            console.error(`❌ ${mod.name}: migracion fallo`);
            console.error(err.message?.split('\n').slice(0, 5).join('\n'));
            if (!targetModule) {
                console.log('Continuando con el siguiente modulo...');
            } else {
                process.exit(1);
            }
        }
    }

    // Clean up temp file
    if (fs.existsSync(TEMP_SQL)) fs.unlinkSync(TEMP_SQL);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`Resumen: ${successCount} exitos, ${failCount} fallos de ${modulesToMigrate.length} modulos`);
    console.log(`${'='.repeat(60)}`);

    if (failCount > 0) {
        process.exit(1);
    }
}

run();
