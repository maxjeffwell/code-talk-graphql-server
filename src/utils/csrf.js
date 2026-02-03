/**
 * CSRF Protection using Double-Submit Cookie Pattern
 *
 * How it works:
 * 1. Server sets a CSRF token in a non-httpOnly cookie (readable by JS)
 * 2. Client reads the cookie and sends it back in a header (x-csrf-token)
 * 3. Server validates that cookie value matches header value
 *
 * Why this works:
 * - Attacker can't read cookies from another origin (same-origin policy)
 * - So attacker can't know what value to put in the header
 * - Combined with sameSite cookies, provides strong CSRF protection
 */

import crypto from 'crypto';
import logger from './logger.js';

const CSRF_COOKIE_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const TOKEN_LENGTH = 32;

// Generate a secure random token
const generateToken = () => {
  return crypto.randomBytes(TOKEN_LENGTH).toString('hex');
};

// Cookie options for the CSRF token
const getCookieOptions = () => ({
  httpOnly: false, // Must be false so client JS can read it
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/',
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
});

/**
 * Middleware to set CSRF token cookie if not present
 */
export const csrfCookieMiddleware = (req, res, next) => {
  // Only set on GET requests (when user first loads the app)
  if (req.method === 'GET' && !req.cookies[CSRF_COOKIE_NAME]) {
    const token = generateToken();
    res.cookie(CSRF_COOKIE_NAME, token, getCookieOptions());
    logger.debug('CSRF token cookie set');
  }
  next();
};

/**
 * Validate CSRF token for mutations
 * @param {Object} req - Express request object
 * @returns {{ valid: boolean, error?: string }}
 */
export const validateCsrfToken = (req) => {
  // Skip validation in test environment
  if (process.env.NODE_ENV === 'test') {
    return { valid: true };
  }

  // Skip validation in development if configured
  if (process.env.NODE_ENV === 'development' && process.env.CSRF_SKIP_VALIDATION === 'true') {
    return { valid: true };
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.headers?.[CSRF_HEADER_NAME];

  // Both must be present
  if (!cookieToken) {
    logger.warn('CSRF validation failed: no cookie token', {
      ip: req.ip,
      path: req.path,
    });
    return { valid: false, error: 'CSRF token cookie missing' };
  }

  if (!headerToken) {
    logger.warn('CSRF validation failed: no header token', {
      ip: req.ip,
      path: req.path,
    });
    return { valid: false, error: 'CSRF token header missing' };
  }

  // Tokens must match (constant-time comparison to prevent timing attacks)
  if (!crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken))) {
    logger.warn('CSRF validation failed: token mismatch', {
      ip: req.ip,
      path: req.path,
    });
    return { valid: false, error: 'CSRF token invalid' };
  }

  return { valid: true };
};

/**
 * GraphQL context helper to check CSRF for mutations
 * Call this in resolvers that perform mutations
 */
export const requireCsrfToken = (context) => {
  const { req } = context;
  if (!req) return; // WebSocket connections don't need CSRF (no cookies auto-sent)

  const result = validateCsrfToken(req);
  if (!result.valid) {
    throw new Error(result.error);
  }
};

/**
 * Express middleware to validate CSRF on all POST requests
 * Useful for non-GraphQL endpoints
 */
export const csrfValidationMiddleware = (req, res, next) => {
  // Only validate POST, PUT, PATCH, DELETE
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const result = validateCsrfToken(req);
    if (!result.valid) {
      return res.status(403).json({ error: result.error });
    }
  }
  next();
};

export default {
  csrfCookieMiddleware,
  validateCsrfToken,
  requireCsrfToken,
  csrfValidationMiddleware,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
};
