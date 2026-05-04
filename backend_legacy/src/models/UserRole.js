const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserRole = sequelize.define('UserRole', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        },
        field: 'user_id'
    },
    roleId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'roles',
            key: 'id'
        },
        field: 'role_id'
    },
    assignedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'assigned_at'
    },
    assignedBy: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'assigned_by'
    }
}, {
    tableName: 'user_roles',
    timestamps: false,
    underscored: true
});

module.exports = UserRole;
