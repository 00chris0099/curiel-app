const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const InspectionArea = sequelize.define('InspectionArea', {
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
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    category: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'interior'
    },
    lengthM: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        field: 'length_m'
    },
    widthM: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        field: 'width_m'
    },
    calculatedAreaM2: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        field: 'calculated_area_m2'
    },
    ceilingHeightM: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        field: 'ceiling_height_m'
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('pendiente', 'en_revision', 'observado', 'aprobado'),
        allowNull: false,
        defaultValue: 'pendiente'
    },
    sortOrder: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'sort_order'
    }
}, {
    tableName: 'inspection_areas',
    timestamps: true,
    underscored: true
});

module.exports = InspectionArea;
