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
        const prisma = new PrismaClient({
            datasources: {
                db: { url: process.env.DATABASE_URL_AUTH || process.env.DATABASE_URL }
            }
        });

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
