/**
 * Genera los scripts SQL para Supabase (base de datos única) a partir del
 * schema Prisma unificado (prisma/schema.prisma).
 *
 * Salida:
 *   supabase/schema.sql  -> DDL idempotente (enums, tablas, índices, FKs)
 *   supabase/setup.sql   -> schema.sql + seed.sql (un solo script para pegar
 *                           en el SQL Editor de Supabase)
 *
 * Uso: node scripts/generate-supabase-sql.js
 * Requiere: npx prisma disponible (se ejecuta prisma migrate diff).
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SCHEMA = path.join(ROOT, 'prisma', 'schema.prisma');
const OUT_SCHEMA = path.join(ROOT, 'supabase', 'schema.sql');
const SEED_FILE = path.join(ROOT, 'supabase', 'seed.sql');
const OUT_SETUP = path.join(ROOT, 'supabase', 'setup.sql');
const TMP = path.join(ROOT, 'prisma', 'temp_supabase.sql');

const HEADER = `-- ============================================================================
-- CURIEL - Esquema UNIFICADO (una sola base de datos / Supabase)
-- Generado automáticamente desde prisma/schema.prisma
-- Idempotente: se puede ejecutar más de una vez sin errores.
-- ============================================================================
`;

// Recoge un statement (puede ocupar varias líneas) empezando en startIdx.
// Devuelve el texto completo (incluyendo la línea que termina en ';') y el
// índice de la siguiente línea.
function collectStatement(lines, startIdx) {
    const body = [];
    let i = startIdx;
    while (i < lines.length) {
        body.push(lines[i]);
        if (lines[i].trim().endsWith(';')) {
            i++;
            break;
        }
        i++;
    }
    return { body: body.join('\n'), nextIndex: i };
}

function wrapEnum(name, body) {
    return `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '${name}') THEN
        ${body.trim()}
    END IF;
END $$;
`;
}

function wrapConstraint(alterSql) {
    const m = alterSql.match(/ADD CONSTRAINT "([^"]+)"/);
    const conName = m ? m[1] : null;
    if (!conName) return alterSql;
    return `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '${conName}') THEN
        ${alterSql.trim()}
    END IF;
END $$;
`;
}

function transform(sql) {
    const lines = sql.split('\n');
    const out = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];

        // CREATE TYPE -> DO block idempotente
        if (/^CREATE TYPE/.test(line)) {
            const nameMatch = line.match(/CREATE TYPE "([^"]+)"/);
            const name = nameMatch ? nameMatch[1] : null;
            const { body, nextIndex } = collectStatement(lines, i);
            i = nextIndex;
            if (name) {
                out.push(wrapEnum(name, body));
            } else {
                out.push(body);
            }
            continue;
        }

        // CREATE TABLE -> IF NOT EXISTS
        if (/^CREATE TABLE /.test(line)) {
            out.push(line.replace(/^CREATE TABLE /, 'CREATE TABLE IF NOT EXISTS '));
            i++;
            continue;
        }

        // CREATE [UNIQUE] INDEX -> IF NOT EXISTS
        if (/^CREATE (UNIQUE )?INDEX /.test(line)) {
            out.push(line.replace(/^CREATE (UNIQUE )?INDEX /, 'CREATE $1INDEX IF NOT EXISTS '));
            i++;
            continue;
        }

        // ALTER TABLE ... ADD CONSTRAINT -> DO block idempotente
        if (/^ALTER TABLE ".*" ADD CONSTRAINT/.test(line)) {
            const { body, nextIndex } = collectStatement(lines, i);
            i = nextIndex;
            out.push(wrapConstraint(body));
            continue;
        }

        // Comentarios de Prisma (-- CreateEnum, -- CreateTable, etc.)
        if (/^-- (CreateEnum|CreateTable|CreateIndex|CreateUniqueIndex|CreateSchema|AddForeignKey)/.test(line)) {
            i++;
            continue;
        }

        out.push(line);
        i++;
    }

    return out.join('\n');
}

function main() {
    if (!fs.existsSync(SCHEMA)) {
        console.error(`Schema no encontrado: ${SCHEMA}`);
        process.exit(1);
    }

    console.log('Generando DDL desde el schema unificado...');
    execSync(
        `npx prisma migrate diff --from-empty --to-schema "${SCHEMA}" --script > "${TMP}"`,
        { cwd: ROOT, stdio: 'pipe' }
    );

    const raw = fs.readFileSync(TMP, 'utf-8');
    const transformed = transform(raw);

    // Quitar el "CREATE SCHEMA public" si viene (Supabase ya lo tiene)
    const cleaned = transformed
        .replace(/CREATE SCHEMA IF NOT EXISTS "public";\n\n/, '')
        .replace(/^-- CreateSchema\n/, '');

    const schemaSql = `${HEADER}\n-- Extensión auxiliar (uuid aleatorios en SQL crudo)\nCREATE EXTENSION IF NOT EXISTS pgcrypto;\n\n${cleaned.trim()}\n`;

    fs.mkdirSync(path.dirname(OUT_SCHEMA), { recursive: true });
    fs.writeFileSync(OUT_SCHEMA, schemaSql, 'utf-8');
    console.log(`✔ supabase/schema.sql generado (${schemaSql.split('\n').length} líneas)`);

    // setup.sql = schema + seed
    if (fs.existsSync(SEED_FILE)) {
        const seed = fs.readFileSync(SEED_FILE, 'utf-8');
        const setup = `${schemaSql}\n\n-- ============================================================================\n-- SEED (roles, admin, configuración)\n-- ============================================================================\n\n${seed.trim()}\n`;
        fs.writeFileSync(OUT_SETUP, setup, 'utf-8');
        console.log(`✔ supabase/setup.sql generado (schema + seed)`);
    } else {
        console.warn(`⚠ ${SEED_FILE} no existe; setup.sql no incluye seed.`);
    }

    fs.unlinkSync(TMP);
    console.log('Listo.');
}

main();
