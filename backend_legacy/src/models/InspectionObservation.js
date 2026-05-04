const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const InspectionObservation = sequelize.define('InspectionObservation', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    inspectionId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'inspection_id',
        references: {
            model: 'inspections',
            key: 'id'
        }
    },
    areaId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'area_id',
        references: {
            model: 'inspection_areas',
            key: 'id'
        }
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    severity: {
        type: DataTypes.ENUM('leve', 'media', 'alta', 'critica'),
        allowNull: false
    },
    type: {
        type: DataTypes.ENUM('humedad', 'electrico', 'sanitario', 'acabados', 'carpinteria', 'estructura', 'seguridad', 'otro'),
        allowNull: false
    },
    recommendation: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    metricValue: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        field: 'metric_value'
    },
    metricUnit: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'metric_unit'
    },
    status: {
        type: DataTypes.ENUM('pendiente', 'corregido', 'requiere_revision'),
        allowNull: false,
        defaultValue: 'pendiente'
    },
    createdBy: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'created_by',
        references: {
            model: 'users',
            key: 'id'
        }
    }
}, {
    tableName: 'inspection_observations',
    timestamps: true,
    underscored: true
});

module.exports = InspectionObservation;
