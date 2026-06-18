const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Suspension = sequelize.define('Suspension', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    inspectorId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'inspector_id'
    },
    supervisorId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'supervisor_id'
    },
    reason: {
        type: DataTypes.ENUM('abandono', 'rendimiento', 'conducta', 'otro'),
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
            len: [50, Infinity]
        }
    },
    gravityLevel: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: { isIn: [[1, 2, 3]] },
        field: 'gravity_level'
    },
    status: {
        type: DataTypes.ENUM('activa', 'levantada'),
        defaultValue: 'activa'
    },
    evidence: {
        type: DataTypes.JSON,
        defaultValue: []
    }
}, {
    tableName: 'suspensions',
    timestamps: true,
    underscored: true
});

module.exports = Suspension;
