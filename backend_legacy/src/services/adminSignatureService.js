const { prisma } = require('../lib/databases');
const { uploadToCloudinary } = require('../utils/cloudinary');
const logger = require('../utils/logger');

class AdminSignatureService {
    async getSignature() {
        try {
            const rows = await prisma.admin.$queryRaw`
                SELECT key, value FROM admin_settings
                WHERE key IN ('admin_signature_url', 'admin_signature_name')
            `;

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

        await prisma.admin.$executeRaw`
            INSERT INTO admin_settings (key, value, updated_at)
            VALUES ('admin_signature_url', ${result.url}, NOW())
            ON CONFLICT (key) DO UPDATE SET value = ${result.url}, updated_at = NOW()
        `;

        await prisma.admin.$executeRaw`
            INSERT INTO admin_settings (key, value, updated_at)
            VALUES ('admin_signature_name', ${userId}, NOW())
            ON CONFLICT (key) DO UPDATE SET value = ${userId}, updated_at = NOW()
        `;

        logger.info('Admin signature uploaded', { url: result.url });

        return {
            url: result.url,
            name: userId
        };
    }

    async deleteSignature() {
        await prisma.admin.$executeRaw`
            DELETE FROM admin_settings
            WHERE key IN ('admin_signature_url', 'admin_signature_name')
        `;

        logger.info('Admin signature deleted');
    }
}

module.exports = new AdminSignatureService();
