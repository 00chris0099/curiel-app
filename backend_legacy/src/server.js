require('dotenv').config();
const config = require('./config');
const { testConnection } = require('./config/database');
const app = require('./app');

// ===========================
// INICIAR SERVIDOR
// ===========================

const PORT = config.server.port;

const startServer = async () => {
    try {
        const dbConnected = await testConnection();

        if (!dbConnected) {
            console.error('No se pudo conectar a la base de datos');
            process.exit(1);
        }

        // Sincronizar modelos (solo en desarrollo)
        if (config.server.env === 'development') {
            const { sequelize } = require('./config/database');
            require('./models');
            await sequelize.sync({ alter: false });
            console.log('Modelos sincronizados');
        }

        // Iniciar cron jobs (solo en produccion)
        if (config.server.env === 'production') {
            const { startAutoDeleteClients } = require('./cron/autoDeleteClients');
            startAutoDeleteClients();

            const { startWeeklyEvaluation } = require('./cron/weeklyEvaluation');
            startWeeklyEvaluation();
        }

        app.listen(PORT, () => {
            console.log('\n========================================');
            console.log(`   CURIEL API Server`);
            console.log(`   Entorno: ${config.server.env}`);
            console.log(`   Puerto: ${PORT}`);
            console.log(`   URL: http://localhost:${PORT}`);
            console.log('========================================\n');
        });
    } catch (error) {
        console.error('Error al iniciar el servidor:', error);
        process.exit(1);
    }
};

startServer();
