/**
 * Input Validation using Joi
 *
 * Provides schema validation for all GraphQL inputs
 * to prevent malicious or malformed data from reaching resolvers.
 */

import Joi from 'joi';
import { UserInputError } from 'apollo-server-express';
import logger from './logger.js';

// ============================================
// Common Schemas
// ============================================

const idSchema = Joi.number().integer().positive().required();
const optionalIdSchema = Joi.number().integer().positive().allow(null);

// ============================================
// User Schemas
// ============================================

export const signUpSchema = Joi.object({
  username: Joi.string()
    .alphanum()
    .min(3)
    .max(30)
    .required()
    .messages({
      'string.alphanum': 'Username must only contain letters and numbers',
      'string.min': 'Username must be at least 3 characters',
      'string.max': 'Username must be at most 30 characters',
    }),
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
    }),
  password: Joi.string()
    .min(8)
    .max(128)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters',
      'string.max': 'Password must be at most 128 characters',
    }),
});

export const signInSchema = Joi.object({
  login: Joi.string()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Login is required',
      'string.max': 'Login must be at most 100 characters',
    }),
  password: Joi.string()
    .min(1)
    .max(128)
    .required()
    .messages({
      'string.empty': 'Password is required',
    }),
});

// ============================================
// Message Schemas
// ============================================

export const createMessageSchema = Joi.object({
  text: Joi.string()
    .min(1)
    .max(5000)
    .required()
    .messages({
      'string.empty': 'Message cannot be empty',
      'string.max': 'Message must be at most 5000 characters',
    }),
  roomId: optionalIdSchema,
});

export const deleteMessageSchema = Joi.object({
  id: idSchema.messages({
    'number.base': 'Invalid message ID',
    'number.positive': 'Invalid message ID',
  }),
});

// ============================================
// Room Schemas
// ============================================

export const createRoomSchema = Joi.object({
  title: Joi.string()
    .min(1)
    .max(100)
    .required()
    .trim()
    .messages({
      'string.empty': 'Room title is required',
      'string.max': 'Room title must be at most 100 characters',
    }),
});

export const roomIdSchema = Joi.object({
  id: idSchema.messages({
    'number.base': 'Invalid room ID',
    'number.positive': 'Invalid room ID',
  }),
});

export const joinLeaveRoomSchema = Joi.object({
  roomId: idSchema.messages({
    'number.base': 'Invalid room ID',
    'number.positive': 'Invalid room ID',
  }),
});

// ============================================
// AI Schemas
// ============================================

const chatMessageSchema = Joi.object({
  role: Joi.string().valid('user', 'assistant', 'system').required(),
  content: Joi.string().min(1).max(50000).required(),
});

export const sendAIMessageSchema = Joi.object({
  content: Joi.string()
    .min(1)
    .max(10000)
    .required()
    .messages({
      'string.empty': 'Message content is required',
      'string.max': 'Message must be at most 10000 characters',
    }),
  conversationHistory: Joi.array()
    .items(chatMessageSchema)
    .max(50)
    .default([])
    .messages({
      'array.max': 'Conversation history must be at most 50 messages',
    }),
});

export const explainCodeSchema = Joi.object({
  code: Joi.string()
    .min(1)
    .max(50000)
    .required()
    .messages({
      'string.empty': 'Code is required',
      'string.max': 'Code must be at most 50000 characters',
    }),
  language: Joi.string()
    .max(50)
    .default('unknown'),
});

export const generateDocumentationSchema = Joi.object({
  code: Joi.string()
    .min(1)
    .max(50000)
    .required()
    .messages({
      'string.empty': 'Code is required',
      'string.max': 'Code must be at most 50000 characters',
    }),
  language: Joi.string()
    .max(50)
    .required(),
  style: Joi.string()
    .valid('jsdoc', 'docstring', 'javadoc', 'markdown')
    .default('jsdoc'),
});

export const generateCodeQuizSchema = Joi.object({
  topic: Joi.string()
    .min(1)
    .max(200)
    .required()
    .messages({
      'string.empty': 'Topic is required',
      'string.max': 'Topic must be at most 200 characters',
    }),
  difficulty: Joi.string()
    .valid('easy', 'medium', 'hard')
    .default('medium'),
  count: Joi.number()
    .integer()
    .min(1)
    .max(10)
    .default(3),
});

// ============================================
// Validation Helper
// ============================================

/**
 * Validate input against a Joi schema
 * @param {object} schema - Joi schema to validate against
 * @param {object} input - Input data to validate
 * @param {string} operationName - Name of the operation for logging
 * @returns {object} Validated and sanitized input
 * @throws {UserInputError} If validation fails
 */
export const validate = (schema, input, operationName = 'operation') => {
  const { error, value } = schema.validate(input, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
    }));

    logger.warn('Input validation failed', {
      operation: operationName,
      errors,
    });

    throw new UserInputError('Validation failed', {
      validationErrors: errors,
    });
  }

  return value;
};

/**
 * Create a validation wrapper for resolvers
 * @param {object} schema - Joi schema to validate against
 * @returns {Function} Resolver middleware function
 */
export const withValidation = (schema) => {
  return (resolver) => {
    return async (parent, args, context, info) => {
      const validatedArgs = validate(schema, args, info.fieldName);
      return resolver(parent, validatedArgs, context, info);
    };
  };
};

export default {
  // Schemas
  signUpSchema,
  signInSchema,
  createMessageSchema,
  deleteMessageSchema,
  createRoomSchema,
  roomIdSchema,
  joinLeaveRoomSchema,
  sendAIMessageSchema,
  explainCodeSchema,
  generateDocumentationSchema,
  generateCodeQuizSchema,
  // Helpers
  validate,
  withValidation,
};
