require('dotenv').config();

const DEFAULT_CORS_ORIGINS = [
  'http://localhost:19006',
  'http://localhost:5173',
  'http://localhost:3000'
];

const parseBoolean = (value, defaultValue = false) => {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  return ['true', '1', 'yes', 'on'].includes(String(value).toLowerCase());
};

const parseOrigins = (...values) => {
  const origins = values
    .flatMap((value) => String(value || '').split(','))
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (!origins.length) {
    return DEFAULT_CORS_ORIGINS;
  }

  return [...new Set(origins)];
};

module.exports = {
  // Servidor
  server: {
    port: process.env.PORT || 4000,
    env: process.env.NODE_ENV || 'development',
    apiVersion: process.env.API_VERSION || 'v1',
    corsOrigin: parseOrigins(process.env.CORS_ORIGIN, process.env.FRONTEND_URL)
  },

  // Base de datos
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    name: process.env.DB_NAME || 'db_inspecciones',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres123',
    dialect: process.env.DB_DIALECT || 'postgres',
    url: process.env.DATABASE_URL || null,
    ssl: parseBoolean(process.env.DATABASE_SSL, false),
    pool: {
      max: parseInt(process.env.DB_POOL_MAX) || 10,
      min: parseInt(process.env.DB_POOL_MIN) || 2,
      acquire: parseInt(process.env.DB_POOL_ACQUIRE) || 30000,
      idle: parseInt(process.env.DB_POOL_IDLE) || 10000,
      evict: parseInt(process.env.DB_POOL_EVICT) || 30000
    },
    logging: process.env.NODE_ENV === 'development' ? console.log : false
  },

  // JWT
  jwt: {
    secret: (() => {
      if (!process.env.JWT_SECRET) {
        if (process.env.NODE_ENV === 'production') {
          throw new Error('JWT_SECRET is required in production. Set it in your environment variables.');
        }
        console.warn('JWT_SECRET not set. Using insecure default for development only.');
        return 'dev-only-insecure-secret-do-not-use-in-production';
      }
      return process.env.JWT_SECRET;
    })(),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d'
  },

  // Cloudinary
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET
  },

  // Email
  email: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    },
    from: {
      email: process.env.FROM_EMAIL || 'noreply@curiel.com',
      name: process.env.FROM_NAME || 'CURIEL Inspecciones'
    }
  },

  // n8n Webhooks
  n8n: {
    inspectionCompleted: process.env.N8N_WEBHOOK_INSPECTION_COMPLETED,
    userNotification: process.env.N8N_WEBHOOK_USER_NOTIFICATION,
    auditLog: process.env.N8N_WEBHOOK_AUDIT_LOG,
    evaluationNotification: process.env.N8N_WEBHOOK_EVALUATION_NOTIFICATION,
    secretToken: process.env.N8N_SECRET_TOKEN
  },

  // Upload
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760, // 10MB
    allowedTypes: process.env.ALLOWED_FILE_TYPES?.split(',') || [
      'image/jpeg',
      'image/png',
      'image/jpg'
    ]
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 min
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 200
  },

  // PDF
  pdf: {
    companyLogo: process.env.COMPANY_LOGO_URL,
    storagePath: process.env.PDF_STORAGE_PATH || './storage/reports',
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null,
    footerPhone: process.env.COMPANY_PHONE || '+51 999 999 999',
    footerEmail: process.env.COMPANY_EMAIL || 'informes@curiel.pe',
    companyTagline: process.env.COMPANY_TAGLINE || 'Tu hogar, nuestro compromiso'
  },

  // Redis Cache
  redis: {
    url: process.env.REDIS_URL || null
  },

  // URLs
  urls: {
    frontend: process.env.FRONTEND_URL || 'http://localhost:3000',
    backend: process.env.BACKEND_URL || 'http://localhost:4000'
  }
};
