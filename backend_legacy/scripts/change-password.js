require('dotenv').config();
const bcrypt = require('bcryptjs');

const EMAIL = process.argv[2] || 'admin@curiel.com';
const NEW_PASSWORD = process.argv[3];

if (!NEW_PASSWORD) {
    console.error('Uso: node scripts/change-password.js <email> <nueva-contrasena>');
    console.error('Ejemplo: node scripts/change-password.js admin@curiel.com MiNuevaPass123');
    process.exit(1);
}

const changePassword = async () => {
    try {
        const { PrismaClient } = require('@prisma/client');
        const { PrismaPg } = require('@prisma/adapter-pg');
        const { createPool } = require('../src/lib/dbConnection');

        const DATABASE_URL = process.env.DATABASE_URL || process.env.DATABASE_URL_AUTH;
        if (!DATABASE_URL) {
            console.error('DATABASE_URL (o DATABASE_URL_AUTH) no definida en .env');
            process.exit(1);
        }

        // createPool sanea la URL (quita sslmode para pg >= 8.13) y resuelve SSL
        const pool = createPool(DATABASE_URL);
        const adapter = new PrismaPg(pool);
        const prisma = new PrismaClient({ adapter });

        await prisma.$connect();
        console.log('Conectado a la base de datos');

        const user = await prisma.user.findUnique({ where: { email: EMAIL } });
        if (!user) {
            console.error(`Usuario no encontrado: ${EMAIL}`);
            await prisma.$disconnect();
            process.exit(1);
        }

        const passwordHash = await bcrypt.hash(NEW_PASSWORD, 10);
        await prisma.user.update({
            where: { email: EMAIL },
            data: { passwordHash }
        });

        console.log(`Contrasena actualizada para: ${EMAIL}`);
        await prisma.$disconnect();
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
};

changePassword();
