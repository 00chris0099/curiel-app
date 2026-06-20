const emailService = require('../services/emailService');
const { resetTransporter } = require('../services/emailService');
const { welcomeEmail, passwordResetEmail, evaluationEmail } = require('../utils/emailTemplates');

// Mock nodemailer
jest.mock('nodemailer', () => {
    const sendMail = jest.fn().mockResolvedValue({ messageId: 'test-message-id' });
    const createTransport = jest.fn(() => ({ sendMail }));
    return { createTransport, __mockSendMail: sendMail, __mockCreateTransport: createTransport };
});

describe('Email Service', () => {
    const origUser = process.env.SMTP_USER;
    const origPass = process.env.SMTP_PASSWORD;

    beforeEach(() => {
        jest.clearAllMocks();
        resetTransporter();
    });

    afterAll(() => {
        if (origUser === undefined) delete process.env.SMTP_USER;
        else process.env.SMTP_USER = origUser;
        if (origPass === undefined) delete process.env.SMTP_PASSWORD;
        else process.env.SMTP_PASSWORD = origPass;
    });

    describe('sendEmail', () => {
        it('should send email successfully when SMTP is configured', async () => {
            process.env.SMTP_USER = 'test@curiel.com';
            process.env.SMTP_PASSWORD = 'test-password';
            resetTransporter();

            const result = await emailService.sendEmail({
                to: 'recipient@test.com',
                subject: 'Test Subject',
                html: '<p>Test content</p>'
            });

            expect(result.success).toBe(true);
            expect(result.messageId).toBe('test-message-id');
        });

        it('should return dry-run when SMTP is not configured', async () => {
            delete process.env.SMTP_USER;
            delete process.env.SMTP_PASSWORD;
            resetTransporter();

            const result = await emailService.sendEmail({
                to: 'recipient@test.com',
                subject: 'Test Subject',
                html: '<p>Test content</p>'
            });

            expect(result.success).toBe(true);
            expect(result.dryRun).toBe(true);
        });
    });
});

describe('Email Templates', () => {
    const mockUser = {
        fullName: 'Juan Perez',
        email: 'juan@test.com'
    };

    describe('welcomeEmail', () => {
        it('should generate welcome email with temp password', () => {
            const result = welcomeEmail(mockUser, 'TempPass123');

            expect(result.subject).toContain('Bienvenido');
            expect(result.html).toContain('Juan Perez');
            expect(result.html).toContain('juan@test.com');
            expect(result.html).toContain('TempPass123');
            expect(result.html).toContain('Iniciar sesion');
        });
    });

    describe('passwordResetEmail', () => {
        it('should generate reset email with valid URL', () => {
            const resetUrl = 'https://curiel.com/reset-password?token=abc123';
            const result = passwordResetEmail(mockUser, resetUrl);

            expect(result.subject).toContain('Restablece tu contrasena');
            expect(result.html).toContain('Juan Perez');
            expect(result.html).toContain(resetUrl);
            expect(result.html).toContain('1 hora');
        });
    });

    describe('evaluationEmail', () => {
        it('should generate evaluation email with score', () => {
            const evaluation = {
                score: 8.5,
                weekStart: '2026-06-15',
                weekEnd: '2026-06-21',
                comment: 'Buen desempeno'
            };

            const result = evaluationEmail(mockUser, evaluation);

            expect(result.subject).toContain('8.5');
            expect(result.html).toContain('Juan Perez');
            expect(result.html).toContain('8.5');
            expect(result.html).toContain('2026-06-15');
            expect(result.html).toContain('2026-06-21');
            expect(result.html).toContain('Buen desempeno');
        });

        it('should handle missing comment gracefully', () => {
            const evaluation = {
                score: 7.0,
                weekStart: '2026-06-15',
                weekEnd: '2026-06-21'
            };

            const result = evaluationEmail(mockUser, evaluation);

            expect(result.subject).toContain('7.0');
            expect(result.html).toContain('Juan Perez');
        });

        it('should handle null score gracefully', () => {
            const evaluation = {
                score: null,
                weekStart: '2026-06-15',
                weekEnd: '2026-06-21'
            };

            const result = evaluationEmail(mockUser, evaluation);

            expect(result.html).toContain('N/A');
        });
    });
});
