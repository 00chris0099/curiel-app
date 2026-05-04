const axios = require('axios');
const config = require('../config');

/**
 * Disparar webhook de n8n
 * @param {string} webhookType - Tipo de webhook (inspectionCompleted, userNotification, auditLog)
 * @param {object} data - Datos a enviar
 */
const triggerN8nWebhook = async (webhookType, data) => {
    try {
        let webhookUrl;

        switch (webhookType) {
            case 'inspectionCompleted':
                webhookUrl = config.n8n.inspectionCompleted;
                break;
            case 'userNotification':
                webhookUrl = config.n8n.userNotification;
                break;
            case 'auditLog':
                webhookUrl = config.n8n.auditLog;
                break;
            default:
                throw new Error(`Tipo de webhook desconocido: ${webhookType}`);
        }

        if (!webhookUrl) {
            console.warn(`⚠️ Webhook ${webhookType} no configurado`);
            return null;
        }

        const response = await axios.post(webhookUrl, {
            ...data,
            timestamp: new Date().toISOString(),
            source: 'CURIEL-Backend'
        }, {
            timeout: 5000
        });

        console.log(`✅ Webhook ${webhookType} disparado exitosamente`);
        return response.data;
    } catch (error) {
        console.error(`❌ Error al disparar webhook ${webhookType}:`, error.message);
        // No lanzamos error para no romper el flujo principal
        return null;
    }
};

module.exports = {
    triggerN8nWebhook
};
