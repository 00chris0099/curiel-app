require('dotenv').config();
const { defineConfig } = require('prisma/config');

module.exports = defineConfig({
    schema: 'prisma/schema.prisma',
    migrations: {
        path: 'prisma/migrations',
    },
    datasource: {
        // Base única (recomendado) o legacy (primer microservicio).
        // Solo se usa para comandos de CLI que necesitan la URL.
        url: process.env.DATABASE_URL || process.env.DATABASE_URL_AUTH,
    },
});
