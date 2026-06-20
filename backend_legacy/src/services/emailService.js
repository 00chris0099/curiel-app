const nodemailer = require('nodemailer');
const config = require('../config');

let transporter = null;

const getTransporter = () => {
    if (transporter) return transporter;

    const { host, port, secure } = config.email;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD;

    if (!user || !pass) {
        console.warn('⚠️ SMTP credentials not configured. Emails will be logged but not sent.');
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
        console.log('📧 [DRY-RUN] Email would be sent:', { to, subject });
        return { success: true, dryRun: true };
    }

    try {
        const info = await transport.sendMail(mailOptions);
        console.log('📧 Email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('📧 Email send failed:', error.message);
        return { success: false, error: error.message };
    }
};

const resetTransporter = () => {
    transporter = null;
};

module.exports = { sendEmail, resetTransporter };
