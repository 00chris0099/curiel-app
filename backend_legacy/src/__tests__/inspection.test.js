const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { prisma, connectAll, disconnectAll } = require('../lib/databases');
const config = require('../config');

let app;
let adminToken;
let nonMasterAdminToken;
let inspectorToken;
let testInspectionId;
let testInspectorId;

const TEST_INSPECTOR_EMAIL = 'test-inspector-insp-' + Date.now() + '@curiel.com';
const TEST_NON_MASTER_EMAIL = 'test-nonmaster-insp-' + Date.now() + '@curiel.com';

async function createUserWithPassword(userData) {
    const hash = await bcrypt.hash(userData.password, 10);
    const user = await prisma.auth.user.create({
        data: {
            email: userData.email,
            passwordHash: hash,
            fullName: userData.fullName,
            isActive: userData.isActive !== undefined ? userData.isActive : true
        }
    });
    return user;
}

beforeAll(async () => {
    await connectAll();

    app = require('../app');

    const existingAdminUser = await prisma.auth.$queryRaw`
        SELECT u.id, u.email, u.is_master_admin
        FROM users u
        INNER JOIN user_roles ur ON ur.user_id = u.id
        INNER JOIN roles r ON r.id = ur.role_id
        WHERE r.name = 'admin'
        LIMIT 1
    `;

    let adminUserId;
    let adminEmail;
    let isMasterAdmin;

    if (existingAdminUser.length > 0) {
        adminUserId = existingAdminUser[0].id;
        adminEmail = existingAdminUser[0].email;
        isMasterAdmin = existingAdminUser[0].is_master_admin;
    } else {
        const admin = await createUserWithPassword({
            email: 'admin-insp-test-' + Date.now() + '@curiel.com',
            password: 'Admin1234*',
            fullName: 'Test Admin Inspections'
        });
        const adminRole = await prisma.auth.role.upsert({
            where: { name: 'admin' },
            update: {},
            create: { name: 'admin', description: 'Test admin' }
        });
        await prisma.auth.userRole.create({ data: { userId: admin.id, roleId: adminRole.id } });
        adminUserId = admin.id;
        adminEmail = admin.email;
        isMasterAdmin = false;
    }

    adminToken = jwt.sign(
        { userId: adminUserId, email: adminEmail, isMasterAdmin, roles: ['admin'] },
        config.jwt.secret,
        { expiresIn: '15m' }
    );

    const adminRole = await prisma.auth.role.upsert({
        where: { name: 'admin' },
        update: {},
        create: { name: 'admin', description: 'Test admin' }
    });

    const nonMasterAdmin = await createUserWithPassword({
        email: TEST_NON_MASTER_EMAIL,
        password: 'Admin1234*',
        fullName: 'Non-Master Admin'
    });
    await prisma.auth.userRole.create({ data: { userId: nonMasterAdmin.id, roleId: adminRole.id } });
    nonMasterAdminToken = jwt.sign(
        { userId: nonMasterAdmin.id, email: nonMasterAdmin.email, isMasterAdmin: false, roles: ['admin'] },
        config.jwt.secret,
        { expiresIn: '15m' }
    );

    const inspectorRole = await prisma.auth.role.upsert({
        where: { name: 'inspector' },
        update: {},
        create: { name: 'inspector', description: 'Test inspector' }
    });

    const inspector = await createUserWithPassword({
        email: TEST_INSPECTOR_EMAIL,
        password: 'Inspector123*',
        fullName: 'Test Inspector'
    });
    await prisma.auth.userRole.create({ data: { userId: inspector.id, roleId: inspectorRole.id } });
    testInspectorId = inspector.id;

    inspectorToken = jwt.sign(
        { userId: inspector.id, email: inspector.email, isMasterAdmin: false, roles: ['inspector'] },
        config.jwt.secret,
        { expiresIn: '15m' }
    );
});

afterAll(async () => {
    if (testInspectionId) {
        await prisma.inspecciones.inspection.deleteMany({ where: { id: testInspectionId } }).catch(() => {});
    }
    await prisma.auth.user.deleteMany({ where: { email: TEST_INSPECTOR_EMAIL } }).catch(() => {});
    await prisma.auth.user.deleteMany({ where: { email: TEST_NON_MASTER_EMAIL } }).catch(() => {});
    await disconnectAll();
});

