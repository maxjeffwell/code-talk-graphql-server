import jwt from 'jsonwebtoken';
import { AuthenticationError } from 'apollo-server-express';
import logger from './logger.js';
import { TokenExpiredError } from './errors.js';
import dotenv from 'dotenv';
import {
  checkAuthRateLimit as checkDistributedAuthRateLimit,
  clearAuthAttempts as clearDistributedAuthAttempts,
  isDistributedRateLimiting,
} from './rateLimiter.js';

// Ensure dotenv is loaded before accessing environment variables
dotenv.config();

// SECURITY: No fallback secrets - these MUST be set in environment
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// Validate JWT secrets are properly configured
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error(
    'JWT_SECRET environment variable is required and must be at least 32 characters long. ' +
    'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"'
  );
}

if (!JWT_REFRESH_SECRET || JWT_REFRESH_SECRET.length < 32) {
  throw new Error(
    'JWT_REFRESH_SECRET environment variable is required and must be at least 32 characters long. ' +
    'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"'
  );
}

// Token generation
export const generateTokens = async (user) => {
  const payload = {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role
  };

  const accessToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'code-talk-server',
    audience: 'code-talk-client'
  });

  const refreshToken = jwt.sign(
    { id: user.id, username: user.username },
    JWT_REFRESH_SECRET,
    {
      expiresIn: JWT_REFRESH_EXPIRES_IN,
      issuer: 'code-talk-server',
      audience: 'code-talk-client'
    }
  );

  return { accessToken, refreshToken };
};

// Token verification
export const verifyToken = (token, isRefresh = false) => {
  try {
    const secret = isRefresh ? JWT_REFRESH_SECRET : JWT_SECRET;
    return jwt.verify(token, secret, {
      issuer: 'code-talk-server',
      audience: 'code-talk-client'
    });
  } catch (error) {
    logger.error('Token verification failed', {
      error: error.message,
      isRefresh,
      tokenType: isRefresh ? 'refresh' : 'access'
    });

    if (error.name === 'TokenExpiredError') {
      throw new TokenExpiredError();
    }
    
    throw new AuthenticationError('Invalid token');
  }
};

// Extract user from request
export const getUserFromRequest = async (req) => {
  // Check for token in various locations
  let token = req.headers['x-token'] || 
              req.headers['authorization']?.replace('Bearer ', '') ||
              req.cookies?.token;

  if (!token) {
    return null;
  }

  try {
    const decoded = verifyToken(token);
    
    // Log successful authentication
    logger.info('User authenticated', {
      userId: decoded.id,
      username: decoded.username,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    return decoded;
  } catch (error) {
    // Log failed authentication attempt
    logger.warn('Authentication failed', {
      error: error.message,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      token: token.substring(0, 10) + '...' // Log partial token for debugging
    });

    throw error;
  }
};

// Refresh token validation
export const refreshTokens = async (refreshToken, models) => {
  try {
    const decoded = verifyToken(refreshToken, true);
    
    // Find user in database
    const user = await models.User.findByPk(decoded.id);
    if (!user) {
      throw new AuthenticationError('User not found');
    }

    // Generate new tokens
    const tokens = await generateTokens(user);
    
    logger.info('Tokens refreshed', {
      userId: user.id,
      username: user.username
    });

    return tokens;
  } catch (error) {
    logger.error('Token refresh failed', {
      error: error.message
    });
    throw error;
  }
};

// Password validation - matches User model requirements
export const validatePassword = (password) => {
  const minLength = 7;
  const maxLength = 42;
  const errors = [];

  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long`);
  }

  if (password.length > maxLength) {
    errors.push(`Password must be no more than ${maxLength} characters long`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// ============================================================================
// RATE LIMITING - Uses Upstash for distributed rate limiting
// Falls back to in-memory if Upstash is not configured
// ============================================================================

/**
 * Check authentication rate limit (5 attempts per 15 minutes)
 * Uses Upstash Redis for distributed rate limiting when available
 * @param {string} identifier - User identifier (email, IP, etc.)
 * @throws {AuthenticationError} If rate limit exceeded
 */
export const checkAuthRateLimit = async (identifier) => {
  const result = await checkDistributedAuthRateLimit(identifier);

  if (!result.success) {
    const now = Date.now();
    const timeLeftMs = result.reset - now;
    const timeLeftMinutes = Math.max(1, Math.ceil(timeLeftMs / 1000 / 60));

    throw new AuthenticationError(
      `Too many authentication attempts. Please try again in ${timeLeftMinutes} minutes.`
    );
  }

  logger.debug('Auth rate limit check passed', {
    identifier,
    remaining: result.remaining,
    distributed: isDistributedRateLimiting(),
  });
};

/**
 * Clear auth rate limit attempts (e.g., after successful login)
 * @param {string} identifier - User identifier
 */
export const clearAuthAttempts = async (identifier) => {
  await clearDistributedAuthAttempts(identifier);
};

// Input sanitization
export const sanitizeAuthInput = (input) => {
  if (typeof input !== 'string') return input;

  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, 255); // Limit length
};

// ============================================================================
// COOKIE-BASED AUTHENTICATION
// ============================================================================

// Parse duration string (e.g., '15m', '7d') to milliseconds
const parseDuration = (duration) => {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) return 15 * 60 * 1000; // Default 15 minutes

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return 15 * 60 * 1000;
  }
};

// Cookie configuration
const COOKIE_OPTIONS = {
  httpOnly: true, // SECURITY: Prevents JavaScript access (XSS protection)
  secure: process.env.NODE_ENV === 'production', // HTTPS only in production
  sameSite: 'strict', // SECURITY: Prevents CSRF attacks
  path: '/',
};

/**
 * Set authentication cookies on the response
 * @param {Response} res - Express response object
 * @param {Object} tokens - { accessToken, refreshToken }
 */
export const setAuthCookies = (res, tokens) => {
  if (!res || typeof res.cookie !== 'function') {
    logger.error('Cannot set cookies: invalid response object');
    return;
  }

  const accessMaxAge = parseDuration(JWT_EXPIRES_IN);
  const refreshMaxAge = parseDuration(JWT_REFRESH_EXPIRES_IN);

  // Set access token cookie
  res.cookie('token', tokens.accessToken, {
    ...COOKIE_OPTIONS,
    maxAge: accessMaxAge,
  });

  // Set refresh token cookie
  res.cookie('refreshToken', tokens.refreshToken, {
    ...COOKIE_OPTIONS,
    maxAge: refreshMaxAge,
  });

  logger.info('Auth cookies set', {
    accessTokenExpiry: `${accessMaxAge / 1000}s`,
    refreshTokenExpiry: `${refreshMaxAge / 1000}s`,
  });
};

/**
 * Clear authentication cookies (for logout)
 * @param {Response} res - Express response object
 */
export const clearAuthCookies = (res) => {
  if (!res || typeof res.clearCookie !== 'function') {
    logger.error('Cannot clear cookies: invalid response object');
    return;
  }

  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });

  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });

  logger.info('Auth cookies cleared');
};

export default {
  generateTokens,
  verifyToken,
  getUserFromRequest,
  refreshTokens,
  validatePassword,
  checkAuthRateLimit,
  clearAuthAttempts,
  sanitizeAuthInput,
  setAuthCookies,
  clearAuthCookies,
};