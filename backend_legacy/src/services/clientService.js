const { Client, Inspection, User, Role } = require('../models');
const { AppError } = require('../middlewares/errorHandler');
const { Op } = require('sequelize');

class ClientService {
    /**
     * Obtener todos los clientes con filtros y paginacion
     */
    async getAllClients(filters = {}) {
        const { search, documentType, page = 1, limit = 10 } = filters;

        const where = {};

        if (documentType) {
            where.documentType = documentType;
        }

        if (search) {
            where[Op.or] = [
                { documentNumber: { [Op.iLike]: `%${search}%` } },
                { firstName: { [Op.iLike]: `%${search}%` } },
                { lastName: { [Op.iLike]: `%${search}%` } },
                { razonSocial: { [Op.iLike]: `%${search}%` } },
                { email: { [Op.iLike]: `%${search}%` } }
            ];
        }

        const offset = (page - 1) * limit;

        const { count, rows } = await Client.findAndCountAll({
            where,
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['createdAt', 'DESC']]
        });

        return {
            clients: rows,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / limit)
            }
        };
    }

    /**
     * Obtener cliente por ID con conteo de inspecciones
     */
    async getClientById(clientId) {
        const client = await Client.findByPk(clientId, {
            include: [{
                model: Inspection,
                as: 'inspections',
                attributes: ['id']
            }]
        });

        if (!client) {
            throw new AppError('Cliente no encontrado', 404, 'CLIENT_NOT_FOUND');
        }

        const plain = client.toJSON();
        plain.inspectionCount = plain.inspections ? plain.inspections.length : 0;
        delete plain.inspections;

        return plain;
    }

    /**
     * Crear nuevo cliente
     */
    async createClient(data, creatorId, isMasterAdmin = false) {
        const {
            documentType,
            documentNumber,
            firstName,
            lastName,
            razonSocial,
            email,
            phone,
            address,
            isProtected
        } = data;

        const normalizedEmail = email?.trim().toLowerCase();
        const normalizedDoc = documentNumber?.trim();

        if (!normalizedEmail) {
            throw new AppError('El email es requerido', 400, 'INVALID_EMAIL');
        }

        if (!normalizedDoc) {
            throw new AppError('El numero de documento es requerido', 400, 'INVALID_DOCUMENT');
        }

        // Validar que tenga nombre o razon social
        const hasName = firstName && lastName;
        const hasRazon = razonSocial;
        if (!hasName && !hasRazon) {
            throw new AppError(
                'Debe proporcionar nombre y apellido, o razon social',
                400,
                'MISSING_NAME_OR_RAZON'
            );
        }

        // Solo masterAdmin puede marcar isProtected
        if (isProtected && !isMasterAdmin) {
            throw new AppError(
                'Solo el master admin puede proteger clientes',
                403,
                'FORBIDDEN'
            );
        }

        // Verificar duplicados
        const existingDoc = await Client.findOne({ where: { documentNumber: normalizedDoc } });
        if (existingDoc) {
            throw new AppError(
                'Ya existe un cliente con ese documento',
                409,
                'DUPLICATE_DOCUMENT'
            );
        }

        const existingEmail = await Client.findOne({ where: { email: normalizedEmail } });
        if (existingEmail) {
            throw new AppError(
                'Ya existe un cliente con ese email',
                409,
                'DUPLICATE_EMAIL'
            );
        }

        const client = await Client.create({
            documentType,
            documentNumber: normalizedDoc,
            firstName: firstName || null,
            lastName: lastName || null,
            razonSocial: razonSocial || null,
            email: normalizedEmail,
            phone: phone || null,
            address: address || null,
            isProtected: isProtected || false
        });

        return client;
    }

    /**
     * Actualizar cliente
     */
    async updateClient(clientId, data) {
        const client = await Client.findByPk(clientId);

        if (!client) {
            throw new AppError('Cliente no encontrado', 404, 'CLIENT_NOT_FOUND');
        }

        const {
            documentType,
            documentNumber,
            firstName,
            lastName,
            razonSocial,
            email,
            phone,
            address,
            isProtected
        } = data;

        // Verificar duplicados si cambia documento
        if (documentNumber && documentNumber !== client.documentNumber) {
            const existing = await Client.findOne({ where: { documentNumber } });
            if (existing) {
                throw new AppError(
                    'Ya existe un cliente con ese documento',
                    409,
                    'DUPLICATE_DOCUMENT'
                );
            }
        }

        // Verificar duplicados si cambia email
        if (email && email.toLowerCase() !== client.email) {
            const existing = await Client.findOne({
                where: { email: email.toLowerCase() }
            });
            if (existing) {
                throw new AppError(
                    'Ya existe un cliente con ese email',
                    409,
                    'DUPLICATE_EMAIL'
                );
            }
        }

        // Actualizar campos
        if (documentType !== undefined) client.documentType = documentType;
        if (documentNumber !== undefined) client.documentNumber = documentNumber;
        if (firstName !== undefined) client.firstName = firstName;
        if (lastName !== undefined) client.lastName = lastName;
        if (razonSocial !== undefined) client.razonSocial = razonSocial;
        if (email !== undefined) client.email = email.toLowerCase().trim();
        if (phone !== undefined) client.phone = phone;
        if (address !== undefined) client.address = address;
        if (isProtected !== undefined) client.isProtected = isProtected;

        await client.save();

        return client;
    }

    /**
     * Eliminar cliente (hard delete)
     */
    async deleteClient(clientId) {
        const client = await Client.findByPk(clientId, {
            include: [{
                model: Inspection,
                as: 'inspections',
                attributes: ['id']
            }]
        });

        if (!client) {
            throw new AppError('Cliente no encontrado', 404, 'CLIENT_NOT_FOUND');
        }

        if (client.isProtected) {
            throw new AppError(
                'No se puede eliminar un cliente protegido',
                403,
                'CLIENT_PROTECTED'
            );
        }

        // Si tiene inspecciones, solo admin/masterAdmin puede eliminar
        if (client.inspections && client.inspections.length > 0) {
            throw new AppError(
                'No se puede eliminar un cliente con inspecciones asociadas',
                400,
                'CLIENT_HAS_INSPECTIONS'
            );
        }

        await client.destroy();

        return { deleted: true, clientId };
    }

    /**
     * Buscar clientes por documento, nombre o email
     */
    async searchClients(query) {
        if (!query || query.length < 2) {
            return [];
        }

        const clients = await Client.findAll({
            where: {
                [Op.or]: [
                    { documentNumber: { [Op.iLike]: `%${query}%` } },
                    { firstName: { [Op.iLike]: `%${query}%` } },
                    { lastName: { [Op.iLike]: `%${query}%` } },
                    { razonSocial: { [Op.iLike]: `%${query}%` } },
                    { email: { [Op.iLike]: `%${query}%` } }
                ]
            },
            limit: 10,
            order: [['firstName', 'ASC']]
        });

        return clients;
    }

    /**
     * Obtener historial de inspecciones de un cliente
     */
    async getClientInspections(clientId, filters = {}) {
        const client = await Client.findByPk(clientId);

        if (!client) {
            throw new AppError('Cliente no encontrado', 404, 'CLIENT_NOT_FOUND');
        }

        const { status, page = 1, limit = 10 } = filters;

        const where = { clientId };
        if (status) {
            where.status = status;
        }

        const offset = (page - 1) * limit;

        const { count, rows } = await Inspection.findAndCountAll({
            where,
            include: [
                {
                    model: User,
                    as: 'inspector',
                    attributes: ['id', 'fullName', 'email']
                }
            ],
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['scheduledDate', 'DESC']]
        });

        return {
            inspections: rows,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / limit)
            }
        };
    }

    /**
     * Auto-eliminacion de clientes sin inspecciones (cron job)
     * Elimina clientes que:
     * - Tienen mas de 15 dias creados
     * - No estan protegidos
     * - No tienen inspecciones asociadas
     */
    async autoDeleteClients() {
        const fifteenDaysAgo = new Date();
        fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

        const clientsToDelete = await Client.findAll({
            where: {
                createdAt: { [Op.lt]: fifteenDaysAgo },
                isProtected: false
            },
            include: [{
                model: Inspection,
                as: 'inspections',
                attributes: ['id'],
                required: false
            }]
        });

        const deleted = [];
        for (const client of clientsToDelete) {
            if (!client.inspections || client.inspections.length === 0) {
                await client.destroy();
                deleted.push(client.id);
            }
        }

        return { deletedCount: deleted.length, deletedIds: deleted };
    }
}

module.exports = new ClientService();
