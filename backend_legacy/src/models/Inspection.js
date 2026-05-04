const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Inspection = sequelize.define('Inspection', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    projectName: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Nombre del proyecto u obra'
    },
    clientName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    clientEmail: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
            isEmail: true
        }
    },
    clientPhone: {
        type: DataTypes.STRING,
        allowNull: true
    },
    address: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    city: {
        type: DataTypes.STRING,
        allowNull: true
    },
    state: {
        type: DataTypes.STRING,
        allowNull: true
    },
    zipCode: {
        type: DataTypes.STRING,
        allowNull: true
    },
    inspectionType: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Tipo de inspección (estructural, eléctrica, etc.)'
    },
    status: {
        type: DataTypes.ENUM('pendiente', 'en_proceso', 'lista_revision', 'finalizada', 'cancelada', 'reprogramada'),
        allowNull: false,
        defaultValue: 'pendiente'
    },
    scheduledDate: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: 'Fecha programada para la inspección'
    },
    completedDate: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Fecha en que se completó'
    },
    inspectorId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    createdById: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        },
        comment: 'Usuario que creó la inspección'
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Notas generales de la inspección'
    },
    reportUrl: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'URL del PDF generado'
    },
    latitude: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: true
    },
    longitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true
    }
}, {
    tableName: 'inspections',
    timestamps: true
});

module.exports = Inspection;
