const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Alert = sequelize.define('Alert', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    inspectionId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'inspection_id'
    },
    suspensionId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'suspension_id'
    },
    supervisorId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'supervisor_id'
    },
    gravityLevel: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: { isIn: [[1, 2, 3]] },
        field: 'gravity_level'
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('abierta', 'en_revision', 'resuelta'),
        defaultValue: 'abierta'
    },
    notifiedUsers: {
        type: DataTypes.JSON,
        defaultValue: [],
        field: 'notified_users'
    }
}, {
    tableName: 'alerts',
    timestamps: true,
    underscored: true
});

module.exports = Alert;
