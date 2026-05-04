const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AuditLog = sequelize.define('AuditLog', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        },
        comment: 'Usuario que realizó la acción'
    },
    action: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Acción realizada (create, update, delete, login, etc.)'
    },
    entityType: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Tipo de entidad afectada (Inspection, User, etc.)'
    },
    entityId: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'ID de la entidad afectada'
    },
    changes: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Cambios realizados (antes/después)'
    },
    ipAddress: {
        type: DataTypes.STRING,
        allowNull: true
    },
    userAgent: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    details: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Información adicional'
    }
}, {
    tableName: 'audit_logs',
    timestamps: true,
    updatedAt: false
});

module.exports = AuditLog;
