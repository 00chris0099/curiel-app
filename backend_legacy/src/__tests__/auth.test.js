const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');
const { User, Role, UserRole, RefreshToken } = require('../models');
const config = require('../config');

let app;

const TEST_EMAIL = 'test-auth-' + Date.now() + '@curiel.com';
const TEST_PASSWORD = 'Test1234*';
let testUser;
let accessToken;
let refreshTokenValue;

async function createTestUser(email, password, fullName, options = {}) {
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({
        email,
        passwordHash: hash,
        fullName,
        isActive: options.isActive !== undefined ? options.isActive : true
    });
    return user;
}

beforeAll(async () => {
    await sequelize.authenticate();
    require('../models');

    try {
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS refresh_tokens (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                token VARCHAR(512) NOT NULL UNIQUE,
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                expires_at TIMESTAMP NOT NULL,
                revoked_at TIMESTAMP,
                replaced_by_token VARCHAR(512),
                ip_address VARCHAR(255),
                user_agent TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);
    } catch (e) {
        // Table may already exist
    }

    app = require('../app');

    const [adminRole] = await Role.findOrCreate({
        where: { name: 'admin' },
        defaults: { name: 'admin', description: 'Test admin role' }
    });

    const [inspectorRole] = await Role.findOrCreate({
        where: { name: 'inspector' },
        defaults: { name: 'inspector', description: 'Test inspector' }
    });

    testUser = await createTestUser(TEST_EMAIL, TEST_PASSWORD, 'Test Auth User');
    await testUser.addRole(inspectorRole);

    const [existingAdminUser] = await sequelize.query(`
        SELECT u.id, u.email, u.is_master_admin
        FROM users u
        INNER JOIN user_roles ur ON ur.user_id = u.id
        INNER JOIN roles r ON r.id = ur.role_id
        WHERE r.name = 'admin'
        LIMIT 1
    `);

    let adminUserId;
    let adminEmail;
    let isMasterAdmin;

    if (existingAdminUser.length > 0) {
        adminUserId = existingAdminUser[0].id;
        adminEmail = existingAdminUser[0].email;
        isMasterAdmin = existingAdminUser[0].is_master_admin;
    } else {
        const adminUser = await createTestUser(
            'admin-test-' + Date.now() + '@curiel.com',
            'Admin1234*',
            'Test Admin'
        );
        await adminUser.addRole(adminRole);
        adminUserId = adminUser.id;
        adminEmail = adminUser.email;
        isMasterAdmin = false;
    }

    accessToken = jwt.sign(
        {
            userId: adminUserId,
            email: adminEmail,
            isMasterAdmin,
            roles: ['admin']
        },
        config.jwt.secret,
        { expiresIn: '15m' }
    );
});

afterAll(async () => {
    if (testUser) {
        await RefreshToken.destroy({ where: { userId: testUser.id } }).catch(() => {});
        await UserRole.destroy({ where: { userId: testUser.id } }).catch(() => {});
        await User.destroy({ where: { id: testUser.id } }).catch(() => {});
    }
    await sequelize.close();
});

