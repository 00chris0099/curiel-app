const path = require('path');
require('dotenv').config({
    path: path.resolve(__dirname, '../../.env')
});

module.exports = {
    development: {
        username: process.env.DB_USER || 'postgres',
        password: String(process.env.DB_PASSWORD || 'postgres123'),
        database: process.env.DB_NAME,
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT),
        dialect: 'postgres',
        logging: false
    },
    production: {
        use_env_variable: process.env.DATABASE_URL ? 'DATABASE_URL' : undefined,
        username: process.env.DB_USER || 'postgres',
        password: String(process.env.DB_PASSWORD || 'postgres123'),
        database: process.env.DB_NAME,
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT),
        dialect: 'postgres',
        dialectOptions: process.env.DATABASE_SSL === 'true'
            ? {
                ssl: {
                    require: true,
                    rejectUnauthorized: false
                }
            }
            : undefined,
        logging: false
    }
};

