const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ChecklistTemplate = sequelize.define('ChecklistTemplate', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Nombre de la plantilla (ej: Inspección Estructural)'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    inspectionType: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Tipo de inspección asociado'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    createdById: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    }
}, {
    tableName: 'checklist_templates',
    timestamps: true
});

module.exports = ChecklistTemplate;
