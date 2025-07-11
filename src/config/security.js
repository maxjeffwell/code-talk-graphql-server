import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import DOMPurify from 'isomorphic-dompurify';

// Rate limiting configurations for different endpoints
export const rateLimiters = {
  // General API rate limit
  general: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  }),

  // Stricter rate limit for authentication endpoints
  auth: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    message: 'Too many authentication attempts, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful requests
  }),

  // Rate limit for GraphQL endpoint
  graphql: rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 60, // limit each IP to 60 requests per minute
    message: 'Too many GraphQL requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  }),
};

// Enhanced helmet configuration
export const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Required for GraphQL Playground
      scriptSrc: ["'self'", "https:", "'unsafe-inline'"], // Required for GraphQL Playground
      imgSrc: ["'self'", "data:", "apollo-server-landing-page.cdn.apollographql.com"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'", "sandbox.embed.apollographql.com"], // For GraphQL Playground
      manifestSrc: ["'self'", "apollo-server-landing-page.cdn.apollographql.com"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for GraphQL Playground compatibility
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
});

// CORS configuration based on environment
export const getCorsConfig = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Parse allowed origins from environment variable
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
    : ['http://localhost:3000'];

  return {
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);
      
      if (isDevelopment) {
        // In development, allow all origins
        return callback(null, true);
      }
      
      // In production, check against allowed origins
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-Token',
      'X-Apollo-Tracing',
    ],
    exposedHeaders: [
      'X-Total-Count',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
    ],
    maxAge: 86400, // 24 hours
    optionsSuccessStatus: 200,
    preflightContinue: false,
  };
};

// Input sanitization middleware
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  // Use DOMPurify for HTML sanitization
  const cleaned = DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: [],
  });
  
  // Additional sanitization
  return cleaned
    .trim()
    .replace(/[<>]/g, '') // Remove any remaining angle brackets
    .substring(0, 1000); // Limit length to prevent DoS
};

// SQL injection prevention helper
export const sanitizeSQLInput = (input) => {
  if (typeof input !== 'string') return input;
  
  // Remove or escape potentially dangerous SQL characters
  return input
    .replace(/['";\\]/g, '') // Remove quotes, semicolons, and backslashes
    .replace(/--/g, '') // Remove SQL comment syntax
    .replace(/\/\*/g, '') // Remove SQL block comment start
    .replace(/\*\//g, '') // Remove SQL block comment end
    .trim();
};

// XSS prevention for output
export const sanitizeOutput = (data) => {
  if (typeof data === 'string') {
    return DOMPurify.sanitize(data);
  }
  
  if (Array.isArray(data)) {
    return data.map(sanitizeOutput);
  }
  
  if (data && typeof data === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeOutput(value);
    }
    return sanitized;
  }
  
  return data;
};

// Security headers middleware
export const securityHeaders = (req, res, next) => {
  // Additional security headers not covered by helmet
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // Remove sensitive headers
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');
  
  next();
};

// Environment variable validation
export const validateEnvironment = () => {
  const required = [
    'DATABASE_URL',
    'JWT_SECRET',
    'REDIS_HOST',
    'REDIS_PASSWORD',
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  // Validate JWT secret strength
  if (process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }
  
  // Warn about security in development
  if (process.env.NODE_ENV === 'development') {
    console.warn('⚠️  Running in development mode. Security features may be relaxed.');
  }
};

export default {
  rateLimiters,
  helmetConfig,
  getCorsConfig,
  sanitizeInput,
  sanitizeSQLInput,
  sanitizeOutput,
  securityHeaders,
  validateEnvironment,
};