require('dotenv').config();
const config = require('./config');
const { initSentry } = require('./utils/sentry');
const { connectAll, disconnectAll } = require('./lib/databases');
const { initRedis, closeRedis } = require('./utils/cache');
const app = require('./app');
const logger = require('./utils/logger');

initSentry();

const PORT = config.server.port;

const startServer = async () => {
    try {
        await connectAll();
        logger.info('Todas las bases de datos conectadas exitosamente');

        initRedis();

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

const gracefulShutdown = async (signal) => {
    logger.info(`${signal} received, shutting down gracefully`);
    await disconnectAll();
    await closeRedis();
    process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer();
