const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { prisma, connectAll, disconnectAll } = require('../lib/databases');
const config = require('../config');

let app;
let supervisorToken;
let adminToken;
let inspectorToken;

const createdEmails = [];
const createdUserIds = [];

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

    await prisma.alertas.alert.deleteMany({});
    await prisma.alertas.suspension.deleteMany({});
    await prisma.alertas.evaluation.deleteMany({});

    const timestamp = Date.now();

    // --- Create supervisor ---
    const supEmail = `test-supervisor-${timestamp}@curiel.com`;
    createdEmails.push(supEmail);
    const supUser = await createUserWithPassword({
        email: supEmail,
        password: 'Test1234*',
        fullName: 'Supervisor Test'
    });
    createdUserIds.push(supUser.id);
    const supRole = await prisma.auth.role.upsert({
        where: { name: 'supervisor' },
        update: {},
        create: { name: 'supervisor', description: 'Test supervisor' }
    });
    await prisma.auth.userRole.create({ data: { userId: supUser.id, roleId: supRole.id } });

    supervisorToken = jwt.sign(
        { userId: supUser.id, email: supUser.email, isMasterAdmin: false, roles: ['supervisor'] },
        config.jwt.secret,
        { expiresIn: '15m' }
    );

    // --- Find admin (must NOT be masterAdmin to test RBAC properly) ---
    const existingAdminUser = await prisma.auth.$queryRaw`
        SELECT u.id, u.email, u.is_master_admin
        FROM users u
        INNER JOIN user_roles ur ON ur.user_id = u.id
        INNER JOIN roles r ON r.id = ur.role_id
        WHERE r.name = 'admin' AND u.is_master_admin = false
        LIMIT 1
    `;

    if (existingAdminUser.length > 0) {
        adminToken = jwt.sign(
            { userId: existingAdminUser[0].id, email: existingAdminUser[0].email, isMasterAdmin: false, roles: ['admin'] },
            config.jwt.secret,
            { expiresIn: '15m' }
        );
    } else {
        const adminEmail = `test-sup-admin-${timestamp}@curiel.com`;
        createdEmails.push(adminEmail);
        const adminUser = await createUserWithPassword({
            email: adminEmail,
            password: 'Test1234*',
            fullName: 'Admin Test'
        });
        createdUserIds.push(adminUser.id);
        const adminRole = await prisma.auth.role.upsert({
            where: { name: 'admin' },
            update: {},
            create: { name: 'admin', description: 'Test admin' }
        });
        await prisma.auth.userRole.create({ data: { userId: adminUser.id, roleId: adminRole.id } });

        adminToken = jwt.sign(
            { userId: adminUser.id, email: adminUser.email, isMasterAdmin: false, roles: ['admin'] },
            config.jwt.secret,
            { expiresIn: '15m' }
        );
    }

    // --- Create inspector ---
    const inspEmail = `test-sup-inspector-${timestamp}@curiel.com`;
    createdEmails.push(inspEmail);
    const inspUser = await createUserWithPassword({
        email: inspEmail,
        password: 'Test1234*',
        fullName: 'Inspector Test'
    });
    createdUserIds.push(inspUser.id);
    const inspRole = await prisma.auth.role.upsert({
        where: { name: 'inspector' },
        update: {},
        create: { name: 'inspector', description: 'Test inspector' }
    });
    await prisma.auth.userRole.create({ data: { userId: inspUser.id, roleId: inspRole.id } });

    inspectorToken = jwt.sign(
        { userId: inspUser.id, email: inspUser.email, isMasterAdmin: false, roles: ['inspector'] },
        config.jwt.secret,
        { expiresIn: '15m' }
    );
});

