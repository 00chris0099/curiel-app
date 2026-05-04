const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Signature = sequelize.define('Signature', {
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
    signatureType: {
        type: DataTypes.ENUM('inspector', 'client'),
        allowNull: false
    },
    signatureUrl: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'URL de la imagen de firma en Cloudinary'
    },
    publicId: {
        type: DataTypes.STRING,
        allowNull: false
    },
    signerName: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Nombre de quien firma'
    },
    signedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'signatures',
    timestamps: true
});

module.exports = Signature;
