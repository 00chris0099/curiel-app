require('dotenv').config();
const { sequelize } = require('../config/database');
const models = require('../models');
const logger = require('../utils/logger');

const getTableColumns = async (tableName) => {
    const [rows] = await sequelize.query(
        `SELECT column_name
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = '${tableName}'`
    );

    return new Set(rows.map((row) => row.column_name));
};

const prepareLegacyUsersTable = async () => {
    const columns = await getTableColumns('users');

    if (!columns.size) {
        return;
    }

    if (!columns.has('full_name')) {
        await sequelize.query('ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "full_name" VARCHAR(255);');
    }

    if (columns.has('firstName') || columns.has('lastName')) {
        await sequelize.query(`
            UPDATE "users"
            SET "full_name" = COALESCE(
                NULLIF(TRIM(COALESCE("firstName", '') || ' ' || COALESCE("lastName", '')), ''),
                split_part(email, '@', 1)
            )
            WHERE "full_name" IS NULL OR TRIM("full_name") = '';
        `);
    }

    if (!columns.has('password_hash')) {
        await sequelize.query('ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_hash" VARCHAR(255);');
    }

    if (columns.has('password')) {
        await sequelize.query(`
            UPDATE "users"
            SET "password_hash" = "password"
            WHERE "password_hash" IS NULL OR TRIM("password_hash") = '';
        `);
    }

    if (!columns.has('is_active')) {
        await sequelize.query('ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN DEFAULT true;');
    }

    if (columns.has('isActive')) {
        await sequelize.query(`
            UPDATE "users"
            SET "is_active" = COALESCE("isActive", true)
            WHERE "is_active" IS NULL;
        `);
    }

    if (!columns.has('is_master_admin')) {
        await sequelize.query('ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_master_admin" BOOLEAN DEFAULT false;');
    }

    if (!columns.has('created_by')) {
        await sequelize.query('ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "created_by" UUID;');
    }

    if (!columns.has('created_at')) {
        await sequelize.query('ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ;');
    }

    if (columns.has('createdAt')) {
        await sequelize.query(`
            UPDATE "users"
            SET "created_at" = COALESCE("created_at", "createdAt", NOW())
            WHERE "created_at" IS NULL;
        `);
    } else {
        await sequelize.query('UPDATE "users" SET "created_at" = COALESCE("created_at", NOW()) WHERE "created_at" IS NULL;');
    }

    if (!columns.has('updated_at')) {
        await sequelize.query('ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ;');
    }

    if (columns.has('updatedAt')) {
        await sequelize.query(`
            UPDATE "users"
            SET "updated_at" = COALESCE("updated_at", "updatedAt", NOW())
            WHERE "updated_at" IS NULL;
        `);
    } else {
        await sequelize.query('UPDATE "users" SET "updated_at" = COALESCE("updated_at", NOW()) WHERE "updated_at" IS NULL;');
    }

    await sequelize.query('ALTER TABLE "users" ALTER COLUMN "full_name" SET NOT NULL;');
    await sequelize.query('ALTER TABLE "users" ALTER COLUMN "password_hash" SET NOT NULL;');
    await sequelize.query('ALTER TABLE "users" ALTER COLUMN "is_master_admin" SET NOT NULL;');
    await sequelize.query('ALTER TABLE "users" ALTER COLUMN "created_at" SET NOT NULL;');
    await sequelize.query('ALTER TABLE "users" ALTER COLUMN "updated_at" SET NOT NULL;');
};

const prepareInspectionStatusEnum = async () => {
    const statusValues = ['lista_revision', 'reprogramada'];

    for (const value of statusValues) {
        await sequelize.query(`
            DO $$
            BEGIN
                ALTER TYPE "enum_inspections_status" ADD VALUE IF NOT EXISTS '${value}';
            EXCEPTION
                WHEN undefined_object THEN NULL;
            END $$;
        `);
    }
};

/**
 * Script de migración: Crea todas las tablas
 */
const migrate = async () => {
    try {
        logger.info('Iniciando migracion de base de datos...');

        await sequelize.authenticate();
        logger.info('Conexion a base de datos exitosa');

        await prepareLegacyUsersTable();
        await prepareInspectionStatusEnum();

        await sequelize.sync({ force: false, alter: true });

        logger.info('Migracion completada exitosamente', {
            tables: [
                'users', 'roles', 'user_roles', 'clients', 'inspections',
                'inspection_status_histories', 'inspection_areas',
                'inspection_observations', 'inspection_summaries',
                'notifications', 'checklist_templates', 'checklist_items',
                'inspection_responses', 'photos', 'signatures', 'audit_logs',
                'refresh_tokens'
            ]
        });

        process.exit(0);
    } catch (error) {
        logger.error('Error en la migracion', { error: error.message, stack: error.stack });
        process.exit(1);
    }
};

migrate();
