const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const InspectionSummary = sequelize.define('InspectionSummary', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    inspectionId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        field: 'inspection_id',
        references: {
            model: 'inspections',
            key: 'id'
        }
    },
    totalAreaM2: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        field: 'total_area_m2'
    },
    totalObservations: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'total_observations'
    },
    criticalObservations: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'critical_observations'
    },
    highObservations: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'high_observations'
    },
    mediumObservations: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'medium_observations'
    },
    lightObservations: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'light_observations'
    },
    generalConclusion: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'general_conclusion'
    },
    finalRecommendations: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'final_recommendations'
    },
    reportStatus: {
        type: DataTypes.ENUM('borrador', 'listo_para_revision', 'aprobado'),
        allowNull: false,
        defaultValue: 'borrador',
        field: 'report_status'
    }
}, {
    tableName: 'inspection_summaries',
    timestamps: true,
    underscored: true
});

module.exports = InspectionSummary;
