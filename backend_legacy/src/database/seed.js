require('dotenv').config();
const {
    User,
    Role,
    UserRole,
    ChecklistTemplate,
    ChecklistItem
} = require('../models');
const { sequelize } = require('../config/database');
const logger = require('../utils/logger');

const rolesToCreate = [
    { name: 'admin', description: 'Administrador del sistema' },
    { name: 'supervisor', description: 'Supervisor de calidad y monitoreo' },
    { name: 'arquitecto', description: 'Arquitecto y coordinador de inspecciones' },
    { name: 'inspector', description: 'Inspector de campo' }
];

const templatesToCreate = [
    {
        name: 'Inspeccion Estructural',
        description: 'Checklist para verificacion de elementos estructurales',
        inspectionType: 'estructural',
        items: [
            { itemText: 'Verificar condicion de cimientos', category: 'Cimientos', orderIndex: 1, isRequired: true },
            { itemText: 'Revisar columnas y ausencia de fisuras', category: 'Columnas', orderIndex: 2, isRequired: true },
            { itemText: 'Verificar vigas y alineacion correcta', category: 'Vigas', orderIndex: 3, isRequired: true },
            { itemText: 'Inspeccionar losas sin grietas visibles', category: 'Losas', orderIndex: 4, isRequired: true },
            { itemText: 'Revisar muros de carga', category: 'Muros', orderIndex: 5, isRequired: false }
        ]
    },
    {
        name: 'Inspeccion Electrica',
        description: 'Checklist para sistema electrico',
        inspectionType: 'electrica',
        items: [
            { itemText: 'Verificar tablero electrico e identificacion', category: 'Tablero', orderIndex: 1, isRequired: true },
            { itemText: 'Revisar cableado y codigo de colores', category: 'Cableado', orderIndex: 2, isRequired: true },
            { itemText: 'Verificar conexion a tierra', category: 'Seguridad', orderIndex: 3, isRequired: true },
            { itemText: 'Inspeccionar tomas de corriente', category: 'Tomas', orderIndex: 4, isRequired: false },
            { itemText: 'Revisar iluminacion general', category: 'Iluminacion', orderIndex: 5, isRequired: false }
        ]
    },
    {
        name: 'Inspeccion de Seguridad',
        description: 'Checklist de seguridad y prevencion en obra',
        inspectionType: 'seguridad',
        items: [
            { itemText: 'Personal con equipo de proteccion personal', category: 'EPP', orderIndex: 1, isRequired: true },
            { itemText: 'Senalizacion de areas de riesgo', category: 'Senalizacion', orderIndex: 2, isRequired: true },
            { itemText: 'Andamios en condiciones seguras', category: 'Andamios', orderIndex: 3, isRequired: true },
            { itemText: 'Escaleras certificadas y en buen estado', category: 'Escaleras', orderIndex: 4, isRequired: false },
            { itemText: 'Extintores disponibles y vigentes', category: 'Extintores', orderIndex: 5, isRequired: true },
            { itemText: 'Botiquin de primeros auxilios disponible', category: 'Salud', orderIndex: 6, isRequired: false }
        ]
    }
];

const getTableColumns = async (tableName) => {
    try {
        return await sequelize.getQueryInterface().describeTable(tableName);
    } catch (error) {
        return null;
    }
};

const seed = async () => {
    try {
        logger.info('Iniciando seed de datos...');

        logger.info('Creando roles base...');
        const createdRoles = {};

        for (const roleData of rolesToCreate) {
            const [role] = await Role.findOrCreate({
                where: { name: roleData.name },
                defaults: roleData
            });

            createdRoles[roleData.name] = role;
        }

        logger.info('Roles verificados', { roles: Object.keys(createdRoles) });

        logger.info('Creando master admin...');

        const adminEmail = process.env.ADMIN_EMAIL || 'admin@curiel.com';
        const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

        let admin = await User.findOne({ where: { email: adminEmail } });
        let createdAdmin = false;

        if (!admin) {
            admin = await User.create({
                email: adminEmail,
                password: adminPassword,
                fullName: 'Admin Sistema',
                phone: '+1234567890',
                isActive: true,
                isMasterAdmin: true
            });
            createdAdmin = true;
        }

        if (!createdAdmin) {
            admin.isActive = true;
            admin.isMasterAdmin = true;
            await admin.save();
        }

        await UserRole.findOrCreate({
            where: {
                userId: admin.id,
                roleId: createdRoles.admin.id
            },
            defaults: {
                assignedBy: admin.id
            }
        });

        logger.info('Master admin verificado', { email: adminEmail });

        const userColumns = await getTableColumns('users');
        const hasLegacyRoleColumn = userColumns && Object.prototype.hasOwnProperty.call(userColumns, 'role');
        let legacyUsersCount = 0;

        if (hasLegacyRoleColumn) {
            const [legacyUsers] = await sequelize.query(`
                SELECT id, role
                FROM users
                WHERE role IS NOT NULL
            `);

            legacyUsersCount = legacyUsers.length;

            for (const legacyUser of legacyUsers) {
                const legacyRole = createdRoles[legacyUser.role];

                if (!legacyRole) {
                    continue;
                }

                await UserRole.findOrCreate({
                    where: {
                        userId: legacyUser.id,
                        roleId: legacyRole.id
                    },
                    defaults: {
                        assignedBy: admin.id
                    }
                });
            }
        }

        logger.info('Roles heredados sincronizados', { count: legacyUsersCount });

        logger.info('Creando plantillas de checklist...');

        for (const templateData of templatesToCreate) {
            const [template] = await ChecklistTemplate.findOrCreate({
                where: { name: templateData.name },
                defaults: {
                    name: templateData.name,
                    description: templateData.description,
                    inspectionType: templateData.inspectionType,
                    createdById: admin.id,
                    isActive: true
                }
            });

            for (const itemData of templateData.items) {
                await ChecklistItem.findOrCreate({
                    where: {
                        templateId: template.id,
                        itemText: itemData.itemText
                    },
                    defaults: {
                        templateId: template.id,
                        itemText: itemData.itemText,
                        category: itemData.category,
                        orderIndex: itemData.itemIndex,
                        isRequired: itemData.isRequired
                    }
                });
            }
        }

        const templatesCount = await ChecklistTemplate.count();
        const itemsCount = await ChecklistItem.count();

        logger.info('Seed completado exitosamente', {
            roles: rolesToCreate.length,
            admin: adminEmail,
            templates: templatesCount,
            items: itemsCount
        });

        process.exit(0);
    } catch (error) {
        logger.error('Error en seed', { error: error.message, stack: error.stack });
        process.exit(1);
    }
};

seed();
