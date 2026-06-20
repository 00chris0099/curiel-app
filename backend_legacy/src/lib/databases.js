const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

function createClient(databaseUrl) {
    const adapter = new PrismaPg({ connectionString: databaseUrl });
    return new PrismaClient({
        adapter,
        log: process.env.NODE_ENV === 'development'
            ? ['error', 'warn']
            : ['error'],
    });
}

let prisma;

if (process.env.NODE_ENV === 'production') {
    prisma = {
        auth: createClient(process.env.DATABASE_URL_AUTH),
        inspecciones: createClient(process.env.DATABASE_URL_INSPECCIONES),
        media: createClient(process.env.DATABASE_URL_MEDIA),
        admin: createClient(process.env.DATABASE_URL_ADMIN),
        notificaciones: createClient(process.env.DATABASE_URL_NOTIFICACIONES),
        alertas: createClient(process.env.DATABASE_URL_ALERTAS),
        auditoria: createClient(process.env.DATABASE_URL_AUDITORIA),
    };
} else {
    if (!global.__prismaInstances) {
        global.__prismaInstances = {
            auth: createClient(process.env.DATABASE_URL_AUTH),
            inspecciones: createClient(process.env.DATABASE_URL_INSPECCIONES),
            media: createClient(process.env.DATABASE_URL_MEDIA),
            admin: createClient(process.env.DATABASE_URL_ADMIN),
            notificaciones: createClient(process.env.DATABASE_URL_NOTIFICACIONES),
            alertas: createClient(process.env.DATABASE_URL_ALERTAS),
            auditoria: createClient(process.env.DATABASE_URL_AUDITORIA),
        };
    }
    prisma = global.__prismaInstances;
}

async function connectAll() {
    await Promise.all([
        prisma.auth.$connect(),
        prisma.inspecciones.$connect(),
        prisma.media.$connect(),
        prisma.admin.$connect(),
        prisma.notificaciones.$connect(),
        prisma.alertas.$connect(),
        prisma.auditoria.$connect(),
    ]);
}

async function disconnectAll() {
    await Promise.all([
        prisma.auth.$disconnect(),
        prisma.inspecciones.$disconnect(),
        prisma.media.$disconnect(),
        prisma.admin.$disconnect(),
        prisma.notificaciones.$disconnect(),
        prisma.alertas.$disconnect(),
        prisma.auditoria.$disconnect(),
    ]);
}

module.exports = { prisma, connectAll, disconnectAll };
