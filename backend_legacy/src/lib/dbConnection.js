/**
 * Helper compartido para conexiones a PostgreSQL (pg / Prisma adapter).
 *
 * Con pg >= 8.13, la librería pg-connection-string trata sslmode=require
 * como alias de verify-full (verificación estricta del certificado) y
 * sobrescribe la opción ssl pasada al cliente — provocando el error
 * "self-signed certificate in certificate chain" con Supabase u otros
 * proveedores que usan certificados propios.
 *
 * Solución: quitar el parámetro sslmode de la URL ANTES de entregarla a pg
 * y pasar ssl explícitamente (rejectUnauthorized: false) según DATABASE_SSL.
 */
const { Pool } = require('pg');

/**
 * Elimina el query param sslmode de la URL de conexión.
 * 'postgres://u:p@host:5432/db?sslmode=require' -> 'postgres://u:p@host:5432/db'
 */
function sanitizeDatabaseUrl(url) {
    if (!url) return url;
    try {
        const u = new URL(url);
        u.searchParams.delete('sslmode');
        return u.toString();
    } catch {
        // Fallback por regex si la URL no es parseable por WHATWG URL
        return String(url).replace(/[?&]sslmode=[^&]*/g, '');
    }
}

/**
 * Resuelve la configuración SSL.
 * - DATABASE_SSL=true|1|yes|on  -> SSL sin verificación de certificado
 * - sslmode en la URL           -> SSL sin verificación de certificado
 * - cualquier otro caso         -> sin SSL
 */
function resolveSsl(databaseUrl) {
    const sslFlag = String(process.env.DATABASE_SSL || '').toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(sslFlag)) {
        return { rejectUnauthorized: false };
    }
    if (/sslmode=(require|no-verify|prefer)/i.test(databaseUrl || '')) {
        return { rejectUnauthorized: false };
    }
    return undefined;
}

/** Crea un Pool de pg con la URL saneada y SSL resuelto. */
function createPool(databaseUrl) {
    return new Pool({
        connectionString: sanitizeDatabaseUrl(databaseUrl),
        ssl: resolveSsl(databaseUrl),
    });
}

module.exports = { sanitizeDatabaseUrl, resolveSsl, createPool };
