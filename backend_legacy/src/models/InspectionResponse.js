const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const InspectionResponse = sequelize.define('InspectionResponse', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    inspectionId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'inspections',
            key: 'id'
        }
    },
    checklistItemId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'checklist_items',
            key: 'id'
        }
    },
    status: {
        type: DataTypes.ENUM('cumple', 'no_cumple', 'no_aplica'),
        allowNull: false
    },
    observations: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Observaciones específicas del ítem'
    },
    respondedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'inspection_responses',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['inspectionId', 'checklistItemId']
        }
    ]
});

module.exports = InspectionResponse;
