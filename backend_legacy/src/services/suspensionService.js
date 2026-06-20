const { prisma } = require('../lib/databases');
const { AppError } = require('../middlewares/errorHandler');

class SuspensionService {
    async createSuspension(data, supervisorId) {
        const { inspectorId, reason, description, gravityLevel, evidence } = data;

        const inspector = await prisma.auth.user.findUnique({
            where: { id: inspectorId },
            select: {
                id: true,
                fullName: true,
                roles: { select: { role: { select: { name: true } } } }
            }
        });

        if (!inspector) {
            throw new AppError('Inspector no encontrado', 404, 'INSPECTOR_NOT_FOUND');
        }

        const hasInspectorRole = inspector.roles.some(r => r.role.name === 'inspector');
        if (!hasInspectorRole) {
            throw new AppError('El usuario no tiene rol de inspector', 400, 'NOT_INSPECTOR');
        }

        const activeSuspension = await prisma.alertas.suspension.findFirst({
            where: { inspectorId, status: 'activa' }
        });

        if (activeSuspension) {
            throw new AppError('El inspector ya tiene una suspension activa', 409, 'ACTIVE_SUSPENSION');
        }

        const suspension = await prisma.alertas.suspension.create({
            data: {
                inspectorId,
                supervisorId,
                reason,
                description,
                gravityLevel,
                evidence: evidence || [],
                status: 'activa'
            }
        });

        const reassignResult = await this.reassignPendingInspections(inspectorId);

        return { ...suspension, reassignedInspections: reassignResult.count };
    }

    async reassignPendingInspections(suspendedInspectorId) {
        const pendingInspections = await prisma.inspecciones.inspection.findMany({
            where: {
                inspectorId: suspendedInspectorId,
                status: { in: ['pendiente', 'en_proceso'] }
            }
        });

        if (pendingInspections.length === 0) {
            return { count: 0, inspections: [] };
        }

        const activeSuspensions = await prisma.alertas.suspension.findMany({
            where: { status: 'activa' },
            select: { inspectorId: true }
        });

        const suspendedUserIds = activeSuspensions.map(s => s.inspectorId);
        const excludedIds = [suspendedInspectorId, ...suspendedUserIds];

        const activeUserRoleRecords = await prisma.auth.userRole.findMany({
            where: {
                role: { name: 'inspector' },
                user: { isActive: true, id: { notIn: excludedIds } }
            },
            select: { userId: true }
        });

        const availableInspectorIds = [...new Set(activeUserRoleRecords.map(ur => ur.userId))];

        if (availableInspectorIds.length === 0) {
            return { count: 0, inspections: [], warning: 'No hay inspectores disponibles para reasignar' };
        }

        const availableInspectors = await prisma.auth.user.findMany({
            where: { id: { in: availableInspectorIds } },
            select: { id: true, fullName: true }
        });

        const reassigned = [];
        for (const inspection of pendingInspections) {
            const inspectorLoads = await Promise.all(
                availableInspectors.map(async (insp) => {
                    const count = await prisma.inspecciones.inspection.count({
                        where: {
                            inspectorId: insp.id,
                            status: { in: ['pendiente', 'en_proceso'] }
                        }
                    });
                    return { inspector: insp, count };
                })
            );

            inspectorLoads.sort((a, b) => a.count - b.count);
            const bestInspector = inspectorLoads[0].inspector;

            await prisma.inspecciones.inspection.update({
                where: { id: inspection.id },
                data: { inspectorId: bestInspector.id }
            });

            reassigned.push({
                inspectionId: inspection.id,
                projectName: inspection.projectName,
                newInspectorId: bestInspector.id,
                newInspectorName: bestInspector.fullName
            });
        }

        return { count: reassigned.length, inspections: reassigned };
    }

    async getAllSuspensions(filters = {}) {
        const { status, inspectorId, page = 1, limit = 20 } = filters;

        const where = {};
        if (status) where.status = status;
        if (inspectorId) where.inspectorId = inspectorId;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [suspensions, total] = await Promise.all([
            prisma.alertas.suspension.findMany({
                where,
                take: parseInt(limit),
                skip,
                orderBy: { createdAt: 'desc' }
            }),
            prisma.alertas.suspension.count({ where })
        ]);

        return {
            suspensions,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    async getSuspensionById(id) {
        const suspension = await prisma.alertas.suspension.findUnique({
            where: { id }
        });

        if (!suspension) {
            throw new AppError('Suspension no encontrada', 404, 'SUSPENSION_NOT_FOUND');
        }

        return suspension;
    }

    async liftSuspension(id) {
        const suspension = await prisma.alertas.suspension.findUnique({
            where: { id }
        });

        if (!suspension) {
            throw new AppError('Suspension no encontrada', 404, 'SUSPENSION_NOT_FOUND');
        }

        if (suspension.status === 'levantada') {
            throw new AppError('La suspension ya fue levantada', 400, 'ALREADY_LIFTED');
        }

        return prisma.alertas.suspension.update({
            where: { id },
            data: { status: 'levantada' }
        });
    }

    async isInspectorSuspended(inspectorId) {
        const suspension = await prisma.alertas.suspension.findFirst({
            where: { inspectorId, status: 'activa' }
        });
        return !!suspension;
    }

    async getSuspendedInspectors() {
        return prisma.alertas.suspension.findMany({
            where: { status: 'activa' },
            orderBy: { createdAt: 'desc' }
        });
    }
}

module.exports = new SuspensionService();
