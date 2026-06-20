const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { prisma, connectAll, disconnectAll } = require('../lib/databases');
const config = require('../config');

let app;
let adminToken;
let nonMasterAdminToken;
let inspectorToken;

const createdEmails = [];
const createdClientIds = [];

async function createUserWithPassword(userData) {
    const hash = await bcrypt.hash(userData.password, 10);
    const user = await prisma.auth.user.create({
        data: {
            email: userData.email,
            passwordHash: hash,
            fullName: userData.fullName,
            isActive: true
        }
    });
    return user;
}

beforeAll(async () => {
    await connectAll();
    app = require('../app');

    // Clean stale test clients from prior runs
    await prisma.admin.client.deleteMany({});

    const timestamp = Date.now();

    // Create inspector for token
    const inspectorEmail = `test-client-inspector-${timestamp}@curiel.com`;
    createdEmails.push(inspectorEmail);
    const inspectorUser = await createUserWithPassword({
        email: inspectorEmail,
        password: 'Test1234*',
        fullName: 'Inspector Test'
    });

    const inspectorRole = await prisma.auth.role.upsert({
        where: { name: 'inspector' },
        update: {},
        create: { name: 'inspector', description: 'Test inspector' }
    });
    await prisma.auth.userRole.create({ data: { userId: inspectorUser.id, roleId: inspectorRole.id } });

    inspectorToken = jwt.sign(
        { userId: inspectorUser.id, email: inspectorUser.email, isMasterAdmin: false, roles: ['inspector'] },
        config.jwt.secret,
        { expiresIn: '15m' }
    );

    // Find or create admin
    const existingAdminUser = await prisma.auth.$queryRaw`
        SELECT u.id, u.email, u.is_master_admin
        FROM users u
        INNER JOIN user_roles ur ON ur.user_id = u.id
        INNER JOIN roles r ON r.id = ur.role_id
        WHERE r.name = 'admin'
        LIMIT 1
    `;

    if (existingAdminUser.length > 0) {
        adminToken = jwt.sign(
            { userId: existingAdminUser[0].id, email: existingAdminUser[0].email, isMasterAdmin: existingAdminUser[0].is_master_admin, roles: ['admin'] },
            config.jwt.secret,
            { expiresIn: '15m' }
        );
    } else {
        const adminEmail = `test-client-admin-${timestamp}@curiel.com`;
        createdEmails.push(adminEmail);
        const adminUser = await createUserWithPassword({
            email: adminEmail,
            password: 'Test1234*',
            fullName: 'Admin Test'
        });

        const adminRole = await prisma.auth.role.upsert({
            where: { name: 'admin' },
            update: {},
            create: { name: 'admin', description: 'Test admin' }
        });
        await prisma.auth.userRole.create({ data: { userId: adminUser.id, roleId: adminRole.id } });

        adminToken = jwt.sign(
            { userId: adminUser.id, email: adminUser.email, isMasterAdmin: adminUser.isMasterAdmin, roles: ['admin'] },
            config.jwt.secret,
            { expiresIn: '15m' }
        );
    }

    // Create a dedicated non-masterAdmin admin for isProtected test
    const nonMasterEmail = `test-client-nonmasteradmin-${timestamp}@curiel.com`;
    createdEmails.push(nonMasterEmail);
    const nonMasterAdmin = await createUserWithPassword({
        email: nonMasterEmail,
        password: 'Test1234*',
        fullName: 'Non Master Admin'
    });
    const adminRoleForNonMaster = await prisma.auth.role.upsert({
        where: { name: 'admin' },
        update: {},
        create: { name: 'admin', description: 'Test admin' }
    });
    await prisma.auth.userRole.create({ data: { userId: nonMasterAdmin.id, roleId: adminRoleForNonMaster.id } });
    nonMasterAdminToken = jwt.sign(
        { userId: nonMasterAdmin.id, email: nonMasterAdmin.email, isMasterAdmin: false, roles: ['admin'] },
        config.jwt.secret,
        { expiresIn: '15m' }
    );
});

afterAll(async () => {
    // Cleanup
    for (const id of createdClientIds) {
        await prisma.admin.client.deleteMany({ where: { id } });
    }
    for (const email of createdEmails) {
        await prisma.auth.user.deleteMany({ where: { email } });
    }
    await disconnectAll();
});

