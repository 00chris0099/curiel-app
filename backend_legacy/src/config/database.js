const { Sequelize } = require('sequelize');
const config = require('./index');

let sequelize;

const buildDialectOptions = () => {
    if (!config.database.ssl) {
        return undefined;
    }

    return {
        ssl: {
            require: true,
            rejectUnauthorized: false
        }
    };
};

if (config.database.url) {
    // Usar DATABASE_URL para producción (EasyPanel, Railway, Render, etc.)
    sequelize = new Sequelize(config.database.url, {
        dialect: config.database.dialect,
        protocol: 'postgres',
        dialectOptions: buildDialectOptions(),
        pool: config.database.pool,
        logging: config.database.logging
    });
} else {
    // Configuración local
    sequelize = new Sequelize(
        config.database.name,
        config.database.user,
        config.database.password,
        {
            host: config.database.host,
            port: config.database.port,
            dialect: config.database.dialect,
            dialectOptions: buildDialectOptions(),
            pool: config.database.pool,
            logging: config.database.logging
        }
    );
}

// Probar conexión
const testConnection = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ Base de datos conectada exitosamente');
        return true;
    } catch (error) {
        console.error('❌ Error al conectar a la base de datos:', error.message);
        return false;
    }
};

module.exports = { sequelize, testConnection };
