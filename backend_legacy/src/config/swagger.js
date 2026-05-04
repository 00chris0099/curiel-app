const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const config = require('../config');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'CURIEL API - Sistema de Inspecciones Técnicas',
            version: '1.0.0',
            description: 'API REST para el sistema de gestión de inspecciones técnicas de construcción',
            contact: {
                name: 'CURIEL',
                email: 'soporte@curiel.com'
            },
            license: {
                name: 'Proprietary',
                url: 'https://curiel.com/license'
            }
        },
        servers: [
            {
                url: `${config.urls.backend}/api/${config.server.apiVersion}`,
                description: 'Servidor de desarrollo'
            },
            {
                url: `https://api.curiel.com/api/${config.server.apiVersion}`,
                description: 'Servidor de producción'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Ingresa el token JWT obtenido del endpoint /auth/login'
                }
            },
            schemas: {
                User: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        email: { type: 'string', format: 'email' },
                        firstName: { type: 'string' },
                        lastName: { type: 'string' },
                        role: { type: 'string', enum: ['admin', 'arquitecto', 'inspector'] },
                        phone: { type: 'string', nullable: true },
                        isActive: { type: 'boolean' },
                        lastLogin: { type: 'string', format: 'date-time', nullable: true },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' }
                    }
                },
                Inspection: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        projectName: { type: 'string' },
                        clientName: { type: 'string' },
                        clientEmail: { type: 'string', format: 'email', nullable: true },
                        clientPhone: { type: 'string', nullable: true },
                        address: { type: 'string' },
                        city: { type: 'string', nullable: true },
                        state: { type: 'string', nullable: true },
                        zipCode: { type: 'string', nullable: true },
                        inspectionType: { type: 'string' },
                        status: { type: 'string', enum: ['pendiente', 'en_proceso', 'finalizada', 'cancelada'] },
                        scheduledDate: { type: 'string', format: 'date-time' },
                        completedDate: { type: 'string', format: 'date-time', nullable: true },
                        notes: { type: 'string', nullable: true },
                        latitude: { type: 'number', nullable: true },
                        longitude: { type: 'number', nullable: true },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' }
                    }
                },
                ChecklistTemplate: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        name: { type: 'string' },
                        description: { type: 'string', nullable: true },
                        category: { type: 'string' },
                        isActive: { type: 'boolean' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' }
                    }
                },
                Photo: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        url: { type: 'string', format: 'uri' },
                        publicId: { type: 'string' },
                        description: { type: 'string', nullable: true },
                        filename: { type: 'string' },
                        mimeType: { type: 'string' },
                        size: { type: 'integer' },
                        createdAt: { type: 'string', format: 'date-time' }
                    }
                },
                Error: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: false },
                        error: {
                            type: 'object',
                            properties: {
                                code: { type: 'string' },
                                message: { type: 'string' },
                                details: { type: 'string', nullable: true }
                            }
                        }
                    }
                },
                Success: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        message: { type: 'string' },
                        data: { type: 'object' }
                    }
                }
            }
        },
        security: [
            {
                bearerAuth: []
            }
        ],
        tags: [
            { name: 'Auth', description: 'Autenticación y autorización' },
            { name: 'Users', description: 'Gestión de usuarios' },
            { name: 'Inspections', description: 'Gestión de inspecciones' },
            { name: 'Checklists', description: 'Gestión de checklists y templates' },
            { name: 'Photos', description: 'Gestión de fotografías y evidencias' }
        ]
    },
    apis: ['./src/routes/*.js', './src/controllers/*.js']
};

const specs = swaggerJsdoc(options);

module.exports = {
    specs,
    swaggerUi
};
