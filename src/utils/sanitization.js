import DOMPurify from 'isomorphic-dompurify';
import logger from './logger.js';

// Configuration for different sanitization contexts
const SANITIZATION_CONFIGS = {
  // Strict mode - no HTML allowed
  strict: {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  },
  
  // Message mode - allows basic formatting
  message: {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'code', 'pre', 'br'],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  },
  
  // Rich text mode - allows more formatting
  richText: {
    ALLOWED_TAGS: [
      'b', 'i', 'em', 'strong', 'u', 's', 'code', 'pre', 'br', 'p',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'ul', 'ol', 'li',
      'a', 'img'
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'target'],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    KEEP_CONTENT: true,
  },
};

// Sanitize user input based on context
export const sanitizeUserInput = (input, context = 'strict') => {
  if (!input) return input;
  if (typeof input !== 'string') return input;
  
  try {
    const config = SANITIZATION_CONFIGS[context] || SANITIZATION_CONFIGS.strict;
    
    // First pass: DOMPurify sanitization
    let sanitized = DOMPurify.sanitize(input, config);
    
    // Second pass: Additional sanitization
    sanitized = sanitized
      .trim()
      .replace(/\0/g, '') // Remove null bytes
      .substring(0, context === 'message' ? 5000 : 10000); // Limit length
    
    // Log if content was modified
    if (sanitized !== input) {
      logger.warn('Content was sanitized', {
        context,
        originalLength: input.length,
        sanitizedLength: sanitized.length,
        removed: input.length - sanitized.length,
      });
    }
    
    return sanitized;
  } catch (error) {
    logger.error('Sanitization error', {
      error: error.message,
      context,
      inputLength: input.length,
    });
    // Return empty string on error to be safe
    return '';
  }
};

// Sanitize GraphQL arguments
export const sanitizeGraphQLArgs = (args) => {
  if (!args || typeof args !== 'object') return args;
  
  const sanitized = {};
  
  for (const [key, value] of Object.entries(args)) {
    if (typeof value === 'string') {
      // Apply strict sanitization to all string arguments
      sanitized[key] = sanitizeUserInput(value, 'strict');
    } else if (Array.isArray(value)) {
      // Recursively sanitize arrays
      sanitized[key] = value.map(item => 
        typeof item === 'string' ? sanitizeUserInput(item, 'strict') : item
      );
    } else if (value && typeof value === 'object') {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeGraphQLArgs(value);
    } else {
      // Keep non-string values as-is
      sanitized[key] = value;
    }
  }
  
  return sanitized;
};

// Sanitize message content
export const sanitizeMessage = (text) => {
  return sanitizeUserInput(text, 'message');
};

// Sanitize username
export const sanitizeUsername = (username) => {
  if (!username || typeof username !== 'string') return '';
  
  // Remove any non-alphanumeric characters except underscores and hyphens
  return username
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .substring(0, 25); // Enforce max length
};

// Sanitize email
export const sanitizeEmail = (email) => {
  if (!email || typeof email !== 'string') return '';
  
  // Basic email sanitization
  return email
    .trim()
    .toLowerCase()
    .substring(0, 255); // Enforce max length
};

// Sanitize search queries
export const sanitizeSearchQuery = (query) => {
  if (!query || typeof query !== 'string') return '';
  
  // Remove special characters that could break search
  return query
    .trim()
    .replace(/[^\w\s-]/g, '') // Keep only alphanumeric, spaces, and hyphens
    .replace(/\s+/g, ' ') // Normalize whitespace
    .substring(0, 100); // Limit length
};

// Sanitize file paths (if file uploads are implemented)
export const sanitizeFilePath = (path) => {
  if (!path || typeof path !== 'string') return '';
  
  // Remove any path traversal attempts
  return path
    .replace(/\.\./g, '')
    .replace(/[\/\\]/g, '_')
    .substring(0, 255);
};

// Batch sanitization for arrays
export const sanitizeArray = (array, sanitizer = sanitizeUserInput, context = 'strict') => {
  if (!Array.isArray(array)) return [];
  
  return array.map(item => 
    typeof item === 'string' ? sanitizer(item, context) : item
  );
};

// Sanitization middleware for GraphQL context
export const createSanitizationMiddleware = () => {
  return async (resolve, parent, args, context, info) => {
    // Skip sanitization for introspection queries
    if (info.fieldName.startsWith('__')) {
      return resolve(parent, args, context, info);
    }
    
    // Sanitize arguments
    const sanitizedArgs = sanitizeGraphQLArgs(args);
    
    // Call the resolver with sanitized arguments
    const result = await resolve(parent, sanitizedArgs, context, info);
    
    // Optionally sanitize the output (be careful with this)
    // This is usually not needed if data is sanitized on input
    return result;
  };
};

// Export all sanitization functions
export default {
  sanitizeUserInput,
  sanitizeGraphQLArgs,
  sanitizeMessage,
  sanitizeUsername,
  sanitizeEmail,
  sanitizeSearchQuery,
  sanitizeFilePath,
  sanitizeArray,
  createSanitizationMiddleware,
};