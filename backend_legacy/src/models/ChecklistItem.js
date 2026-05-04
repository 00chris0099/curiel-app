const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ChecklistItem = sequelize.define('ChecklistItem', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    templateId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'checklist_templates',
            key: 'id'
        }
    },
    itemText: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'Texto del ítem a verificar'
    },
    category: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Categoría o sección (ej: Seguridad, Estructura, etc.)'
    },
    orderIndex: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Orden de aparición en el checklist'
    },
    isRequired: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Si es obligatorio responder este ítem'
    }
}, {
    tableName: 'checklist_items',
    timestamps: true
});

module.exports = ChecklistItem;
