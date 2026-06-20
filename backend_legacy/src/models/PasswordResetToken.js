const { DataTypes } = require('sequelize');
const crypto = require('crypto');
const { sequelize } = require('../config/database');

const PasswordResetToken = sequelize.define('PasswordResetToken', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'user_id'
    },
    token: {
        type: DataTypes.STRING(64),
        allowNull: false,
        unique: true
    },
    expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'expires_at'
    },
    usedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'used_at'
    }
}, {
    tableName: 'password_reset_tokens',
    timestamps: true,
    underscored: true,
    indexes: [
        { fields: ['user_id'] },
        { fields: ['token'], unique: true }
    ]
});

PasswordResetToken.generateToken = function () {
    return crypto.randomBytes(32).toString('hex');
};

PasswordResetToken.findByToken = async function (token) {
    return this.findOne({ where: { token, usedAt: null } });
};

PasswordResetToken.prototype.isExpired = function () {
    return new Date() > this.expiresAt;
};

PasswordResetToken.prototype.isUsed = function () {
    return this.usedAt !== null;
};

module.exports = PasswordResetToken;
