const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Notification = sequelize.define('Notification', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'user_id',
        references: {
            model: 'users',
            key: 'id'
        }
    },
    inspectionId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'inspection_id',
        references: {
            model: 'inspections',
            key: 'id'
        }
    },
    type: {
        type: DataTypes.STRING,
        allowNull: false
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    readAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'read_at'
    }
}, {
    tableName: 'notifications',
    timestamps: true,
    underscored: true
});

module.exports = Notification;
