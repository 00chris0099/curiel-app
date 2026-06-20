const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { prisma, connectAll, disconnectAll } = require('../lib/databases');
const config = require('../config');

let app;
let adminToken;
let inspectorToken;
let testInspectionId;
let testInspectorId;
let testAreaId;
let testObservationId;
let adminUserId;

const TEST_EXEC_ADMIN_EMAIL = 'test-exec-admin-' + Date.now() + '@curiel.com';
const TEST_EXEC_INSPECTOR_EMAIL = 'test-exec-inspector-' + Date.now() + '@curiel.com';

async function createUserWithPassword(userData) {
    const hash = await bcrypt.hash(userData.password, 10);
    return prisma.auth.user.create({
        data: {
            email: userData.email,
            passwordHash: hash,
            fullName: userData.fullName,
            isActive: true
        }
    });
}

beforeAll(async () => {
    await connectAll();

    app = require('../app');

    const existingAdminUsers = await prisma.auth.$queryRaw`
        SELECT u.id, u.email, u.is_master_admin
        FROM users u
        INNER JOIN user_roles ur ON ur.user_id = u.id
        INNER JOIN roles r ON r.id = ur.role_id
        WHERE r.name = 'admin'
        LIMIT 1
    `;

    let adminEmail;
    let isMasterAdmin;

    if (existingAdminUsers.length > 0) {
        adminUserId = existingAdminUsers[0].id;
        adminEmail = existingAdminUsers[0].email;
        isMasterAdmin = existingAdminUsers[0].is_master_admin;
    } else {
        const admin = await createUserWithPassword({
            email: TEST_EXEC_ADMIN_EMAIL,
            password: 'Admin1234*',
            fullName: 'Test Admin Execution'
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

    const inspectorRole = await prisma.auth.role.upsert({
        where: { name: 'inspector' },
        update: {},
        create: { name: 'inspector', description: 'Test inspector' }
    });

    const inspector = await createUserWithPassword({
        email: TEST_EXEC_INSPECTOR_EMAIL,
        password: 'Inspector123*',
        fullName: 'Test Inspector Execution'
    });
    await prisma.auth.userRole.create({ data: { userId: inspector.id, roleId: inspectorRole.id } });
    testInspectorId = inspector.id;

    inspectorToken = jwt.sign(
        { userId: inspector.id, email: inspector.email, isMasterAdmin: false, roles: ['inspector'] },
        config.jwt.secret,
        { expiresIn: '15m' }
    );

    const inspection = await prisma.inspecciones.inspection.create({
        data: {
            projectName: 'Execution Test Project',
            clientName: 'Execution Test Client',
            address: 'Av. Execution 456',
            inspectionType: 'general',
            status: 'pendiente',
            scheduledDate: new Date(Date.now() + 86400000),
            inspectorId: testInspectorId,
            createdById: adminUserId
        }
    });
    testInspectionId = inspection.id;
});

afterAll(async () => {
    if (testObservationId) {
        await prisma.inspecciones.inspectionObservation.deleteMany({ where: { id: testObservationId } }).catch(() => {});
    }
    if (testAreaId) {
        await prisma.inspecciones.inspectionArea.deleteMany({ where: { id: testAreaId } }).catch(() => {});
    }
    if (testInspectionId) {
        await prisma.media.photo.deleteMany({ where: { inspectionId: testInspectionId } }).catch(() => {});
        await prisma.inspecciones.inspectionSummary.deleteMany({ where: { inspectionId: testInspectionId } }).catch(() => {});
        await prisma.inspecciones.inspection.deleteMany({ where: { id: testInspectionId } }).catch(() => {});
    }
    await prisma.auth.user.deleteMany({ where: { email: TEST_EXEC_ADMIN_EMAIL } }).catch(() => {});
    await prisma.auth.user.deleteMany({ where: { email: TEST_EXEC_INSPECTOR_EMAIL } }).catch(() => {});
    await disconnectAll();
});

describe('Inspection Execution Endpoints', () => {
    describe('GET /api/v1/inspections/:id/execution', () => {
        it('deberia retornar datos de ejecucion como admin', async () => {
            const res = await request(app)
                .get(`/api/v1/inspections/${testInspectionId}/execution`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.inspection).toBeDefined();
            expect(res.body.data.areas).toBeDefined();
            expect(Array.isArray(res.body.data.areas)).toBe(true);
            expect(res.body.data.observations).toBeDefined();
            expect(Array.isArray(res.body.data.observations)).toBe(true);
            expect(res.body.data.photos).toBeDefined();
            expect(Array.isArray(res.body.data.photos)).toBe(true);
            expect(res.body.data.stats).toBeDefined();
        });

        it('deberia retornar 404 para inspeccion inexistente', async () => {
            const fakeId = '00000000-0000-0000-0000-000000000000';
            const res = await request(app)
                .get(`/api/v1/inspections/${fakeId}/execution`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(404);
        });

        it('deberia retornar 401 sin token', async () => {
            const res = await request(app)
                .get(`/api/v1/inspections/${testInspectionId}/execution`);

            expect(res.status).toBe(401);
        });
    });

    describe('POST /api/v1/inspections/:id/execution/areas', () => {
        it('deberia crear area como admin', async () => {
            const res = await request(app)
                .post(`/api/v1/inspections/${testInspectionId}/execution/areas`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    name: 'Sala de prueba',
                    lengthM: 5.5,
                    widthM: 4.2,
                    ceilingHeightM: 2.8
                });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.area.name).toBe('Sala de prueba');
            expect(res.body.data.area.lengthM).toBe(5.5);
            expect(res.body.data.area.widthM).toBe(4.2);
            expect(res.body.data.area.calculatedAreaM2).toBe(23.1);
            testAreaId = res.body.data.area.id;
        });

        it('deberia rechazar area sin nombre', async () => {
            const res = await request(app)
                .post(`/api/v1/inspections/${testInspectionId}/execution/areas`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    lengthM: 5.5,
                    widthM: 4.2
                });

            expect(res.status).toBe(422);
            expect(res.body.success).toBe(false);
        });

        it('deberia rechazar area con nombre corto', async () => {
            const res = await request(app)
                .post(`/api/v1/inspections/${testInspectionId}/execution/areas`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    name: 'A'
                });

            expect(res.status).toBe(422);
        });

        it('deberia crear area como inspector asignado', async () => {
            const res = await request(app)
                .post(`/api/v1/inspections/${testInspectionId}/execution/areas`)
                .set('Authorization', `Bearer ${inspectorToken}`)
                .send({
                    name: 'Area del inspector'
                });

            expect(res.status).toBe(201);
            expect(res.body.data.area.name).toBe('Area del inspector');
        });
    });

    describe('POST /api/v1/inspections/:id/execution/areas/default', () => {
        it('deberia crear areas por defecto', async () => {
            const res = await request(app)
                .post(`/api/v1/inspections/${testInspectionId}/execution/areas/default`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.createdCount).toBeGreaterThanOrEqual(0);
        });
    });

    describe('PUT /api/v1/inspections/:id/execution/areas/:areaId', () => {
        it('deberia actualizar area', async () => {
            const res = await request(app)
                .put(`/api/v1/inspections/${testInspectionId}/execution/areas/${testAreaId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    name: 'Sala Actualizada',
                    lengthM: 6.0,
                    widthM: 5.0
                });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.area.name).toBe('Sala Actualizada');
            expect(res.body.data.area.calculatedAreaM2).toBe(30.0);
        });

        it('deberia retornar 404 para area inexistente', async () => {
            const fakeAreaId = '00000000-0000-0000-0000-000000000000';
            const res = await request(app)
                .put(`/api/v1/inspections/${testInspectionId}/execution/areas/${fakeAreaId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ name: 'No existe' });

            expect(res.status).toBe(404);
        });
    });

    describe('POST /api/v1/inspections/:id/execution/observations', () => {
        it('deberia crear observacion como admin', async () => {
            const res = await request(app)
                .post(`/api/v1/inspections/${testInspectionId}/execution/observations`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    areaId: testAreaId,
                    title: 'Humedad en pared',
                    description: 'Se observa humedad significativa en la pared norte',
                    severity: 'alta',
                    type: 'humedad',
                    metricValue: 85.5,
                    metricUnit: '%'
                });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.observation.title).toBe('Humedad en pared');
            expect(res.body.data.observation.severity).toBe('alta');
            expect(res.body.data.observation.creator).toBeDefined();
            testObservationId = res.body.data.observation.id;
        });

        it('deberia rechazar observacion sin campos requeridos', async () => {
            const res = await request(app)
                .post(`/api/v1/inspections/${testInspectionId}/execution/observations`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    areaId: testAreaId
                });

            expect(res.status).toBe(422);
        });

        it('deberia rechazar observacion con area inexistente', async () => {
            const fakeAreaId = '00000000-0000-0000-0000-000000000000';
            const res = await request(app)
                .post(`/api/v1/inspections/${testInspectionId}/execution/observations`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    areaId: fakeAreaId,
                    title: 'Test',
                    description: 'Test description',
                    severity: 'leve',
                    type: 'otro'
                });

            expect(res.status).toBe(404);
        });

        it('deberia rechazar severidad invalida', async () => {
            const res = await request(app)
                .post(`/api/v1/inspections/${testInspectionId}/execution/observations`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    areaId: testAreaId,
                    title: 'Test',
                    description: 'Test description',
                    severity: 'invalida',
                    type: 'otro'
                });

            expect(res.status).toBe(422);
        });
    });

    describe('PUT /api/v1/inspections/:id/execution/observations/:observationId', () => {
        it('deberia actualizar observacion', async () => {
            const res = await request(app)
                .put(`/api/v1/inspections/${testInspectionId}/execution/observations/${testObservationId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    title: 'Humedad actualizada',
                    severity: 'critica'
                });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.observation.title).toBe('Humedad actualizada');
            expect(res.body.data.observation.severity).toBe('critica');
        });

        it('deberia retornar 404 para observacion inexistente', async () => {
            const fakeObsId = '00000000-0000-0000-0000-000000000000';
            const res = await request(app)
                .put(`/api/v1/inspections/${testInspectionId}/execution/observations/${fakeObsId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ title: 'No existe' });

            expect(res.status).toBe(404);
        });
    });

    describe('POST /api/v1/inspections/:id/execution/photos', () => {
        it('deberia crear foto con URL como admin', async () => {
            const res = await request(app)
                .post(`/api/v1/inspections/${testInspectionId}/execution/photos`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    type: 'area',
                    url: 'https://example.com/photo.jpg',
                    areaId: testAreaId,
                    caption: 'Foto de prueba'
                });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.photo.type).toBe('area');
        });

        it('deberia rechazar foto sin tipo', async () => {
            const res = await request(app)
                .post(`/api/v1/inspections/${testInspectionId}/execution/photos`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    url: 'https://example.com/photo.jpg'
                });

            expect(res.status).toBe(422);
        });

        it('deberia rechazar foto tipo observacion sin observationId', async () => {
            const res = await request(app)
                .post(`/api/v1/inspections/${testInspectionId}/execution/photos`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    type: 'observacion',
                    url: 'https://example.com/photo.jpg'
                });

            expect(res.status).toBe(400);
        });

        it('deberia rechazar foto tipo area sin areaId', async () => {
            const res = await request(app)
                .post(`/api/v1/inspections/${testInspectionId}/execution/photos`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    type: 'area',
                    url: 'https://example.com/photo.jpg'
                });

            expect(res.status).toBe(400);
        });

        it('deberia rechazar foto sin fuente', async () => {
            const res = await request(app)
                .post(`/api/v1/inspections/${testInspectionId}/execution/photos`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    type: 'general'
                });

            expect(res.status).toBe(400);
        });
    });

    describe('PUT /api/v1/inspections/:id/execution/summary', () => {
        it('deberia actualizar resumen como admin', async () => {
            const res = await request(app)
                .put(`/api/v1/inspections/${testInspectionId}/execution/summary`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    generalConclusion: 'Conclusion de prueba',
                    finalRecommendations: 'Recomendaciones de prueba',
                    reportStatus: 'borrador'
                });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.summary.generalConclusion).toBe('Conclusion de prueba');
        });

        it('deberia rechazar body vacio', async () => {
            const res = await request(app)
                .put(`/api/v1/inspections/${testInspectionId}/execution/summary`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({});

            expect(res.status).toBe(422);
        });
    });

    describe('POST /api/v1/inspections/:id/execution/complete', () => {
        it('deberia rechazar completar sin areas', async () => {
            const inspection = await prisma.inspecciones.inspection.create({
                data: {
                    projectName: 'No Areas Test',
                    clientName: 'Test',
                    address: 'Address',
                    inspectionType: 'general',
                    status: 'en_proceso',
                    scheduledDate: new Date(Date.now() + 86400000),
                    inspectorId: testInspectorId,
                    createdById: adminUserId
                }
            });

            const res = await request(app)
                .post(`/api/v1/inspections/${inspection.id}/execution/complete`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({});

            expect(res.status).toBe(400);

            await prisma.inspecciones.inspection.deleteMany({ where: { id: inspection.id } }).catch(() => {});
        });
    });

    describe('RBAC - inspector permissions', () => {
        it('inspector asignado puede ver ejecucion', async () => {
            const res = await request(app)
                .get(`/api/v1/inspections/${testInspectionId}/execution`)
                .set('Authorization', `Bearer ${inspectorToken}`);

            expect(res.status).toBe(200);
        });

        it('inspector asignado puede crear area', async () => {
            const res = await request(app)
                .post(`/api/v1/inspections/${testInspectionId}/execution/areas`)
                .set('Authorization', `Bearer ${inspectorToken}`)
                .send({ name: 'Area Inspector Test' });

            expect(res.status).toBe(201);
        });
    });

    describe('DELETE /api/v1/inspections/:id/execution/areas/:areaId', () => {
        it('deberia eliminar area sin datos asociados', async () => {
            const createRes = await request(app)
                .post(`/api/v1/inspections/${testInspectionId}/execution/areas`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ name: 'Area Para Eliminar' });

            const areaId = createRes.body.data.area.id;

            const res = await request(app)
                .delete(`/api/v1/inspections/${testInspectionId}/execution/areas/${areaId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });

        it('deberia rechazar eliminar area con observaciones', async () => {
            const res = await request(app)
                .delete(`/api/v1/inspections/${testInspectionId}/execution/areas/${testAreaId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(400);
        });

        it('deberia retornar 404 para area inexistente', async () => {
            const fakeAreaId = '00000000-0000-0000-0000-000000000000';
            const res = await request(app)
                .delete(`/api/v1/inspections/${testInspectionId}/execution/areas/${fakeAreaId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(404);
        });
    });

    describe('DELETE /api/v1/inspections/:id/execution/observations/:observationId', () => {
        it('deberia eliminar observacion', async () => {
            const res = await request(app)
                .delete(`/api/v1/inspections/${testInspectionId}/execution/observations/${testObservationId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            testObservationId = null;
        });

        it('deberia retornar 404 para observacion inexistente', async () => {
            const fakeObsId = '00000000-0000-0000-0000-000000000000';
            const res = await request(app)
                .delete(`/api/v1/inspections/${testInspectionId}/execution/observations/${fakeObsId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(404);
        });
    });
});
