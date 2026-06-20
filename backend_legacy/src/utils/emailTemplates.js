const config = require('../config');

const BASE_STYLES = `
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
`;

const BASE_FOOTER = `
<tr><td style="padding:24px 40px;background-color:#17324a;text-align:center;">
<p style="margin:0;color:#a0aec0;font-size:12px;">CURIEL Inspecciones Tecnicas</p>
<p style="margin:4px 0 0;color:#718096;font-size:11px;">Este es un email automatico, no respondas a este mensaje.</p>
</td></tr>
</table>
</td></tr></table>
</body>
`;

const welcomeEmail = (user, tempPassword) => ({
    subject: 'Bienvenido a CURIEL - Tu cuenta ha sido creada',
    html: `
${BASE_STYLES}
<tr><td style="padding:40px 40px 20px;">
<div style="text-align:center;margin-bottom:24px;">
<div style="display:inline-block;background-color:#17324a;color:#fff;font-size:20px;font-weight:700;padding:12px 24px;border-radius:12px;">CURIEL</div>
</div>
<h1 style="margin:0 0 16px;color:#1a202c;font-size:22px;font-weight:700;text-align:center;">Hola ${user.fullName},</h1>
<p style="margin:0 0 16px;color:#4a5568;font-size:15px;line-height:1.6;text-align:center;">
Tu cuenta ha sido creada exitosamente en el sistema de inspecciones CURIEL.
</p>
</td></tr>
<tr><td style="padding:0 40px 32px;">
<div style="background-color:#f7fafc;border-radius:12px;padding:24px;border:1px solid #e2e8f0;">
<p style="margin:0 0 8px;color:#2d3748;font-size:14px;font-weight:600;">Tus credenciales de acceso:</p>
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td style="padding:8px 0;color:#718096;font-size:13px;">Email:</td>
<td style="padding:8px 0;color:#1a202c;font-size:13px;font-weight:600;text-align:right;">${user.email}</td></tr>
<tr><td style="padding:8px 0;color:#718096;font-size:13px;">Contrasena temporal:</td>
<td style="padding:8px 0;color:#e53e3e;font-size:13px;font-weight:700;text-align:right;">${tempPassword}</td></tr>
</table>
</div>
<p style="margin:16px 0 0;color:#e53e3e;font-size:13px;font-weight:600;text-align:center;">
Por seguridad, cambia tu contrasena despues de iniciar sesion.
</p>
</td></tr>
<tr><td style="padding:0 40px 40px;text-align:center;">
<a href="${config.urls.frontend}/login" style="display:inline-block;background-color:#17324a;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:14px;font-weight:600;">
Iniciar sesion
</a>
</td></tr>
${BASE_FOOTER}
`
});

const passwordResetEmail = (user, resetUrl) => ({
    subject: 'CURIEL - Restablece tu contrasena',
    html: `
${BASE_STYLES}
<tr><td style="padding:40px 40px 20px;">
<div style="text-align:center;margin-bottom:24px;">
<div style="display:inline-block;background-color:#17324a;color:#fff;font-size:20px;font-weight:700;padding:12px 24px;border-radius:12px;">CURIEL</div>
</div>
<h1 style="margin:0 0 16px;color:#1a202c;font-size:22px;font-weight:700;text-align:center;">Hola ${user.fullName},</h1>
<p style="margin:0 0 16px;color:#4a5568;font-size:15px;line-height:1.6;text-align:center;">
Recibimos una solicitud para restablecer tu contrasena. Haz clic en el boton de abajo para crear una nueva.
</p>
</td></tr>
<tr><td style="padding:0 40px 32px;text-align:center;">
<a href="${resetUrl}" style="display:inline-block;background-color:#e53e3e;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:14px;font-weight:600;">
Restablecer contrasena
</a>
</td></tr>
<tr><td style="padding:0 40px 32px;">
<div style="background-color:#fff5f5;border-radius:12px;padding:20px;border:1px solid #fed7d7;">
<p style="margin:0;color:#c53030;font-size:13px;line-height:1.5;">
<strong>Este enlace expira en 1 hora.</strong><br>
Si no solicitaste este cambio, ignora este email. Tu contrasena permanecera igual.
</p>
</div>
</td></tr>
${BASE_FOOTER}
`
});

const evaluationEmail = (user, evaluation) => {
    const score = evaluation.score != null ? Number(evaluation.score).toFixed(1) : 'N/A';
    const period = evaluation.weekStart && evaluation.weekEnd
        ? `${evaluation.weekStart} al ${evaluation.weekEnd}`
        : 'Periodo no especificado';

    return {
        subject: `CURIEL - Evaluacion semanal: ${score}/10`,
        html: `
${BASE_STYLES}
<tr><td style="padding:40px 40px 20px;">
<div style="text-align:center;margin-bottom:24px;">
<div style="display:inline-block;background-color:#17324a;color:#fff;font-size:20px;font-weight:700;padding:12px 24px;border-radius:12px;">CURIEL</div>
</div>
<h1 style="margin:0 0 16px;color:#1a202c;font-size:22px;font-weight:700;text-align:center;">Hola ${user.fullName},</h1>
<p style="margin:0 0 16px;color:#4a5568;font-size:15px;line-height:1.6;text-align:center;">
Tu evaluacion semanal ha sido publicada.
</p>
</td></tr>
<tr><td style="padding:0 40px 32px;">
<div style="background-color:#f7fafc;border-radius:12px;padding:24px;border:1px solid #e2e8f0;">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td style="padding:8px 0;color:#718096;font-size:13px;">Periodo:</td>
<td style="padding:8px 0;color:#1a202c;font-size:13px;font-weight:600;text-align:right;">${period}</td></tr>
<tr><td style="padding:8px 0;color:#718096;font-size:13px;">Calificacion:</td>
<td style="padding:8px 0;color:#17324a;font-size:20px;font-weight:700;text-align:right;">${score}/10</td></tr>
${evaluation.comment ? `<tr><td style="padding:8px 0;color:#718096;font-size:13px;">Comentario:</td>
<td style="padding:8px 0;color:#1a202c;font-size:13px;text-align:right;">${evaluation.comment}</td></tr>` : ''}
</table>
</div>
</td></tr>
<tr><td style="padding:0 40px 40px;text-align:center;">
<a href="${config.urls.frontend}/dashboard" style="display:inline-block;background-color:#17324a;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:14px;font-weight:600;">
Ver mi desempeno
</a>
</td></tr>
${BASE_FOOTER}
`
    };
};

module.exports = {
    welcomeEmail,
    passwordResetEmail,
    evaluationEmail
};
