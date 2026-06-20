require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const DATABASE_URL = process.env.DATABASE_URL_AUTH;

if (!DATABASE_URL) {
    console.error('DATABASE_URL_AUTH no definida en .env');
    process.exit(1);
}

const adapter = new PrismaPg({ connectionString: DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const ROLES = [
    { name: 'admin', description: 'Administrador del sistema con acceso completo' },
    { name: 'supervisor', description: 'Supervisa inspecciones y genera evaluaciones' },
    { name: 'arquitecto', description: 'Arquitecto que revisa y aprueba informes' },
    { name: 'inspector', description: 'Inspector que realiza inspecciones en campo' },
];

const ADMIN_USER = {
    fullName: 'Admin Curiel',
    email: 'admin@curiel.com',
    password: 'Admin123*',
    isMasterAdmin: true,
};

async function main() {
    console.log('Iniciando seed de curiel_auth...\n');

    // 1. Crear roles
    const roles = {};
    for (const role of ROLES) {
        const existing = await prisma.role.findUnique({ where: { name: role.name } });
        if (existing) {
            roles[role.name] = existing;
            console.log(`  Rol "${role.name}" ya existe (id: ${existing.id})`);
        } else {
            const created = await prisma.role.create({ data: role });
            roles[role.name] = created;
            console.log(`  Rol "${role.name}" creado (id: ${created.id})`);
        }
    }

    // 2. Crear usuario admin
    const existingAdmin = await prisma.user.findUnique({ where: { email: ADMIN_USER.email } });
    let adminUser;

    if (existingAdmin) {
        adminUser = existingAdmin;
        console.log(`\n  Usuario admin "${ADMIN_USER.email}" ya existe (id: ${existingAdmin.id})`);
        const passwordHash = await bcrypt.hash(ADMIN_USER.password, 12);
        const passwordMatches = await bcrypt.compare(ADMIN_USER.password, existingAdmin.passwordHash);
        if (!existingAdmin.isMasterAdmin || !passwordMatches) {
            await prisma.user.update({
                where: { id: existingAdmin.id },
                data: { passwordHash, isMasterAdmin: ADMIN_USER.isMasterAdmin, isActive: true },
            });
            console.log('  Password y flags actualizados');
        }
    } else {
        const passwordHash = await bcrypt.hash(ADMIN_USER.password, 12);
        adminUser = await prisma.user.create({
            data: {
                fullName: ADMIN_USER.fullName,
                email: ADMIN_USER.email,
                passwordHash,
                isMasterAdmin: ADMIN_USER.isMasterAdmin,
                isActive: true,
            },
        });
        console.log(`\n  Usuario admin creado: ${ADMIN_USER.email} (id: ${adminUser.id})`);
        console.log(`  Password: ${ADMIN_USER.password}`);
    }

    // 3. Asignar rol admin al usuario admin
    const existingUserRole = await prisma.userRole.findUnique({
        where: { userId_roleId: { userId: adminUser.id, roleId: roles.admin.id } },
    });

    if (!existingUserRole) {
        await prisma.userRole.create({
            data: {
                userId: adminUser.id,
                roleId: roles.admin.id,
            },
        });
        console.log('  Rol "admin" asignado al usuario admin');
    } else {
        console.log('  Usuario admin ya tiene rol "admin"');
    }

    console.log('\nSeed de curiel_auth completado exitosamente.');
}

main()
    .catch((error) => {
        console.error('Error durante el seed:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
