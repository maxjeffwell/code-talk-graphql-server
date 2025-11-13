import dotenv from 'dotenv';
import { validateEnvironment } from './security.js';

// Load environment variables
dotenv.config();

// Validate environment on startup
validateEnvironment();

// Server configuration
export const server = {
  port: parseInt(process.env.PORT, 10) || 8000,
  env: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
};

// Database configuration
export const database = {
  url: process.env.DATABASE_URL,
  testUrl: process.env.TEST_DATABASE_URL,
  options: {
    dialect: 'postgres',
    logging: server.isDevelopment ? console.log : false,
    dialectOptions: server.isProduction ? {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    } : {},
    pool: {
      max: parseInt(process.env.DB_POOL_MAX, 10) || 5,
      min: parseInt(process.env.DB_POOL_MIN, 10) || 0,
      acquire: parseInt(process.env.DB_POOL_ACQUIRE, 10) || 30000,
      idle: parseInt(process.env.DB_POOL_IDLE, 10) || 10000,
    },
    define: {
      timestamps: true,
      underscored: false,
    },
  },
};

// JWT configuration
export const jwt = {
  secret: process.env.JWT_SECRET,
  refreshSecret: process.env.JWT_REFRESH_SECRET || `${process.env.JWT_SECRET}_refresh`,
  expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  issuer: 'code-talk-server',
  audience: 'code-talk-client',
};

// Redis configuration
export const redis = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  password: process.env.REDIS_PASSWORD,
  user: process.env.REDIS_USER,
  db: parseInt(process.env.REDIS_DB, 10) || 0,
  keyPrefix: process.env.REDIS_KEY_PREFIX || 'code-talk:',
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
};

// GraphQL configuration
export const graphql = {
  playground: process.env.GRAPHQL_PLAYGROUND === 'true' || server.isDevelopment,
  introspection: process.env.GRAPHQL_INTROSPECTION === 'true' || server.isDevelopment,
  debug: server.isDevelopment,
  tracing: process.env.GRAPHQL_TRACING === 'true',
  maxDepth: parseInt(process.env.GRAPHQL_MAX_DEPTH, 10) || 10,
  maxComplexity: parseInt(process.env.GRAPHQL_MAX_COMPLEXITY, 10) || 1000,
};

// Logging configuration
export const logging = {
  level: process.env.LOG_LEVEL || (server.isDevelopment ? 'debug' : 'info'),
  dir: process.env.LOG_DIR || 'logs',
  maxSize: process.env.LOG_MAX_SIZE || '20m',
  maxFiles: process.env.LOG_MAX_FILES || '14d',
  format: process.env.LOG_FORMAT || 'json',
};

// Security configuration
export const security = {
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 10,
  corsOrigins: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
    : ['http://localhost:3000'],
  rateLimits: {
    general: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
      max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
    },
    auth: {
      windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
      max: parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) || 5,
    },
    graphql: {
      windowMs: parseInt(process.env.GRAPHQL_RATE_LIMIT_WINDOW_MS, 10) || 1 * 60 * 1000,
      max: parseInt(process.env.GRAPHQL_RATE_LIMIT_MAX, 10) || 60,
    },
  },
};

// Feature flags
export const features = {
  enableSubscriptions: process.env.ENABLE_SUBSCRIPTIONS !== 'false',
  enablePlayground: process.env.ENABLE_PLAYGROUND === 'true' || server.isDevelopment,
  enableIntrospection: process.env.ENABLE_INTROSPECTION === 'true' || server.isDevelopment,
  enableRooms: process.env.ENABLE_ROOMS === 'true',
  enableFileUploads: process.env.ENABLE_FILE_UPLOADS === 'true',
};

// Export all configurations
export default {
  server,
  database,
  jwt,
  redis,
  graphql,
  logging,
  security,
  features,
};