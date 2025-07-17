import jwt from 'jsonwebtoken';
import { AuthenticationError } from 'apollo-server-express';
import logger from './logger.js';
import { TokenExpiredError } from './errors.js';
import dotenv from 'dotenv';

// Ensure dotenv is loaded before accessing environment variables
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || '!Pa2z!re3^srbz6oWQ&3kAX579M^uq22';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET + '_refresh';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';


// Validate JWT_SECRET is available
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is required but not defined in environment variables');
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

// Password validation
export const validatePassword = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasNonalphas = /\W/.test(password);

  const errors = [];

  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long`);
  }

  if (!hasUpperCase) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!hasLowerCase) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!hasNumbers) {
    errors.push('Password must contain at least one number');
  }

  if (!hasNonalphas) {
    errors.push('Password must contain at least one special character');
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

export default {
  generateTokens,
  verifyToken,
  getUserFromRequest,
  refreshTokens,
  validatePassword,
  checkAuthRateLimit,
  clearAuthAttempts,
  sanitizeAuthInput
};