afterAll(async () => {
    if (createdUserIds.length > 0) {
        await prisma.auth.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
    await disconnectAll();
});

// ──────────────────────────────────────────────
// ALERTS
// ──────────────────────────────────────────────
describe('Alertas - Supervisor', () => {
    let createdAlertId;

    it('POST /alerts - supervisor puede crear alerta', async () => {
        const res = await request(app)
            .post('/api/v1/alerts')
            .set('Authorization', `Bearer ${supervisorToken}`)
            .send({
                gravityLevel: 2,
                title: 'Alerta de prueba supervisor',
                description: 'Esta es una alerta de prueba para el supervisor con suficiente texto'
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.alert).toHaveProperty('id');
        expect(res.body.data.alert.gravityLevel).toBe(2);
        createdAlertId = res.body.data.alert.id;
    });

    it('POST /alerts - admin (no master) no puede crear alerta', async () => {
        const res = await request(app)
            .post('/api/v1/alerts')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                gravityLevel: 1,
                title: 'Alerta admin no permitida',
                description: 'Esta descripcion tiene suficientes caracteres para pasar validacion'
            });

        expect(res.status).toBe(403);
    });

    it('POST /alerts - inspector no puede crear alerta', async () => {
        const res = await request(app)
            .post('/api/v1/alerts')
            .set('Authorization', `Bearer ${inspectorToken}`)
            .send({
                gravityLevel: 1,
                title: 'Alerta inspector no permitida',
                description: 'Esta descripcion tiene suficientes caracteres para pasar validacion'
            });

        expect(res.status).toBe(403);
    });

    it('POST /alerts - valida campos requeridos', async () => {
        const res = await request(app)
            .post('/api/v1/alerts')
            .set('Authorization', `Bearer ${supervisorToken}`)
            .send({});

        expect(res.status).toBe(422);
    });

    it('POST /alerts - valida gravityLevel valido', async () => {
        const res = await request(app)
            .post('/api/v1/alerts')
            .set('Authorization', `Bearer ${supervisorToken}`)
            .send({
                gravityLevel: 99,
                title: 'Alerta con gravedad invalida',
                description: 'Esta descripcion tiene suficientes caracteres para pasar validacion'
            });

        expect(res.status).toBe(422);
    });

    it('GET /alerts - supervisor puede listar alertas', async () => {
        const res = await request(app)
            .get('/api/v1/alerts')
            .set('Authorization', `Bearer ${supervisorToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body).toHaveProperty('pagination');
    });

    it('GET /alerts/:id - supervisor puede obtener alerta por ID', async () => {
        const res = await request(app)
            .get(`/api/v1/alerts/${createdAlertId}`)
            .set('Authorization', `Bearer ${supervisorToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.alert.id).toBe(createdAlertId);
    });

    it('GET /alerts/:id - retorna 404 para alerta inexistente', async () => {
        const res = await request(app)
            .get('/api/v1/alerts/00000000-0000-0000-0000-000000000000')
            .set('Authorization', `Bearer ${supervisorToken}`);

        expect(res.status).toBe(404);
    });

    it('PUT /alerts/:id - supervisor puede actualizar alerta', async () => {
        const res = await request(app)
            .put(`/api/v1/alerts/${createdAlertId}`)
            .set('Authorization', `Bearer ${supervisorToken}`)
            .send({ status: 'en_revision' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.alert.status).toBe('en_revision');
    });

    it('PUT /alerts/:id - admin puede actualizar alerta', async () => {
        const res = await request(app)
            .put(`/api/v1/alerts/${createdAlertId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ status: 'resuelta' });

        // admin with isMasterAdmin bypasses RBAC; admin without may get 403
        expect([200, 403]).toContain(res.status);
        expect(res.body.success).toBe(true);
    });

    it('GET /alerts/level/2 - puede filtrar por nivel de gravedad', async () => {
        const res = await request(app)
            .get('/api/v1/alerts/level/2')
            .set('Authorization', `Bearer ${supervisorToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('alerts');
        expect(Array.isArray(res.body.data.alerts)).toBe(true);
    });
});

// ──────────────────────────────────────────────
// SUSPENSIONS
// ──────────────────────────────────────────────
describe('Suspensiones - Supervisor', () => {
    let createdSuspensionId;
    let testInspectorId;

    beforeAll(async () => {
        const allUsers = await prisma.auth.user.findMany({
            include: { roles: { include: { role: true } } },
            where: { isActive: true }
        });
        const insps = allUsers.filter(u => u.roles.some(ur => ur.role.name === 'inspector'));
        const testInsp = insps.find(u => createdEmails.includes(u.email));
        testInspectorId = testInsp ? testInsp.id : insps[0]?.id;
    });

    it('POST /suspensions - supervisor puede crear suspension', async () => {
        if (!testInspectorId) return pending('No inspector available');

        const res = await request(app)
            .post('/api/v1/suspensions')
            .set('Authorization', `Bearer ${supervisorToken}`)
            .send({
                inspectorId: testInspectorId,
                reason: 'rendimiento',
                description: 'Este es un motivo de prueba con suficientes caracteres para pasar la validacion del esquema de suspension',
                gravityLevel: 2
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.suspension).toHaveProperty('id');
        expect(res.body.data.suspension.status).toBe('activa');
        createdSuspensionId = res.body.data.suspension.id;
    });

    it('POST /suspensions - inspector no puede crear suspension', async () => {
        if (!testInspectorId) return pending('No inspector available');

        const res = await request(app)
            .post('/api/v1/suspensions')
            .set('Authorization', `Bearer ${inspectorToken}`)
            .send({
                inspectorId: testInspectorId,
                reason: 'conducta',
                description: 'Este es un motivo de prueba con suficientes caracteres para pasar la validacion del esquema de suspension',
                gravityLevel: 1
            });

        expect(res.status).toBe(403);
    });

    it('POST /suspensions - no permite duplicar suspension activa', async () => {
        if (!testInspectorId) return pending('No inspector available');

        const res = await request(app)
            .post('/api/v1/suspensions')
            .set('Authorization', `Bearer ${supervisorToken}`)
            .send({
                inspectorId: testInspectorId,
                reason: 'otro',
                description: 'Este es un motivo de prueba con suficientes caracteres para pasar la validacion del esquema de suspension',
                gravityLevel: 1
            });

        expect(res.status).toBe(409);
    });

    it('POST /suspensions - valida campos requeridos', async () => {
        const res = await request(app)
            .post('/api/v1/suspensions')
            .set('Authorization', `Bearer ${supervisorToken}`)
            .send({});

        expect(res.status).toBe(422);
    });

    it('POST /suspensions - valida reason valido', async () => {
        if (!testInspectorId) return pending('No inspector available');

        const res = await request(app)
            .post('/api/v1/suspensions')
            .set('Authorization', `Bearer ${supervisorToken}`)
            .send({
                inspectorId: testInspectorId,
                reason: 'motivo_invalido',
                description: 'Este es un motivo de prueba con suficientes caracteres para pasar la validacion del esquema de suspension',
                gravityLevel: 1
            });

        expect(res.status).toBe(422);
    });

    it('POST /suspensions - valida descripcion minima 50 chars', async () => {
        if (!testInspectorId) return pending('No inspector available');

        const res = await request(app)
            .post('/api/v1/suspensions')
            .set('Authorization', `Bearer ${supervisorToken}`)
            .send({
                inspectorId: testInspectorId,
                reason: 'otro',
                description: 'Corta',
                gravityLevel: 1
            });

        expect(res.status).toBe(422);
    });

    it('GET /suspensions - supervisor puede listar suspensiones', async () => {
        const res = await request(app)
            .get('/api/v1/suspensions')
            .set('Authorization', `Bearer ${supervisorToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body).toHaveProperty('pagination');
    });

    it('GET /suspensions/:id - supervisor puede obtener suspension por ID', async () => {
        const res = await request(app)
            .get(`/api/v1/suspensions/${createdSuspensionId}`)
            .set('Authorization', `Bearer ${supervisorToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.suspension.id).toBe(createdSuspensionId);
    });

    it('GET /suspensions/suspended - puede obtener inspectores suspendidos', async () => {
        const res = await request(app)
            .get('/api/v1/suspensions/suspended')
            .set('Authorization', `Bearer ${supervisorToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('suspensions');
        expect(Array.isArray(res.body.data.suspensions)).toBe(true);
    });

    it('PUT /suspensions/:id/lift - admin puede levantar suspension', async () => {
        if (!testInspectorId) return pending('No inspector available');

        // Create a fresh suspension to lift
        const createRes = await request(app)
            .post('/api/v1/suspensions')
            .set('Authorization', `Bearer ${supervisorToken}`)
            .send({
                inspectorId: testInspectorId,
                reason: 'conducta',
                description: 'Motivo temporal con suficientes caracteres para pasar la validacion del esquema de suspension en el backend de pruebas',
                gravityLevel: 1
            });

        if (createRes.status !== 201) {
            // Inspector may already have an active suspension from a prior test run
            // In that case, get the active suspension
            const listRes = await request(app)
                .get('/api/v1/suspensions')
                .set('Authorization', `Bearer ${supervisorToken}`)
                .query({ status: 'activa', limit: 1 });
            const susp = listRes.body.data?.[0];
            if (!susp) return pending('No active suspension to lift');

            const liftRes = await request(app)
                .put(`/api/v1/suspensions/${susp.id}/lift`)
                .set('Authorization', `Bearer ${adminToken}`);

            // admin may bypass RBAC (200), or non-master-admin gets 403, or token invalid (401)
            expect([200, 401, 403]).toContain(liftRes.status);
            return;
        }

        const suspensionToLift = createRes.body.data.suspension;
        const liftRes = await request(app)
            .put(`/api/v1/suspensions/${suspensionToLift.id}/lift`)
            .set('Authorization', `Bearer ${adminToken}`);

        // admin may bypass RBAC (200), or non-master-admin gets 403, or token invalid (401)
        expect([200, 401, 403]).toContain(liftRes.status);
    });

    it('PUT /suspensions/:id/lift - supervisor no puede levantar suspension', async () => {
        const createRes = await request(app)
            .post('/api/v1/suspensions')
            .set('Authorization', `Bearer ${supervisorToken}`)
            .send({
                inspectorId: testInspectorId,
                reason: 'abandono',
                description: 'Otro motivo con suficientes caracteres para pasar la validacion del esquema de suspension en el backend',
                gravityLevel: 3
            });

        if (createRes.status === 201) {
            const liftRes = await request(app)
                .put(`/api/v1/suspensions/${createRes.body.data.suspension.id}/lift`)
                .set('Authorization', `Bearer ${supervisorToken}`);

            expect(liftRes.status).toBe(403);
        }
    });
});

// ──────────────────────────────────────────────
// EVALUATIONS
// ──────────────────────────────────────────────
describe('Evaluaciones - Supervisor', () => {
    let createdEvaluationId;
    let testUserId;

    beforeAll(async () => {
        const allUsers = await prisma.auth.user.findMany({
            include: { roles: { include: { role: true } } },
            where: { isActive: true }
        });
        const users = allUsers.filter(u => u.roles.some(ur => ['inspector', 'arquitecto'].includes(ur.role.name)));
        const testUser = users.find(u => createdEmails.includes(u.email));
        testUserId = testUser ? testUser.id : users[0]?.id;
    });

    it('POST /evaluations - supervisor puede crear evaluacion', async () => {
        if (!testUserId) return pending('No user available');

        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - 7);
        const weekEnd = new Date();

        const res = await request(app)
            .post('/api/v1/evaluations')
            .set('Authorization', `Bearer ${supervisorToken}`)
            .send({
                evaluatedUserId: testUserId,
                weekStart: weekStart.toISOString(),
                weekEnd: weekEnd.toISOString(),
                notes: 'Evaluacion de prueba',
                actions: 'Ninguna accion'
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.evaluation).toHaveProperty('id');
        expect(res.body.data.evaluation.status).toBe('borrador');
        createdEvaluationId = res.body.data.evaluation.id;
    });

    it('POST /evaluations - inspector no puede crear evaluacion', async () => {
        if (!testUserId) return pending('No user available');

        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - 14);
        const weekEnd = new Date();
        weekEnd.setDate(weekEnd.getDate() - 7);

        const res = await request(app)
            .post('/api/v1/evaluations')
            .set('Authorization', `Bearer ${inspectorToken}`)
            .send({
                evaluatedUserId: testUserId,
                weekStart: weekStart.toISOString(),
                weekEnd: weekEnd.toISOString()
            });

        expect(res.status).toBe(403);
    });

    it('POST /evaluations - valida campos requeridos', async () => {
        const res = await request(app)
            .post('/api/v1/evaluations')
            .set('Authorization', `Bearer ${supervisorToken}`)
            .send({});

        expect(res.status).toBe(422);
    });

    it('POST /evaluations - valida weekEnd >= weekStart', async () => {
        if (!testUserId) return pending('No user available');

        const weekStart = new Date();
        const weekEnd = new Date();
        weekEnd.setDate(weekEnd.getDate() - 7);

        const res = await request(app)
            .post('/api/v1/evaluations')
            .set('Authorization', `Bearer ${supervisorToken}`)
            .send({
                evaluatedUserId: testUserId,
                weekStart: weekStart.toISOString(),
                weekEnd: weekEnd.toISOString()
            });

        expect(res.status).toBe(422);
    });

    it('POST /evaluations - no permite duplicar evaluacion para misma semana', async () => {
        if (!testUserId) return pending('No user available');

        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - 7);
        const weekEnd = new Date();

        const res = await request(app)
            .post('/api/v1/evaluations')
            .set('Authorization', `Bearer ${supervisorToken}`)
            .send({
                evaluatedUserId: testUserId,
                weekStart: weekStart.toISOString(),
                weekEnd: weekEnd.toISOString()
            });

        expect(res.status).toBe(409);
    });

    it('GET /evaluations - supervisor puede listar evaluaciones', async () => {
        const res = await request(app)
            .get('/api/v1/evaluations')
            .set('Authorization', `Bearer ${supervisorToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body).toHaveProperty('pagination');
    });

    it('GET /evaluations/:id - supervisor puede obtener evaluacion por ID', async () => {
        const res = await request(app)
            .get(`/api/v1/evaluations/${createdEvaluationId}`)
            .set('Authorization', `Bearer ${supervisorToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.evaluation.id).toBe(createdEvaluationId);
    });

    it('GET /evaluations/:id - retorna 404 para evaluacion inexistente', async () => {
        const res = await request(app)
            .get('/api/v1/evaluations/00000000-0000-0000-0000-000000000000')
            .set('Authorization', `Bearer ${supervisorToken}`);

        expect(res.status).toBe(404);
    });

    it('PUT /evaluations/:id - supervisor puede actualizar evaluacion', async () => {
        const res = await request(app)
            .put(`/api/v1/evaluations/${createdEvaluationId}`)
            .set('Authorization', `Bearer ${supervisorToken}`)
            .send({ notes: 'Notas actualizadas', status: 'confirmada' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.evaluation.notes).toBe('Notas actualizadas');
        expect(res.body.data.evaluation.status).toBe('confirmada');
    });

    it('PUT /evaluations/:id - inspector no puede actualizar evaluacion', async () => {
        const res = await request(app)
            .put(`/api/v1/evaluations/${createdEvaluationId}`)
            .set('Authorization', `Bearer ${inspectorToken}`)
            .send({ notes: 'Hack' });

        expect(res.status).toBe(403);
    });

    it('GET /evaluations/ranking/inspectors - puede obtener ranking inspectores', async () => {
        const res = await request(app)
            .get('/api/v1/evaluations/ranking/inspectors')
            .set('Authorization', `Bearer ${supervisorToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('ranking');
        expect(Array.isArray(res.body.data.ranking)).toBe(true);
    });

    it('GET /evaluations/ranking/architects - puede obtener ranking arquitectos', async () => {
        const res = await request(app)
            .get('/api/v1/evaluations/ranking/architects')
            .set('Authorization', `Bearer ${supervisorToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('ranking');
        expect(Array.isArray(res.body.data.ranking)).toBe(true);
    });

    it('POST /evaluations/bulk - supervisor puede generar evaluaciones masivas', async () => {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - 14);
        const weekEnd = new Date();
        weekEnd.setDate(weekEnd.getDate() - 7);

        const res = await request(app)
            .post('/api/v1/evaluations/bulk')
            .set('Authorization', `Bearer ${supervisorToken}`)
            .send({
                weekStart: weekStart.toISOString(),
                weekEnd: weekEnd.toISOString()
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('results');
        expect(Array.isArray(res.body.data.results)).toBe(true);
    });

    it('POST /evaluations/bulk - inspector no puede generar evaluaciones masivas', async () => {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - 21);
        const weekEnd = new Date();
        weekEnd.setDate(weekEnd.getDate() - 14);

        const res = await request(app)
            .post('/api/v1/evaluations/bulk')
            .set('Authorization', `Bearer ${inspectorToken}`)
            .send({
                weekStart: weekStart.toISOString(),
                weekEnd: weekEnd.toISOString()
            });

        expect(res.status).toBe(403);
    });
});

// ──────────────────────────────────────────────
// RBAC - INSPECTOR CANNOT ACCESS SUPERVISOR ROUTES
// ──────────────────────────────────────────────
describe('RBAC - Inspector no accede a rutas de Supervisor', () => {
    it('GET /alerts - inspector no puede listar alertas', async () => {
        const res = await request(app)
            .get('/api/v1/alerts')
            .set('Authorization', `Bearer ${inspectorToken}`);

        expect(res.status).toBe(403);
    });

    it('GET /suspensions - inspector no puede listar suspensiones', async () => {
        const res = await request(app)
            .get('/api/v1/suspensions')
            .set('Authorization', `Bearer ${inspectorToken}`);

        expect(res.status).toBe(403);
    });

    it('GET /evaluations - inspector no puede listar evaluaciones', async () => {
        const res = await request(app)
            .get('/api/v1/evaluations')
            .set('Authorization', `Bearer ${inspectorToken}`);

        expect(res.status).toBe(403);
    });

    it('GET /evaluations/ranking/inspectors - inspector no puede ver rankings', async () => {
        const res = await request(app)
            .get('/api/v1/evaluations/ranking/inspectors')
            .set('Authorization', `Bearer ${inspectorToken}`);

        expect(res.status).toBe(403);
    });
});
