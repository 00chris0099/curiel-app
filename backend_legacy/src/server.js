require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const config = require('./config');
const { testConnection } = require('./config/database');
const routes = require('./routes');
const { errorHandler, notFound } = require('./middlewares/errorHandler');

const app = express();

// ===========================
// MIDDLEWARES GLOBALES
// ===========================

// Seguridad
app.use(helmet());

// CORS
app.use(cors({
    origin: config.server.corsOrigin,
    credentials: true
}));

// Parsing de body
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compresión
app.use(compression());

// Logging
if (config.server.env === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

// Rate limiting
const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,
    message: {
        success: false,
        message: 'Demasiadas solicitudes, intenta de nuevo más tarde'
    }
});
app.use('/api', limiter);

// ===========================
// RUTAS
// ===========================

// Swagger Documentation
const { specs, swaggerUi } = require('./config/swagger');
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(specs, {
    customSiteTitle: 'CURIEL API Docs',
    customCss: '.swagger-ui .topbar { display: none }'
}));

app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'CURIEL API - Sistema de Inspecciones Técnicas',
        version: '1.0.0',
        docs: '/api/docs',
        health: '/api/v1/health'
    });
});


app.use(`/api/${config.server.apiVersion}`, routes);

// ===========================
// MANEJO DE ERRORES
// ===========================

app.use(notFound);
app.use(errorHandler);

// ===========================
// INICIAR SERVIDOR
// ===========================

const PORT = config.server.port;

const startServer = async () => {
    try {
        // Probar conexión a la base de datos
        const dbConnected = await testConnection();

        if (!dbConnected) {
            console.error('❌ No se pudo conectar a la base de datos');
            process.exit(1);
        }

        // Sincronizar modelos (solo en desarrollo)
        if (config.server.env === 'development') {
            const { sequelize } = require('./config/database');
            // require models to register them
            require('./models');

            await sequelize.sync({ alter: false });
            console.log('✅ Modelos sincronizados');
        }

        // Iniciar servidor
        app.listen(PORT, () => {
            console.log('\n🚀 ========================================');
            console.log(`   CURIEL API Server`);
            console.log(`   Entorno: ${config.server.env}`);
            console.log(`   Puerto: ${PORT}`);
            console.log(`   URL: http://localhost:${PORT}`);
            console.log('========================================\n');
        });
    } catch (error) {
        console.error('❌ Error al iniciar el servidor:', error);
        process.exit(1);
    }
};

startServer();

module.exports = app;
