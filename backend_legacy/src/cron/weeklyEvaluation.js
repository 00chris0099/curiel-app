const cron = require('node-cron');
const evaluationService = require('../services/evaluationService');
const logger = require('../utils/logger');

/**
 * Cron job para generar evaluaciones semanales
 * Se ejecuta cada sabado a las 9:00 AM
 */
const startWeeklyEvaluation = () => {
    cron.schedule('0 9 * * 6', async () => {
        logger.info('[CRON] Iniciando generacion de evaluaciones semanales...');

        try {
            const now = new Date();
            const dayOfWeek = now.getDay();
            const monday = new Date(now);
            monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
            monday.setHours(0, 0, 0, 0);

            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);
            sunday.setHours(23, 59, 59, 999);

            const weekStart = monday.toISOString().split('T')[0];
            const weekEnd = sunday.toISOString().split('T')[0];

            const { User, Role } = require('../models');

            const supervisor = await User.findOne({
                include: [{
                    model: Role,
                    as: 'roles',
                    where: { name: 'supervisor' }
                }],
                where: { isActive: true }
            });

            if (!supervisor) {
                logger.info('[CRON] No se encontro supervisor activo. Saltando generacion.');
                return;
            }

            const results = await evaluationService.generateBulkWeeklyEvaluations(
                weekStart,
                weekEnd,
                supervisor.id
            );

            const successful = results.filter(r => r.success).length;
            const failed = results.filter(r => !r.success).length;

            logger.info(`[CRON] Evaluaciones generadas: ${successful} exitosas, ${failed} fallidas`);

        } catch (error) {
            logger.error('[CRON] Error en generacion de evaluaciones', { error: error.message });
        }
    });

    logger.info('[CRON] Tarea de evaluaciones semanales programada (sabados 9:00 AM)');
};

module.exports = { startWeeklyEvaluation };
