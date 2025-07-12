import { 
  AuthenticationError, 
  ForbiddenError, 
  UserInputError,
  ApolloError 
} from 'apollo-server-express';
import logger from './logger.js';

// Custom error classes
export class ValidationError extends UserInputError {
  constructor(message, field = null) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

export class DatabaseError extends ApolloError {
  constructor(message, code = 'DATABASE_ERROR') {
    super(message, code);
    this.name = 'DatabaseError';
  }
}

export class RateLimitError extends ApolloError {
  constructor(message = 'Rate limit exceeded') {
    super(message, 'RATE_LIMIT_EXCEEDED');
    this.name = 'RateLimitError';
  }
}

export class TokenExpiredError extends AuthenticationError {
  constructor(message = 'Token has expired') {
    super(message);
    this.name = 'TokenExpiredError';
  }
}

// Error codes mapping
export const ERROR_CODES = {
  AUTHENTICATION_REQUIRED: 'Authentication required',
  FORBIDDEN: 'Access forbidden',
  VALIDATION_ERROR: 'Validation error',
  DATABASE_ERROR: 'Database error',
  RATE_LIMIT_EXCEEDED: 'Rate limit exceeded',
  TOKEN_EXPIRED: 'Token has expired',
  INTERNAL_ERROR: 'Internal server error'
};

// Enhanced error formatter for Apollo Server
export const formatError = (error) => {
  // Log the error
  logger.error('GraphQL Error', {
    message: error.message,
    code: error.extensions?.code,
    path: error.path,
    stack: error.stack,
    locations: error.locations
  });

  // Remove sensitive information from error messages
  const sanitizedMessage = error.message
    .replace('SequelizeValidationError: ', '')
    .replace('Validation error: ', '')
    .replace(/GraphQL error: /g, '');

  // Format validation errors
  if (error.originalError?.name === 'SequelizeValidationError') {
    const validationErrors = error.originalError.errors.map(err => ({
      field: err.path,
      message: err.message
    }));
    
    return {
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      validationErrors,
      path: error.path,
      locations: error.locations
    };
  }

  // Handle database connection errors
  if (error.originalError?.name === 'SequelizeConnectionError') {
    return {
      message: 'Database connection failed',
      code: 'DATABASE_ERROR',
      path: error.path,
      locations: error.locations
    };
  }

  // Handle authentication errors
  if (error.originalError instanceof AuthenticationError) {
    return {
      message: error.message,
      code: 'AUTHENTICATION_REQUIRED',
      path: error.path,
      locations: error.locations
    };
  }

  // Handle authorization errors
  if (error.originalError instanceof ForbiddenError) {
    return {
      message: error.message,
      code: 'FORBIDDEN',
      path: error.path,
      locations: error.locations
    };
  }

  // Handle rate limit errors
  if (error.originalError instanceof RateLimitError) {
    return {
      message: error.message,
      code: 'RATE_LIMIT_EXCEEDED',
      path: error.path,
      locations: error.locations
    };
  }

  // Default error response
  return {
    message: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : sanitizedMessage,
    code: error.extensions?.code || 'INTERNAL_ERROR',
    path: error.path,
    locations: error.locations,
    ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
  };
};

// Error handling middleware for Express
export const errorHandler = (err, req, res, next) => {
  logger.error('Express Error', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: err.message,
      details: err.errors
    });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid token'
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      error: 'Invalid ID',
      message: 'Invalid resource ID'
    });
  }

  // Default error response
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal Server Error' 
      : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
};

// Async error wrapper
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Database error handler
export const handleDatabaseError = (error, operation) => {
  logger.error('Database Error', {
    operation,
    error: error.message,
    stack: error.stack
  });

  switch (error.name) {
    case 'SequelizeValidationError':
      const validationMessages = error.errors.map(e => e.message).join(', ');
      throw new ValidationError(validationMessages || 'Validation failed');
    case 'SequelizeUniqueConstraintError':
      const field = error.errors[0]?.path || 'field';
      throw new ValidationError(`The ${field} is already taken. Please choose a different one.`);
    case 'SequelizeForeignKeyConstraintError':
      throw new ValidationError('Invalid reference');
    case 'SequelizeConnectionError':
      throw new DatabaseError('Database connection failed');
    default:
      throw new DatabaseError('Database operation failed');
  }
};

export default {
  formatError,
  errorHandler,
  asyncHandler,
  handleDatabaseError,
  ValidationError,
  DatabaseError,
  RateLimitError,
  TokenExpiredError
};