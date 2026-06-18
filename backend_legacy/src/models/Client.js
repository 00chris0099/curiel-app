const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Client = sequelize.define('Client', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    documentType: {
        type: DataTypes.ENUM('dni', 'ruc', 'ce'),
        allowNull: false,
        field: 'document_type'
    },
    documentNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        field: 'document_number'
    },
    firstName: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'first_name'
    },
    lastName: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'last_name'
    },
    razonSocial: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'razon_social'
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: true
    },
    address: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    isProtected: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'is_protected'
    }
}, {
    tableName: 'clients',
    timestamps: true,
    underscored: true
});

module.exports = Client;
