const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { createPool } = require('./dbConnection');

/**
 * Resuelve la URL de la base de datos.
 * Modo NUEVO (recomendado): una sola base de datos con DATABASE_URL
 *   (ej. Supabase). Si no está definida, cae al primer microservicio
 *   (DATABASE_URL_AUTH) para no romper despliegues anteriores.
 */
function resolveDatabaseUrl() {
    if (process.env.DATABASE_URL) {
        return process.env.DATABASE_URL;
    }
    if (process.env.DATABASE_URL_AUTH) {
        return process.env.DATABASE_URL_AUTH;
    }
    throw new Error(
        'No se encontró DATABASE_URL. Define DATABASE_URL (base única) ' +
        'o DATABASE_URL_AUTH (microservicios).'
    );
}

function createClient(databaseUrl) {
    // createPool sanea la URL (quita sslmode para pg >= 8.13) y resuelve SSL
    const pool = createPool(databaseUrl);
    const adapter = new PrismaPg(pool);
    return new PrismaClient({
        adapter,
        log: process.env.NODE_ENV === 'development'
            ? ['error', 'warn']
            : ['error'],
    });
}

/**
 * Un solo PrismaClient para la base de datos UNIFICADA, expuesto bajo los
 * nombres de los antiguos microservicios para que todo el código existente
 * (prisma.auth.user, prisma.inspecciones.inspection, prisma.media.photo,
 * prisma.admin.*, prisma.notificaciones.*, prisma.alertas.*,
 * prisma.auditoria.*) siga funcionando sin cambios.
 *
 * Los nombres de modelos NO colisionan entre módulos (el schema unificado
 * prisma/schema.prisma define cada modelo una sola vez).
 */
let prisma;

if (process.env.NODE_ENV === 'production') {
    const client = createClient(resolveDatabaseUrl());
    prisma = {
        auth: client,
        inspecciones: client,
        media: client,
        admin: client,
        notificaciones: client,
        alertas: client,
        auditoria: client,
    };
} else {
    if (!global.__prismaInstances) {
        const client = createClient(resolveDatabaseUrl());
        global.__prismaInstances = {
            auth: client,
            inspecciones: client,
            media: client,
            admin: client,
            notificaciones: client,
            alertas: client,
            auditoria: client,
        };
    }
    prisma = global.__prismaInstances;
}

async function connectAll() {
    await prisma.auth.$connect();
}

async function disconnectAll() {
    await prisma.auth.$disconnect();
}

module.exports = { prisma, connectAll, disconnectAll };
