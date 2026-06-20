require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');
const { User } = require('../models');

const EMAIL = process.argv[2] || 'admin@curiel.com';
const NEW_PASSWORD = process.argv[3];

if (!NEW_PASSWORD) {
    console.error('Uso: node scripts/change-password.js <email> <nueva-contrasena>');
    console.error('Ejemplo: node scripts/change-password.js admin@curiel.com MiNuevaPass123');
    process.exit(1);
}

const changePassword = async () => {
    try {
        await sequelize.authenticate();
        console.log('Conectado a la base de datos');

        const user = await User.findOne({ where: { email: EMAIL } });
        if (!user) {
            console.error(`Usuario no encontrado: ${EMAIL}`);
            process.exit(1);
        }

        const passwordHash = await bcrypt.hash(NEW_PASSWORD, 10);
        user.passwordHash = passwordHash;
        await user.save();

        console.log(`Contrasena actualizada para: ${EMAIL}`);
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
};

changePassword();
