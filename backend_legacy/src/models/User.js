const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    fullName: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'full_name'
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
    passwordHash: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'password_hash'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'is_active'
    },
    isMasterAdmin: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'is_master_admin',
        comment: 'Solo un usuario puede tener esto en true. Controla acceso total al sistema.'
    },
    createdBy: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'created_by'
    }
}, {
    tableName: 'users',
    timestamps: true,
    underscored: true,
    indexes: [
        {
            unique: true,
            fields: ['is_master_admin'],
            where: {
                is_master_admin: true
            }
        }
    ],
    hooks: {
        beforeCreate: async (user) => {
            if (user._plainPassword) {
                const salt = await bcrypt.genSalt(10);
                user.passwordHash = await bcrypt.hash(user._plainPassword, salt);
            }
        },
        beforeUpdate: async (user) => {
            if (user._plainPassword) {
                const salt = await bcrypt.genSalt(10);
                user.passwordHash = await bcrypt.hash(user._plainPassword, salt);
            }
        }
    }
});

// Virtual field for plaintext passwords
Object.defineProperty(User.prototype, 'password', {
    set(value) {
        this._plainPassword = value;
    }
});

// Virtual fields para compatibilidad con frontend (firstName/lastName)
Object.defineProperty(User.prototype, 'firstName', {
    get() {
        const name = this.getDataValue('fullName') || '';
        return name.split(' ')[0] || null;
    },
    set(value) {
        const current = this.getDataValue('fullName') || '';
        const parts = current.split(' ');
        parts[0] = value;
        this.setDataValue('fullName', parts.join(' ').trim());
    }
});

Object.defineProperty(User.prototype, 'lastName', {
    get() {
        const name = this.getDataValue('fullName') || '';
        const parts = name.split(' ');
        parts.shift();
        return parts.join(' ') || null;
    },
    set(value) {
        const current = this.getDataValue('fullName') || '';
        const parts = current.split(' ');
        parts.shift();
        this.setDataValue('fullName', [parts.join(' '), value].filter(Boolean).join(' ').trim());
    }
});

// Métodos de instancia
User.prototype.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.passwordHash);
};

User.prototype.toJSON = function () {
    const values = Object.assign({}, this.get());
    delete values.passwordHash;
    delete values._plainPassword;

    // For frontend compatibility
    const name = values.fullName || '';
    const parts = name.split(' ');
    values.firstName = parts[0] || null;
    values.lastName = parts.slice(1).join(' ') || null;

    return values;
};

module.exports = User;
