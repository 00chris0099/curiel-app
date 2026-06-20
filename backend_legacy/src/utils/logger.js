const winston = require('winston');
const config = require('../config');

const { combine, timestamp, printf, colorize, json, errors } = winston.format;

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

const COLORS = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'cyan'
};

winston.addColors(COLORS);

const devFormat = combine(
  errors({ stack: true }),
  colorize({ all: true }),
  timestamp({ format: 'HH:mm:ss' }),
  printf(({ level, message, timestamp, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    const stackStr = stack ? `\n${stack}` : '';
    return `${timestamp} ${level}: ${message}${metaStr}${stackStr}`;
  })
);

const prodFormat = combine(
  errors({ stack: true }),
  timestamp(),
  json()
);

const logger = winston.createLogger({
  levels: LOG_LEVELS,
  level: config.server.env === 'production' ? 'info' : 'debug',
  format: config.server.env === 'production' ? prodFormat : devFormat,
  defaultMeta: { service: 'curiel-api', env: config.server.env },
  transports: [
    new winston.transports.Console()
  ]
});

if (config.server.env === 'production') {
  logger.add(new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    maxsize: 5242880,
    maxFiles: 5
  }));

  logger.add(new winston.transports.File({
    filename: 'logs/combined.log',
    maxsize: 10485760,
    maxFiles: 10
  }));
}

logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  }
};

module.exports = logger;
