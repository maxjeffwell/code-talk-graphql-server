/**
 * UserService - Business logic for user operations
 *
 * Handles all user-related business logic including:
 * - User registration with password hashing
 * - User authentication
 * - User queries
 * - Token management
 */

import { AuthenticationError, UserInputError } from 'apollo-server-express';
import {
  generateTokens,
  checkAuthRateLimit,
  clearAuthAttempts,
  setAuthCookies,
  clearAuthCookies,
} from '../utils/auth.js';
import logger from '../utils/logger.js';

/**
 * Create a new user (sign up)
 * @param {Object} models - Sequelize models
 * @param {Object} params - User parameters
 * @param {string} params.username - Username
 * @param {string} params.email - Email address
 * @param {string} params.password - Plain text password
 * @returns {Promise<Object>} Object with user and tokens
 */
export const createUser = async (models, { username, email, password }) => {
  // User model handles password hashing via beforeCreate hook
  const user = await models.User.create({
    username,
    email,
    password,
  });

  // Generate authentication tokens
  const tokens = await generateTokens(user);

  logger.info('User created', {
    userId: user.id,
    username: user.username,
    email: user.email,
  });

  return { user, tokens };
};

/**
 * Authenticate a user (sign in)
 * @param {Object} models - Sequelize models
 * @param {Object} params - Login parameters
 * @param {string} params.login - Username or email
 * @param {string} params.password - Plain text password
 * @returns {Promise<Object>} Object with user and tokens
 * @throws {AuthenticationError} If credentials are invalid
 */
export const authenticateUser = async (models, { login, password }) => {
  // Check rate limit before authentication attempt
  await checkAuthRateLimit(login);

  // Find user by username or email
  const user = await models.User.findByLogin(login);

  if (!user) {
    logger.warn('Login failed: user not found', { login });
    throw new AuthenticationError('Invalid credentials');
  }

  // Validate password
  const isValid = await user.validatePassword(password);

  if (!isValid) {
    logger.warn('Login failed: invalid password', {
      login,
      userId: user.id,
    });
    throw new AuthenticationError('Invalid credentials');
  }

  // Clear rate limit on successful login
  await clearAuthAttempts(login);

  // Generate authentication tokens
  const tokens = await generateTokens(user);

  logger.info('User authenticated', {
    userId: user.id,
    username: user.username,
  });

  return { user, tokens };
};

/**
 * Set authentication cookies on response
 * @param {Object} res - Express response object
 * @param {Object} tokens - Token object with accessToken and refreshToken
 */
export const setUserAuthCookies = (res, tokens) => {
  setAuthCookies(res, tokens);
};

/**
 * Clear authentication cookies (sign out)
 * @param {Object} res - Express response object
 */
export const clearUserAuthCookies = (res) => {
  clearAuthCookies(res);
  logger.info('User signed out');
};

/**
 * Get user by ID
 * @param {Object} models - Sequelize models
 * @param {number} id - User ID
 * @returns {Promise<Object|null>} User or null if not found
 */
export const getUserById = async (models, id) => {
  return models.User.findByPk(id);
};

/**
 * Get all users
 * @param {Object} models - Sequelize models
 * @returns {Promise<Array>} Array of users
 */
export const getAllUsers = async (models) => {
  return models.User.findAll();
};

/**
 * Find user by login (username or email)
 * @param {Object} models - Sequelize models
 * @param {string} login - Username or email
 * @returns {Promise<Object|null>} User or null if not found
 */
export const findUserByLogin = async (models, login) => {
  return models.User.findByLogin(login);
};

/**
 * Update a user
 * @param {Object} models - Sequelize models
 * @param {number} id - User ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated user
 * @throws {UserInputError} If user not found
 */
export const updateUser = async (models, id, updates) => {
  const user = await models.User.findByPk(id);

  if (!user) {
    throw new UserInputError('User not found');
  }

  const updatedUser = await user.update(updates);

  logger.info('User updated', {
    userId: id,
    updatedFields: Object.keys(updates),
  });

  return updatedUser;
};

/**
 * Delete a user
 * @param {Object} models - Sequelize models
 * @param {number} id - User ID
 * @returns {Promise<boolean>} True on success
 * @throws {UserInputError} If user not found
 */
export const deleteUser = async (models, id) => {
  const user = await models.User.findByPk(id);

  if (!user) {
    throw new UserInputError('User not found');
  }

  await models.User.destroy({ where: { id } });

  logger.info('User deleted', { userId: id });

  return true;
};

/**
 * Get messages for a user
 * @param {Object} user - User instance
 * @returns {Promise<Array>} Array of messages
 */
export const getUserMessages = async (user) => {
  return user.getMessages();
};

export default {
  createUser,
  authenticateUser,
  setUserAuthCookies,
  clearUserAuthCookies,
  getUserById,
  getAllUsers,
  findUserByLogin,
  updateUser,
  deleteUser,
  getUserMessages,
};
