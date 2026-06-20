const { prisma } = require('../lib/databases');
const { AppError } = require('../middlewares/errorHandler');

class ClientService {
    async getAllClients(filters = {}) {
        const { search, documentType, page = 1, limit = 10 } = filters;

        const where = {};
        if (documentType) where.documentType = documentType;
        if (search) {
            where.OR = [
                { documentNumber: { contains: search, mode: 'insensitive' } },
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { razonSocial: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [clients, total] = await Promise.all([
            prisma.admin.client.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: parseInt(limit),
                skip
            }),
            prisma.admin.client.count({ where })
        ]);

        return {
            clients,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    async getClientById(clientId) {
        const client = await prisma.admin.client.findUnique({
            where: { id: clientId }
        });

        if (!client) {
            throw new AppError('Cliente no encontrado', 404, 'CLIENT_NOT_FOUND');
        }

        const inspectionCount = await prisma.inspecciones.inspection.count({
            where: { clientId }
        });

        return { ...client, inspectionCount };
    }

    async createClient(data, creatorId, isMasterAdmin = false) {
        const { documentType, documentNumber, firstName, lastName, razonSocial, email, phone, address, isProtected } = data;

        const normalizedEmail = email?.trim().toLowerCase();
        const normalizedDoc = documentNumber?.trim();

        if (!normalizedEmail) {
            throw new AppError('El email es requerido', 400, 'INVALID_EMAIL');
        }
        if (!normalizedDoc) {
            throw new AppError('El numero de documento es requerido', 400, 'INVALID_DOCUMENT');
        }

        const hasName = firstName && lastName;
        const hasRazon = razonSocial;
        if (!hasName && !hasRazon) {
            throw new AppError('Debe proporcionar nombre y apellido, o razon social', 400, 'MISSING_NAME_OR_RAZON');
        }

        if (isProtected && !isMasterAdmin) {
            throw new AppError('Solo el master admin puede proteger clientes', 403, 'FORBIDDEN');
        }

        const existingDoc = await prisma.admin.client.findUnique({
            where: { documentNumber: normalizedDoc }
        });
        if (existingDoc) {
            throw new AppError('Ya existe un cliente con ese documento', 409, 'DUPLICATE_DOCUMENT');
        }

        const existingEmail = await prisma.admin.client.findUnique({
            where: { email: normalizedEmail }
        });
        if (existingEmail) {
            throw new AppError('Ya existe un cliente con ese email', 409, 'DUPLICATE_EMAIL');
        }

        return prisma.admin.client.create({
            data: {
                documentType,
                documentNumber: normalizedDoc,
                firstName: firstName || null,
                lastName: lastName || null,
                razonSocial: razonSocial || null,
                email: normalizedEmail,
                phone: phone || null,
                address: address || null,
                isProtected: isProtected || false
            }
        });
    }

    async updateClient(clientId, data) {
        const client = await prisma.admin.client.findUnique({
            where: { id: clientId }
        });

        if (!client) {
            throw new AppError('Cliente no encontrado', 404, 'CLIENT_NOT_FOUND');
        }

        const { documentType, documentNumber, firstName, lastName, razonSocial, email, phone, address, isProtected } = data;

        if (documentNumber && documentNumber !== client.documentNumber) {
            const existing = await prisma.admin.client.findUnique({ where: { documentNumber } });
            if (existing) {
                throw new AppError('Ya existe un cliente con ese documento', 409, 'DUPLICATE_DOCUMENT');
            }
        }

        if (email && email.toLowerCase() !== client.email) {
            const existing = await prisma.admin.client.findUnique({ where: { email: email.toLowerCase() } });
            if (existing) {
                throw new AppError('Ya existe un cliente con ese email', 409, 'DUPLICATE_EMAIL');
            }
        }

        const updateData = {};
        if (documentType !== undefined) updateData.documentType = documentType;
        if (documentNumber !== undefined) updateData.documentNumber = documentNumber;
        if (firstName !== undefined) updateData.firstName = firstName;
        if (lastName !== undefined) updateData.lastName = lastName;
        if (razonSocial !== undefined) updateData.razonSocial = razonSocial;
        if (email !== undefined) updateData.email = email.toLowerCase().trim();
        if (phone !== undefined) updateData.phone = phone;
        if (address !== undefined) updateData.address = address;
        if (isProtected !== undefined) updateData.isProtected = isProtected;

        return prisma.admin.client.update({
            where: { id: clientId },
            data: updateData
        });
    }

    async deleteClient(clientId) {
        const client = await prisma.admin.client.findUnique({
            where: { id: clientId }
        });

        if (!client) {
            throw new AppError('Cliente no encontrado', 404, 'CLIENT_NOT_FOUND');
        }

        if (client.isProtected) {
            throw new AppError('No se puede eliminar un cliente protegido', 403, 'CLIENT_PROTECTED');
        }

        const inspectionCount = await prisma.inspecciones.inspection.count({
            where: { clientId }
        });

        if (inspectionCount > 0) {
            throw new AppError('No se puede eliminar un cliente con inspecciones asociadas', 400, 'CLIENT_HAS_INSPECTIONS');
        }

        await prisma.admin.client.delete({ where: { id: clientId } });

        return { deleted: true, clientId };
    }

    async searchClients(query) {
        if (!query || query.length < 2) return [];

        return prisma.admin.client.findMany({
            where: {
                OR: [
                    { documentNumber: { contains: query, mode: 'insensitive' } },
                    { firstName: { contains: query, mode: 'insensitive' } },
                    { lastName: { contains: query, mode: 'insensitive' } },
                    { razonSocial: { contains: query, mode: 'insensitive' } },
                    { email: { contains: query, mode: 'insensitive' } }
                ]
            },
            take: 10,
            orderBy: { firstName: 'asc' }
        });
    }

    async getClientInspections(clientId, filters = {}) {
        const client = await prisma.admin.client.findUnique({
            where: { id: clientId }
        });

        if (!client) {
            throw new AppError('Cliente no encontrado', 404, 'CLIENT_NOT_FOUND');
        }

        const { status, page = 1, limit = 10 } = filters;
        const where = { clientId };
        if (status) where.status = status;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [inspections, total] = await Promise.all([
            prisma.inspecciones.inspection.findMany({
                where,
                take: parseInt(limit),
                skip,
                orderBy: { scheduledDate: 'desc' }
            }),
            prisma.inspecciones.inspection.count({ where })
        ]);

        return {
            inspections,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    async autoDeleteClients() {
        const fifteenDaysAgo = new Date();
        fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

        const clientsToDelete = await prisma.admin.client.findMany({
            where: {
                createdAt: { lt: fifteenDaysAgo },
                isProtected: false
            }
        });

        const deleted = [];
        for (const client of clientsToDelete) {
            const inspectionCount = await prisma.inspecciones.inspection.count({
                where: { clientId: client.id }
            });

            if (inspectionCount === 0) {
                await prisma.admin.client.delete({ where: { id: client.id } });
                deleted.push(client.id);
            }
        }

        return { deletedCount: deleted.length, deletedIds: deleted };
    }
}

module.exports = new ClientService();
