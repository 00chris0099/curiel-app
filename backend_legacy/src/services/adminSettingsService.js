const { prisma } = require('../lib/databases');
const logger = require('../utils/logger');

class AdminSettingsService {
    async getDefaultConsideracion() {
        try {
            const rows = await prisma.admin.$queryRawUnsafe(
                `SELECT value FROM admin_settings WHERE key = 'default_consideracion'`
            );
            const value = rows && rows.length > 0 ? String(rows[0].value || '') : '';
            return { text: value || null };
        } catch (error) {
            logger.warn('Error reading default consideracion', { error: error.message });
            return { text: null };
        }
    }

    async setDefaultConsideracion(text) {
        const value = String(text || '').trim();

        await prisma.admin.$executeRawUnsafe(
            `INSERT INTO admin_settings (key, value, updated_at)
             VALUES ('default_consideracion', $1, NOW())
             ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
            value
        );

        logger.info('Default consideracion updated');

        return { text: value || null };
    }
}

module.exports = new AdminSettingsService();
