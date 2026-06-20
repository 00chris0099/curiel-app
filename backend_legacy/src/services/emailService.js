const nodemailer = require('nodemailer');
const config = require('../config');
const logger = require('../utils/logger');
const { emailsSent } = require('../utils/metrics');

let transporter = null;

const getTransporter = () => {
    if (transporter) return transporter;

    const { host, port, secure } = config.email;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD;

    if (!user || !pass) {
        logger.warn('SMTP credentials not configured. Emails will be logged but not sent.');
        return null;
    }

    transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass }
    });

    return transporter;
};

const sendEmail = async ({ to, subject, html, text }) => {
    const transport = getTransporter();
    const from = `"${config.email.from.name}" <${config.email.from.email}>`;

    const mailOptions = { from, to, subject, html, text };

    if (!transport) {
        logger.info('[DRY-RUN] Email would be sent', { to, subject });
        emailsSent.inc({ status: 'dry_run', type: 'unknown' });
        return { success: true, dryRun: true };
    }

    try {
        const info = await transport.sendMail(mailOptions);
        logger.info('Email enviado', { messageId: info.messageId, to, subject });
        emailsSent.inc({ status: 'sent', type: 'unknown' });
        return { success: true, messageId: info.messageId };
    } catch (error) {
        logger.error('Email send failed', { error: error.message, to, subject });
        emailsSent.inc({ status: 'failed', type: 'unknown' });
        return { success: false, error: error.message };
    }
};

const resetTransporter = () => {
    transporter = null;
};

module.exports = { sendEmail, resetTransporter };
