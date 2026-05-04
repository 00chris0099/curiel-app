const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Photo = sequelize.define('Photo', {
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
        allowNull: true,
        references: {
            model: 'checklist_items',
            key: 'id'
        },
        comment: 'Ítem asociado (opcional)'
    },
    areaId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'area_id',
        references: {
            model: 'inspection_areas',
            key: 'id'
        }
    },
    observationId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'observation_id',
        references: {
            model: 'inspection_observations',
            key: 'id'
        }
    },
    type: {
        type: DataTypes.ENUM('edificio', 'plano', 'area', 'observacion', 'general'),
        allowNull: false,
        defaultValue: 'general'
    },
    url: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'URL de Cloudinary'
    },
    publicId: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Public ID de Cloudinary para eliminación'
    },
    caption: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Descripción de la foto'
    },
    latitude: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: true
    },
    longitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true
    },
    takenAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'Fecha y hora en que se tomó la foto'
    },
    uploadedById: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    }
}, {
    tableName: 'photos',
    timestamps: true
});

module.exports = Photo;
