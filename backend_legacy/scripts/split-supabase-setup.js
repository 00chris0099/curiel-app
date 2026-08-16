/**
 * Divide supabase/setup.sql en 5 scripts pequeños, seguros e idempotentes,
 * listos para copiar y pegar uno por uno en el SQL Editor de Supabase.
 *
 * Los scripts más cortos evitan el error "removeChild" del editor (provocado
 * por extensiones del navegador con archivos grandes) y permiten reintentar
 * solo la parte que falle.
 *
 * Uso: node scripts/split-supabase-setup.js
 * Salida: supabase/partes/01-enums.sql ... 05-seed.sql
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SETUP = path.join(ROOT, 'supabase', 'setup.sql');
const OUT_DIR = path.join(ROOT, 'supabase', 'partes');

const sql = fs.readFileSync(SETUP, 'utf-8');

// --- Puntos de corte por patrones (robusto ante cambios de líneas) ---
const startTables = sql.indexOf('CREATE TABLE IF NOT EXISTS "users"');
const startIndexes = sql.indexOf('CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key"');
const startFks = sql.indexOf("IF NOT EXISTS (SELECT 1 FROM pg_constraint");
const startSeed = sql.indexOf('-- SEED (roles, admin, configuración)');

for (const [name, idx] of [['tablas', startTables], ['indices', startIndexes], ['fks', startFks], ['seed', startSeed]]) {
    if (idx === -1) {
        console.error(`No se encontró el marcador de sección: ${name}`);
        process.exit(1);
    }
}

// Ajustes: los bloques DO $$ de enums terminan justo antes de startTables;
// los FKs empiezan en el primer "DO $$" que antecede a startFks.
const fkBlockStart = sql.lastIndexOf('DO $$ BEGIN', startFks);

// Sección 4 (FKs): desde el primer DO $$ de constraint hasta el inicio del seed.
const fksEnd = startSeed;
// El seed incluye el comentario "-- SEED (roles, admin, configuración)" que
// aparece dos veces; tomamos desde el marcador hasta el final del archivo.
const seedStart = startSeed;

const parts = [
    {
        file: '01-enums.sql',
        title: 'TIPO DE DATOS (enums) + extensión uuid',
        body: sql.slice(0, startTables),
    },
    {
        file: '02-tablas.sql',
        title: 'TABLAS (29)',
        body: sql.slice(startTables, startIndexes),
    },
    {
        file: '03-indices.sql',
        title: 'ÍNDICES',
        body: sql.slice(startIndexes, fkBlockStart),
    },
    {
        file: '04-llaves-foraneas.sql',
        title: 'LLAVES FORÁNEAS (relaciones entre tablas)',
        body: sql.slice(fkBlockStart, fksEnd),
    },
    {
        file: '05-seed.sql',
        title: 'DATOS INICIALES (roles, admin, consideración por defecto)',
        body: sql.slice(seedStart),
    },
];

fs.mkdirSync(OUT_DIR, { recursive: true });

for (const part of parts) {
    const header = [
        '-- ============================================================================',
        `-- ${part.file} — ${part.title}`,
        '-- Extraído de supabase/setup.sql (proyecto CURIEL — base única / Supabase)',
        '-- IDEMPOTENTE: se puede ejecutar más de una vez sin errores ni duplicados.',
        '-- ============================================================================',
        '',
        '',
    ].join('\n');
    const content = part.body.trim() + '\n';
    fs.writeFileSync(path.join(OUT_DIR, part.file), header + content, 'utf-8');
    const lines = content.split('\n').length;
    console.log(`✅ ${part.file} (${lines} líneas)`);
}

console.log(`\nListo. Copia y pega en orden en el SQL Editor de Supabase: ${parts.map(p => p.file).join(' → ')}`);
