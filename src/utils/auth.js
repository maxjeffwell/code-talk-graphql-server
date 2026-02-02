import jwt from 'jsonwebtoken';
import { AuthenticationError } from 'apollo-server-express';
import logger from './logger.js';
import { TokenExpiredError } from './errors.js';
import dotenv from 'dotenv';

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

// Rate limiting for authentication attempts
const authAttempts = new Map();

export const checkAuthRateLimit = (identifier) => {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 5;

  if (!authAttempts.has(identifier)) {
    authAttempts.set(identifier, []);
  }

  const attempts = authAttempts.get(identifier);
  
  // Remove old attempts
  const validAttempts = attempts.filter(timestamp => now - timestamp < windowMs);
  authAttempts.set(identifier, validAttempts);

  if (validAttempts.length >= maxAttempts) {
    const oldestAttempt = Math.min(...validAttempts);
    const timeLeft = windowMs - (now - oldestAttempt);
    
    logger.warn('Authentication rate limit exceeded', {
      identifier,
      attempts: validAttempts.length,
      timeLeft: Math.ceil(timeLeft / 1000 / 60) // minutes
    });

    throw new AuthenticationError(
      `Too many authentication attempts. Please try again in ${Math.ceil(timeLeft / 1000 / 60)} minutes.`
    );
  }

  // Record this attempt
  validAttempts.push(now);
  authAttempts.set(identifier, validAttempts);
};

// Clear auth attempts on successful login
export const clearAuthAttempts = (identifier) => {
  authAttempts.delete(identifier);
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