describe('Auth Endpoints', () => {
    describe('POST /api/v1/auth/register', () => {
        it('deberia rechazar email invalido', async () => {
            const res = await request(app)
                .post('/api/v1/auth/register')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    email: 'not-an-email',
                    password: TEST_PASSWORD,
                    firstName: 'Test',
                    lastName: 'Invalid',
                    role: 'admin'
                });

            expect(res.status).toBe(400);
        });

        it('deberia rechazar password corta', async () => {
            const res = await request(app)
                .post('/api/v1/auth/register')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    email: 'short-pwd@test.com',
                    password: '123',
                    firstName: 'Test',
                    lastName: 'Short',
                    role: 'admin'
                });

            expect(res.status).toBe(400);
        });

        it('deberia rechazar rol invalido', async () => {
            const res = await request(app)
                .post('/api/v1/auth/register')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    email: 'valid@test.com',
                    password: TEST_PASSWORD,
                    firstName: 'Test',
                    lastName: 'Invalid',
                    role: 'invalid_role'
                });

            expect(res.status).toBe(400);
        });

        it('deberia rechazar sin token de admin', async () => {
            const res = await request(app)
                .post('/api/v1/auth/register')
                .send({
                    email: 'noauth@test.com',
                    password: TEST_PASSWORD,
                    firstName: 'No',
                    lastName: 'Auth',
                    role: 'inspector'
                });

            expect(res.status).toBe(401);
        });
    });

    describe('POST /api/v1/auth/login', () => {
        it('deberia hacer login con credenciales validas', async () => {
            const res = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: TEST_EMAIL,
                    password: TEST_PASSWORD
                });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.token).toBeDefined();
            expect(res.body.data.refreshToken).toBeDefined();
            expect(res.body.data.user.email).toBe(TEST_EMAIL);

            accessToken = res.body.data.token;
            refreshTokenValue = res.body.data.refreshToken;
        });

        it('deberia rechazar password incorrecta', async () => {
            const res = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: TEST_EMAIL,
                    password: 'WrongPassword123!'
                });

            expect(res.status).toBe(401);
            expect(res.body.success).toBe(false);
        });

        it('deberia rechazar email inexistente', async () => {
            const res = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: 'nonexistent@test.com',
                    password: TEST_PASSWORD
                });

            expect(res.status).toBe(401);
        });

        it('deberia rechazar email invalido', async () => {
            const res = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: 'invalid',
                    password: TEST_PASSWORD
                });

            expect(res.status).toBe(400);
        });
    });

    describe('POST /api/v1/auth/refresh', () => {
        it('deberia renovar access token con refresh token valido', async () => {
            const res = await request(app)
                .post('/api/v1/auth/refresh')
                .send({ refreshToken: refreshTokenValue });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.token).toBeDefined();
            expect(res.body.data.refreshToken).toBeDefined();
            expect(res.body.data.token).toBeDefined();
            expect(typeof res.body.data.token).toBe('string');

            accessToken = res.body.data.token;
            refreshTokenValue = res.body.data.refreshToken;
        });

        it('deberia rechazar refresh token inexistente', async () => {
            const res = await request(app)
                .post('/api/v1/auth/refresh')
                .send({ refreshToken: 'fake-token-12345' });

            expect(res.status).toBe(401);
        });

        it('deberia rechazar body vacio', async () => {
            const res = await request(app)
                .post('/api/v1/auth/refresh')
                .send({});

            expect(res.status).toBe(400);
        });
    });

    describe('GET /api/v1/auth/me', () => {
        it('deberia retornar perfil con token valido', async () => {
            const res = await request(app)
                .get('/api/v1/auth/me')
                .set('Authorization', `Bearer ${accessToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.passwordHash).toBeUndefined();
        });

        it('deberia rechazar sin token', async () => {
            const res = await request(app)
                .get('/api/v1/auth/me');

            expect(res.status).toBe(401);
        });

        it('deberia rechazar token invalido', async () => {
            const res = await request(app)
                .get('/api/v1/auth/me')
                .set('Authorization', 'Bearer invalid-token-123');

            expect(res.status).toBe(401);
        });
    });

    describe('PUT /api/v1/auth/change-password', () => {
        it('deberia cambiar contrasena con actual correcta', async () => {
            const res = await request(app)
                .put('/api/v1/auth/change-password')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    currentPassword: TEST_PASSWORD,
                    newPassword: 'NewTest1234*'
                });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);

            const loginRes = await request(app)
                .post('/api/v1/auth/login')
                .send({ email: TEST_EMAIL, password: 'NewTest1234*' });

            expect(loginRes.status).toBe(200);

            await request(app)
                .put('/api/v1/auth/change-password')
                .set('Authorization', `Bearer ${loginRes.body.data.token}`)
                .send({ currentPassword: 'NewTest1234*', newPassword: TEST_PASSWORD });
        });

        it('deberia rechazar con actual incorrecta', async () => {
            const res = await request(app)
                .put('/api/v1/auth/change-password')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    currentPassword: 'WrongOldPassword',
                    newPassword: 'NewTest1234*'
                });

            expect(res.status).toBe(401);
        });
    });

    describe('POST /api/v1/auth/logout', () => {
        it('deberia cerrar sesion y revocar refresh token', async () => {
            const loginRes = await request(app)
                .post('/api/v1/auth/login')
                .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

            const freshRefreshToken = loginRes.body.data.refreshToken;

            const res = await request(app)
                .post('/api/v1/auth/logout')
                .set('Authorization', `Bearer ${loginRes.body.data.token}`)
                .send({ refreshToken: freshRefreshToken });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);

            const refreshRes = await request(app)
                .post('/api/v1/auth/refresh')
                .send({ refreshToken: freshRefreshToken });

            expect(refreshRes.status).toBe(401);
        });
    });
});
