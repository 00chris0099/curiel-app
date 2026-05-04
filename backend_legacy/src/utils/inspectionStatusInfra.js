const { sequelize } = require('../config/database');
const { InspectionStatusHistory } = require('../models');

let ensureInspectionStatusInfraPromise = null;

const ensureInspectionStatusInfra = async () => {
    if (!ensureInspectionStatusInfraPromise) {
        ensureInspectionStatusInfraPromise = (async () => {
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

            await InspectionStatusHistory.sync();
        })().catch((error) => {
            ensureInspectionStatusInfraPromise = null;
            throw error;
        });
    }

    return ensureInspectionStatusInfraPromise;
};

module.exports = {
    ensureInspectionStatusInfra
};
