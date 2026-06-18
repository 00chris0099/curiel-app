const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Evaluation = sequelize.define('Evaluation', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    evaluatedUserId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'evaluated_user_id'
    },
    supervisorId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'supervisor_id'
    },
    weekStart: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: 'week_start'
    },
    weekEnd: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: 'week_end'
    },
    inspectionsCompleted: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'inspections_completed'
    },
    avgTimePerInspection: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
        field: 'avg_time_per_inspection'
    },
    punctualityRate: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
        field: 'punctuality_rate'
    },
    avgPhotosPerInspection: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
        field: 'avg_photos_per_inspection'
    },
    criticalObservations: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'critical_observations'
    },
    rejectionRate: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
        field: 'rejection_rate'
    },
    completionRate: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
        field: 'completion_rate'
    },
    compositeScore: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
        field: 'composite_score'
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    actions: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('borrador', 'confirmada', 'enviada'),
        defaultValue: 'borrador'
    }
}, {
    tableName: 'evaluations',
    timestamps: true,
    underscored: true
});

module.exports = Evaluation;
