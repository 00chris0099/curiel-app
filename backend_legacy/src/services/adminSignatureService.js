const { prisma } = require('../lib/databases');
const { uploadToCloudinary } = require('../utils/cloudinary');
const logger = require('../utils/logger');

class AdminSignatureService {
    async getSignature() {
        try {
            const rows = await prisma.admin.$queryRawUnsafe(
                `SELECT key, value FROM admin_settings
                 WHERE key IN ('admin_signature_url', 'admin_signature_name')`
            );

            const settings = {};
            for (const row of rows) {
                settings[row.key] = row.value;
            }

            return {
                url: settings.admin_signature_url || null,
                name: settings.admin_signature_name || null
            };
        } catch (error) {
            logger.warn('Error reading admin signature', { error: error.message });
            return { url: null, name: null };
        }
    }

    async uploadSignature(file, userId) {
        const result = await uploadToCloudinary(file.buffer, {
            folder: 'curiel/admin/signature',
            resource_type: 'image',
            format: 'png'
        });

        await prisma.admin.$executeRawUnsafe(
            `INSERT INTO admin_settings (key, value, updated_at)
             VALUES ('admin_signature_url', $1, NOW())
             ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
            result.url
        );

        await prisma.admin.$executeRawUnsafe(
            `INSERT INTO admin_settings (key, value, updated_at)
             VALUES ('admin_signature_name', $1, NOW())
             ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
            userId
        );

        logger.info('Admin signature uploaded', { url: result.url });

        return {
            url: result.url,
            name: userId
        };
    }

    async deleteSignature() {
        await prisma.admin.$executeRawUnsafe(
            `DELETE FROM admin_settings
             WHERE key IN ('admin_signature_url', 'admin_signature_name')`
        );

        logger.info('Admin signature deleted');
    }
}

module.exports = new AdminSignatureService();
