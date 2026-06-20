require('dotenv').config();
const config = require('./config');
const { initSentry } = require('./utils/sentry');
const { testConnection } = require('./config/database');
const app = require('./app');
const logger = require('./utils/logger');

initSentry();

const PORT = config.server.port;

const startServer = async () => {
    try {
        const dbConnected = await testConnection();

        if (!dbConnected) {
            logger.error('No se pudo conectar a la base de datos');
            process.exit(1);
        }

        if (config.server.env === 'development') {
            const { sequelize } = require('./config/database');
            require('./models');
            await sequelize.sync({ alter: false });
            logger.info('Modelos sincronizados');
        }

        if (config.server.env === 'production') {
            const { startAutoDeleteClients } = require('./cron/autoDeleteClients');
            startAutoDeleteClients();

            const { startWeeklyEvaluation } = require('./cron/weeklyEvaluation');
            startWeeklyEvaluation();
        }

        app.listen(PORT, () => {
            logger.info(`CURIEL API Server iniciado`, {
                env: config.server.env,
                port: PORT,
                url: `http://localhost:${PORT}`
            });
        });
    } catch (error) {
        logger.error('Error al iniciar el servidor', { error: error.message, stack: error.stack });
        process.exit(1);
    }
};

startServer();
