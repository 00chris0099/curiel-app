const cron = require('node-cron');
const clientService = require('../services/clientService');
const { createAuditLog } = require('../middlewares/auditLog');

/**
 * Cron job para auto-eliminacion de clientes
 * Se ejecuta todos los dias a las 2:00 AM
 * Elimina clientes que:
 * - Tienen mas de 15 dias creados
 * - No estan protegidos (isProtected = false)
 * - No tienen inspecciones asociadas
 */
const startAutoDeleteClients = () => {
    cron.schedule('0 2 * * *', async () => {
        console.log('[CRON] Iniciando auto-eliminacion de clientes...');

        try {
            const result = await clientService.autoDeleteClients();

            if (result.deletedCount > 0) {
                console.log(`[CRON] ${result.deletedCount} clientes eliminados自动amente`);
                await createAuditLog(null, 'auto_delete_clients', 'Client', null, {
                    deletedCount: result.deletedCount,
                    deletedIds: result.deletedIds
                });
            } else {
                console.log('[CRON] No hay clientes para eliminar');
            }
        } catch (error) {
            console.error('[CRON] Error en auto-eliminacion de clientes:', error.message);
        }
    });

    console.log('[CRON] Auto-eliminacion de clientes programada: diario a las 2:00 AM');
};

module.exports = { startAutoDeleteClients };
