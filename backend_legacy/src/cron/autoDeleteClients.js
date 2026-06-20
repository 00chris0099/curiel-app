const cron = require('node-cron');
const clientService = require('../services/clientService');
const { createAuditLog } = require('../middlewares/auditLog');
const logger = require('../utils/logger');

/**
 * Cron job para auto-eliminacion de clientes
 * Se ejecuta todos los dias a las 2:00 AM
 */
const startAutoDeleteClients = () => {
    cron.schedule('0 2 * * *', async () => {
        logger.info('[CRON] Iniciando auto-eliminacion de clientes...');

        try {
            const result = await clientService.autoDeleteClients();

            if (result.deletedCount > 0) {
                logger.info(`[CRON] ${result.deletedCount} clientes eliminados automaticamente`);
                await createAuditLog(null, 'auto_delete_clients', 'Client', null, {
                    deletedCount: result.deletedCount,
                    deletedIds: result.deletedIds
                });
            } else {
                logger.info('[CRON] No hay clientes para eliminar');
            }
        } catch (error) {
            logger.error('[CRON] Error en auto-eliminacion de clientes', { error: error.message });
        }
    });

    logger.info('[CRON] Auto-eliminacion de clientes programada: diario a las 2:00 AM');
};

module.exports = { startAutoDeleteClients };
