const Sentry = require('@sentry/node');
const config = require('../config');
const logger = require('./logger');

const initSentry = () => {
    if (!process.env.SENTRY_DSN) {
        logger.info('Sentry no configurado (SENTRY_DSN faltante). Error tracking deshabilitado.');
        return;
    }

    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: config.server.env,
        release: process.env.npm_package_version || '1.0.0',
        tracesSampleRate: config.server.env === 'production' ? 0.2 : 1.0,
        profilesSampleRate: config.server.env === 'production' ? 0.1 : 0,
        integrations: [
            Sentry.httpIntegration(),
            Sentry.expressIntegration(),
            Sentry.consoleIntegration(),
        ],
        beforeSend(event) {
            if (config.server.env === 'test') {
                return null;
            }
            if (event.request?.headers?.authorization) {
                event.request.headers.authorization = '[Filtered]';
            }
            return event;
        }
    });

    logger.info('Sentry inicializado', { environment: config.server.env });
};

const sentryErrorHandler = () => {
    if (process.env.SENTRY_DSN) {
        return Sentry.Handlers.errorHandler();
    }
    return (err, req, res, next) => next(err);
};

const captureException = (error, context = {}) => {
    if (process.env.SENTRY_DSN) {
        Sentry.withScope((scope) => {
            Object.entries(context).forEach(([key, value]) => {
                scope.setExtra(key, value);
            });
            Sentry.captureException(error);
        });
    }
};

const captureMessage = (message, level = 'info', context = {}) => {
    if (process.env.SENTRY_DSN) {
        Sentry.withScope((scope) => {
            scope.setLevel(level);
            Object.entries(context).forEach(([key, value]) => {
                scope.setExtra(key, value);
            });
            Sentry.captureMessage(message);
        });
    }
};

module.exports = {
    initSentry,
    sentryErrorHandler,
    captureException,
    captureMessage,
    Sentry
};