describe('Client API', () => {
    describe('POST /api/v1/clients', () => {
        it('crea un cliente con nombre y apellido', async () => {
            const res = await request(app)
                .post('/api/v1/clients')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    documentType: 'dni',
                    documentNumber: '12345678',
                    firstName: 'Juan',
                    lastName: 'Perez',
                    email: 'juan@test.com'
                });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.client.documentNumber).toBe('12345678');
            expect(res.body.data.client.firstName).toBe('Juan');
            createdClientIds.push(res.body.data.client.id);
        });

        it('crea un cliente con razon social', async () => {
            const res = await request(app)
                .post('/api/v1/clients')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    documentType: 'ruc',
                    documentNumber: '20123456789',
                    razonSocial: 'Empresa Test SAC',
                    email: 'empresa@test.com'
                });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.client.razonSocial).toBe('Empresa Test SAC');
            createdClientIds.push(res.body.data.client.id);
        });

        it('rechaza crear cliente sin campos requeridos', async () => {
            const res = await request(app)
                .post('/api/v1/clients')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    documentType: 'dni',
                    documentNumber: '11111111',
                    email: 'incomplete@test.com'
                });

            expect(res.status).toBe(422);
            expect(res.body.success).toBe(false);
        });

        it('rechaza crear cliente con documento duplicado', async () => {
            const res = await request(app)
                .post('/api/v1/clients')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    documentType: 'dni',
                    documentNumber: '12345678',
                    firstName: 'Otro',
                    lastName: 'Cliente',
                    email: 'otro@test.com'
                });

            expect(res.status).toBe(409);
            expect(res.body.success).toBe(false);
        });

        it('rechaza crear cliente con email duplicado', async () => {
            const res = await request(app)
                .post('/api/v1/clients')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    documentType: 'dni',
                    documentNumber: '99999999',
                    firstName: 'Duplicate',
                    lastName: 'Email',
                    email: 'juan@test.com'
                });

            expect(res.status).toBe(409);
            expect(res.body.success).toBe(false);
        });

        it('rechaza crear cliente sin token', async () => {
            const res = await request(app)
                .post('/api/v1/clients')
                .send({
                    documentType: 'dni',
                    documentNumber: '11111111',
                    firstName: 'No',
                    lastName: 'Auth',
                    email: 'noauth@test.com'
                });

            expect(res.status).toBe(401);
        });

        it('rechaza crear cliente con rol inspector', async () => {
            const res = await request(app)
                .post('/api/v1/clients')
                .set('Authorization', `Bearer ${inspectorToken}`)
                .send({
                    documentType: 'dni',
                    documentNumber: '11111111',
                    firstName: 'No',
                    lastName: 'Permiso',
                    email: 'nopermiso@test.com'
                });

            expect(res.status).toBe(403);
        });

        it('rechaza crear cliente protegido sin ser masterAdmin', async () => {
            const res = await request(app)
                .post('/api/v1/clients')
                .set('Authorization', `Bearer ${nonMasterAdminToken}`)
                .send({
                    documentType: 'dni',
                    documentNumber: '87654321',
                    firstName: 'Protected',
                    lastName: 'Test',
                    email: 'protected@test.com',
                    isProtected: true
                });

            expect(res.status).toBe(403);
            expect(res.body.success).toBe(false);
        });
    });

    describe('GET /api/v1/clients', () => {
        it('lista clientes (admin)', async () => {
            const res = await request(app)
                .get('/api/v1/clients')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.pagination).toBeDefined();
        });

        it('rechaza listar clientes sin token', async () => {
            const res = await request(app)
                .get('/api/v1/clients');

            expect(res.status).toBe(401);
        });

        it('rechaza listar clientes con rol inspector', async () => {
            const res = await request(app)
                .get('/api/v1/clients')
                .set('Authorization', `Bearer ${inspectorToken}`);

            expect(res.status).toBe(403);
        });
    });

    describe('GET /api/v1/clients/:id', () => {
        it('obtiene un cliente por ID', async () => {
            const listRes = await request(app)
                .get('/api/v1/clients')
                .set('Authorization', `Bearer ${adminToken}`);

            const clientId = listRes.body.data[0]?.id;
            if (!clientId) return;

            const res = await request(app)
                .get(`/api/v1/clients/${clientId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.client.id).toBe(clientId);
        });

        it('retorna 404 para cliente inexistente', async () => {
            const res = await request(app)
                .get('/api/v1/clients/00000000-0000-0000-0000-000000000000')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(404);
            expect(res.body.success).toBe(false);
        });
    });

    describe('PUT /api/v1/clients/:id', () => {
        it('actualiza un cliente', async () => {
            const listRes = await request(app)
                .get('/api/v1/clients')
                .set('Authorization', `Bearer ${adminToken}`);

            const clientId = listRes.body.data[0]?.id;
            if (!clientId) return;

            const res = await request(app)
                .put(`/api/v1/clients/${clientId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ phone: '999888777' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.client.phone).toBe('999888777');
        });
    });

    describe('DELETE /api/v1/clients/:id', () => {
        it('elimina un cliente sin inspecciones', async () => {
            // Create a client to delete
            const createRes = await request(app)
                .post('/api/v1/clients')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    documentType: 'ce',
                    documentNumber: '123456789',
                    firstName: 'ToDelete',
                    lastName: 'Client',
                    email: 'todelete@test.com'
                });

            const clientId = createRes.body.data.client.id;

            const res = await request(app)
                .delete(`/api/v1/clients/${clientId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });

    describe('GET /api/v1/clients/search', () => {
        it('busca clientes por nombre', async () => {
            const res = await request(app)
                .get('/api/v1/clients/search?query=Juan')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data.clients)).toBe(true);
        });

        it('busca clientes por documento', async () => {
            const res = await request(app)
                .get('/api/v1/clients/search?query=12345678')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });

        it('retorna array vacio con query corta', async () => {
            const res = await request(app)
                .get('/api/v1/clients/search?query=a')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.clients).toEqual([]);
        });
    });

    describe('GET /api/v1/clients/:id/inspections', () => {
        it('obtiene historial de inspecciones del cliente', async () => {
            const listRes = await request(app)
                .get('/api/v1/clients')
                .set('Authorization', `Bearer ${adminToken}`);

            const clientId = listRes.body.data[0]?.id;
            if (!clientId) return;

            const res = await request(app)
                .get(`/api/v1/clients/${clientId}/inspections`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
        });

        it('retorna 404 para cliente inexistente', async () => {
            const res = await request(app)
                .get('/api/v1/clients/00000000-0000-0000-0000-000000000000/inspections')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(404);
        });
    });
});
