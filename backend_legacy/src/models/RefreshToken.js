const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const crypto = require('crypto');

const RefreshToken = sequelize.define('RefreshToken', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    token: {
        type: DataTypes.STRING(512),
        allowNull: false,
        unique: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'user_id'
    },
    expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'expires_at'
    },
    revokedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'revoked_at'
    },
    replacedByToken: {
        type: DataTypes.STRING(512),
        allowNull: true,
        field: 'replaced_by_token'
    },
    ipAddress: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'ip_address'
    },
    userAgent: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'user_agent'
    }
}, {
    tableName: 'refresh_tokens',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [
        { unique: true, fields: ['token'] },
        { fields: ['user_id'] },
        { fields: ['expires_at'] }
    ]
});

/**
 * Generar un refresh token aleatorio
 */
RefreshToken.generateToken = () => {
    return crypto.randomBytes(64).toString('hex');
};

/**
 * Verificar si el token esta expirado
 */
RefreshToken.prototype.isExpired = function () {
    return new Date() > this.expiresAt;
};

/**
 * Verificar si el token esta revocado
 */
RefreshToken.prototype.isRevoked = function () {
    return this.revokedAt !== null;
};

/**
 * Verificar si el token es valido (no expirado y no revocado)
 */
RefreshToken.prototype.isValid = function () {
    return !this.isExpired() && !this.isRevoked();
};

/**
 * Revocar el token
 */
RefreshToken.prototype.revoke = async function (replacedBy = null) {
    this.revokedAt = new Date();
    this.replacedByToken = replacedBy;
    await this.save();
};

module.exports = RefreshToken;
