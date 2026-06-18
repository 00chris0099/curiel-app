const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');
const { User, Role } = require('../models');
const config = require('../config');

let app;
let adminToken;
let inspectorToken;
let arquitectoToken;
let supervisorToken;

const users = {};
const createdEmails = [];

async function createUserWithPassword(userData) {
    const hash = await bcrypt.hash(userData.password, 10);
    const user = await User.create({
        email: userData.email,
        passwordHash: hash,
        fullName: userData.fullName,
        isActive: true
    });
    return user;
}

beforeAll(async () => {
    await sequelize.authenticate();
    require('../models');
    app = require('../app');

    const roles = ['inspector', 'arquitecto', 'supervisor'];
    const timestamp = Date.now();

    for (const roleName of roles) {
        const email = `test-rbac-${roleName}-${timestamp}@curiel.com`;
        createdEmails.push(email);
        const user = await createUserWithPassword({
            email,
            password: 'Test1234*',
            fullName: `Test ${roleName}`
        });

        const [role] = await Role.findOrCreate({
            where: { name: roleName },
            defaults: { name: roleName, description: `Test ${roleName}` }
        });

        await user.addRole(role);

        const token = jwt.sign(
            { userId: user.id, email: user.email, isMasterAdmin: false, roles: [roleName] },
            config.jwt.secret,
            { expiresIn: '15m' }
        );

        users[roleName] = { user, token, email };
    }

    const [existingAdminUser] = await sequelize.query(`
        SELECT u.id, u.email, u.is_master_admin
        FROM users u
        INNER JOIN user_roles ur ON ur.user_id = u.id
        INNER JOIN roles r ON r.id = ur.role_id
        WHERE r.name = 'admin'
        LIMIT 1
    `);

    if (existingAdminUser.length > 0) {
        adminToken = jwt.sign(
            { userId: existingAdminUser[0].id, email: existingAdminUser[0].email, isMasterAdmin: existingAdminUser[0].is_master_admin, roles: ['admin'] },
            config.jwt.secret,
            { expiresIn: '15m' }
        );
    } else {
        const [adminRole] = await Role.findOrCreate({
            where: { name: 'admin' },
            defaults: { name: 'admin', description: 'Test admin' }
        });
        const adminUser = await createUserWithPassword({
            email: `test-rbac-admin-${timestamp}@curiel.com`,
            password: 'Test1234*',
            fullName: 'Test admin'
        });
        createdEmails.push(`test-rbac-admin-${timestamp}@curiel.com`);
        await adminUser.addRole(adminRole);
        adminToken = jwt.sign(
            { userId: adminUser.id, email: adminUser.email, isMasterAdmin: false, roles: ['admin'] },
            config.jwt.secret,
            { expiresIn: '15m' }
        );
    }

    inspectorToken = users.inspector.token;
    arquitectoToken = users.arquitecto.token;
    supervisorToken = users.supervisor.token;
});

afterAll(async () => {
    for (const email of createdEmails) {
        await User.destroy({ where: { email } }).catch(() => {});
    }
    await sequelize.close();
});

describe('RBAC Permissions', () => {
    describe('User Management', () => {
        it('admin puede listar usuarios', async () => {
            const res = await request(app)
                .get('/api/v1/users')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.status).toBe(200);
        });

        it('inspector NO puede listar usuarios', async () => {
            const res = await request(app)
                .get('/api/v1/users')
                .set('Authorization', `Bearer ${inspectorToken}`);
            expect(res.status).toBe(403);
        });

        it('arquitecto NO puede listar usuarios', async () => {
            const res = await request(app)
                .get('/api/v1/users')
                .set('Authorization', `Bearer ${arquitectoToken}`);
            expect(res.status).toBe(403);
        });

        it('supervisor NO puede listar usuarios', async () => {
            const res = await request(app)
                .get('/api/v1/users')
                .set('Authorization', `Bearer ${supervisorToken}`);
            expect(res.status).toBe(403);
        });

        it('admin puede ver stats', async () => {
            const res = await request(app)
                .get('/api/v1/users/stats')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.status).toBe(200);
        });

        it('inspector NO puede ver stats', async () => {
            const res = await request(app)
                .get('/api/v1/users/stats')
                .set('Authorization', `Bearer ${inspectorToken}`);
            expect(res.status).toBe(403);
        });
    });

    describe('Inspection Creation', () => {
        it('admin puede crear inspeccion', async () => {
            const res = await request(app)
                .post('/api/v1/inspections')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    projectName: 'RBAC Test',
                    clientName: 'Test Client',
                    address: 'Address 123',
                    inspectionType: 'general',
                    scheduledDate: new Date(Date.now() + 86400000).toISOString(),
                    inspectorId: users.inspector.user.id
                });
            expect(res.status).toBe(201);
            if (res.body.data?.id) {
                await request(app).delete(`/api/v1/inspections/${res.body.data.id}`).set('Authorization', `Bearer ${adminToken}`);
            }
        });

        it('arquitecto puede crear inspeccion', async () => {
            const res = await request(app)
                .post('/api/v1/inspections')
                .set('Authorization', `Bearer ${arquitectoToken}`)
                .send({
                    projectName: 'RBAC Test Arquitecto',
                    clientName: 'Test Client',
                    address: 'Address 456',
                    inspectionType: 'estructural',
                    scheduledDate: new Date(Date.now() + 86400000).toISOString(),
                    inspectorId: users.inspector.user.id
                });
            expect(res.status).toBe(201);
            if (res.body.data?.id) {
                await request(app).delete(`/api/v1/inspections/${res.body.data.id}`).set('Authorization', `Bearer ${adminToken}`);
            }
        });

        it('inspector NO puede crear inspeccion', async () => {
            const res = await request(app)
                .post('/api/v1/inspections')
                .set('Authorization', `Bearer ${inspectorToken}`)
                .send({
                    projectName: 'Should Fail',
                    clientName: 'Test',
                    address: 'Address',
                    inspectionType: 'general',
                    scheduledDate: new Date().toISOString(),
                    inspectorId: users.inspector.user.id
                });
            expect(res.status).toBe(403);
        });

        it('supervisor NO puede crear inspeccion', async () => {
            const res = await request(app)
                .post('/api/v1/inspections')
                .set('Authorization', `Bearer ${supervisorToken}`)
                .send({
                    projectName: 'Should Fail',
                    clientName: 'Test',
                    address: 'Address',
                    inspectionType: 'general',
                    scheduledDate: new Date().toISOString(),
                    inspectorId: users.inspector.user.id
                });
            expect(res.status).toBe(403);
        });
    });

    describe('Token Validation', () => {
        it('sin token retorna 401', async () => {
            const res = await request(app).get('/api/v1/auth/me');
            expect(res.status).toBe(401);
        });

        it('token invalido retorna 401', async () => {
            const res = await request(app)
                .get('/api/v1/auth/me')
                .set('Authorization', 'Bearer invalid-token');
            expect(res.status).toBe(401);
        });

        it('Bearer malformado retorna 401', async () => {
            const res = await request(app)
                .get('/api/v1/auth/me')
                .set('Authorization', 'Token abc123');
            expect(res.status).toBe(401);
        });
    });

    describe('Health Check', () => {
        it('health funciona sin auth', async () => {
            const res = await request(app).get('/api/v1/health');
            expect(res.status).toBe(200);
            expect(res.body.status).toBe('operational');
            expect(res.body.database.status).toBe('connected');
        });
    });
});
