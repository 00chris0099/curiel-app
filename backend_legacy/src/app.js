require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');

const config = require('./config');
const routes = require('./routes');
const { errorHandler, notFound } = require('./middlewares/errorHandler');
const logger = require('./utils/logger');
const { sentryErrorHandler } = require('./utils/sentry');
const { httpRequestDuration, httpRequestTotal } = require('./utils/metrics');
const requestId = require('./middlewares/requestId');

const app = express();

app.set('trust proxy', 1);

// Seguridad
app.use(helmet());

// Request ID — genera UUID unico por request para tracing
app.use(requestId);

// CORS
app.use(cors({
    origin: config.server.corsOrigin,
    credentials: true
}));

// Parsing de body
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compresion
app.use(compression());

// Logging
if (config.server.env === 'development') {
    app.use(morgan(':method :url :status :res[content-length] - :response-time ms [:requestId]', {
        morgan: (req, _res, next) => { next(); }
    }));
} else if (config.server.env !== 'test') {
    app.use(morgan(':method :url :status :res[content-length] - :response-time ms [:requestId]', {
        stream: logger.stream,
        morgan: (req, _res, next) => { next(); }
    }));
}

// Rate limiting — por usuario (ID decodificado) o por IP como fallback
const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,
    keyGenerator: (req) => {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                const payload = jwt.decode(authHeader.slice(7));
                if (payload && payload.id) return `user:${payload.id}`;
            } catch {
                // fall through to IP
            }
        }
        return req.ip;
    },
    message: {
        success: false,
        message: 'Demasiadas solicitudes, intenta de nuevo mas tarde'
    }
});
app.use('/api', limiter);

// Metrics middleware
app.use((req, res, next) => {
    if (req.path === '/api/v1/metrics') return next();
    const start = Date.now();
    res.on('finish', () => {
        const duration = (Date.now() - start) / 1000;
        const route = req.route?.path || req.path;
        httpRequestDuration.observe({ method: req.method, route, status_code: res.statusCode }, duration);
        httpRequestTotal.inc({ method: req.method, route, status_code: res.statusCode });
    });
    next();
});

// Swagger Documentation
const { specs, swaggerUi } = require('./config/swagger');
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(specs, {
    customSiteTitle: 'CURIEL API Docs',
    customCss: '.swagger-ui .topbar { display: none }'
}));

app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'CURIEL API - Sistema de Inspecciones Tecnicas',
        version: '1.0.0',
        docs: '/api/docs',
        health: '/api/v1/health'
    });
});

app.use(`/api/${config.server.apiVersion}`, routes);

// Manejo de errores
app.use(notFound);
app.use(sentryErrorHandler());
app.use(errorHandler);

module.exports = app;
