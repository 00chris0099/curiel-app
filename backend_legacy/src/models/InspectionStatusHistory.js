const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const InspectionStatusHistory = sequelize.define('InspectionStatusHistory', {
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
    changedByUserId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'changed_by_user_id',
        references: {
            model: 'users',
            key: 'id'
        }
    },
    fromStatus: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'from_status'
    },
    toStatus: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'to_status'
    },
    reasonCode: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'reason_code'
    },
    reasonLabel: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'reason_label'
    },
    comment: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    notifyClient: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'notify_client'
    },
    notifyInspector: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'notify_inspector'
    }
}, {
    tableName: 'inspection_status_histories',
    timestamps: true,
    underscored: true
});

module.exports = InspectionStatusHistory;