describe('Inspection Endpoints', () => {
    describe('POST /api/v1/inspections', () => {
        it('deberia crear inspeccion como admin', async () => {
            const res = await request(app)
                .post('/api/v1/inspections')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    projectName: 'Test Project',
                    clientName: 'Test Client',
                    address: 'Av. Test 123',
                    inspectionType: 'general',
                    scheduledDate: new Date(Date.now() + 86400000).toISOString(),
                    inspectorId: testInspectorId
                });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.projectName).toBe('Test Project');
            expect(res.body.data.status).toBe('pendiente');
            testInspectionId = res.body.data.id;
        });

        it('deberia rechazar creacion como inspector', async () => {
            const res = await request(app)
                .post('/api/v1/inspections')
                .set('Authorization', `Bearer ${inspectorToken}`)
                .send({
                    projectName: 'Should Fail',
                    clientName: 'Test',
                    address: 'Address 123',
                    inspectionType: 'general',
                    scheduledDate: new Date(Date.now() + 86400000).toISOString(),
                    inspectorId: testInspectorId
                });

            expect(res.status).toBe(403);
        });

        it('deberia rechazar campos requeridos faltantes', async () => {
            const res = await request(app)
                .post('/api/v1/inspections')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ projectName: 'Test' });

            expect(res.status).toBe(422);
        });

        it('deberia rechazar sin token', async () => {
            const res = await request(app)
                .post('/api/v1/inspections')
                .send({
                    projectName: 'Test',
                    clientName: 'Test',
                    address: 'Address',
                    inspectionType: 'general',
                    scheduledDate: new Date().toISOString(),
                    inspectorId: testInspectorId
                });

            expect(res.status).toBe(401);
        });
    });

    describe('GET /api/v1/inspections', () => {
        it('deberia listar inspecciones como admin', async () => {
            const res = await request(app)
                .get('/api/v1/inspections')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    describe('GET /api/v1/inspections/:id', () => {
        it('deberia obtener inspeccion por ID', async () => {
            const res = await request(app)
                .get(`/api/v1/inspections/${testInspectionId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.id).toBe(testInspectionId);
        });

        it('deberia retornar 404 para ID inexistente', async () => {
            const res = await request(app)
                .get('/api/v1/inspections/00000000-0000-0000-0000-000000000000')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(404);
        });
    });

    describe('PUT /api/v1/inspections/:id', () => {
        it('deberia actualizar inspeccion', async () => {
            const res = await request(app)
                .put(`/api/v1/inspections/${testInspectionId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ projectName: 'Updated Project Name' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.projectName).toBe('Updated Project Name');
        });
    });

    describe('PATCH /api/v1/inspections/:id/status', () => {
        it('deberia cambiar estado de pendiente a en_proceso', async () => {
            const res = await request(app)
                .patch(`/api/v1/inspections/${testInspectionId}/status`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ status: 'en_proceso' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });

        it('deberia rechazar transicion invalida (en_proceso -> pendiente)', async () => {
            const res = await request(app)
                .patch(`/api/v1/inspections/${testInspectionId}/status`)
                .set('Authorization', `Bearer ${nonMasterAdminToken}`)
                .send({ status: 'pendiente' });

            expect(res.status).toBe(403);
        });

        it('deberia rechazar estado invalido', async () => {
            const res = await request(app)
                .patch(`/api/v1/inspections/${testInspectionId}/status`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ status: 'estado_fantasma' });

            expect(res.status).toBe(422);
        });
    });

    describe('GET /api/v1/inspections/stats', () => {
        it('deberia retornar estadisticas', async () => {
            const res = await request(app)
                .get('/api/v1/inspections/stats')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });

    describe('DELETE /api/v1/inspections/:id', () => {
        it('deberia eliminar inspeccion como admin', async () => {
            const res = await request(app)
                .delete(`/api/v1/inspections/${testInspectionId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            testInspectionId = null;
        });

        it('deberia rechazar eliminacion como inspector', async () => {
            const createRes = await request(app)
                .post('/api/v1/inspections')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    projectName: 'To Delete',
                    clientName: 'Test',
                    address: 'Address 123',
                    inspectionType: 'general',
                    scheduledDate: new Date(Date.now() + 86400000).toISOString(),
                    inspectorId: testInspectorId
                });

            const tempId = createRes.body.data.id;

            const res = await request(app)
                .delete(`/api/v1/inspections/${tempId}`)
                .set('Authorization', `Bearer ${inspectorToken}`);

            expect(res.status).toBe(403);

            await request(app)
                .delete(`/api/v1/inspections/${tempId}`)
                .set('Authorization', `Bearer ${adminToken}`);
        });
    });
});
