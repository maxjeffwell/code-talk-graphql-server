import { combineResolvers } from 'graphql-resolvers';

import { AuthenticationError, UserInputError } from 'apollo-server-express';
import { isAdmin, isAuthenticated } from './authorization';
import { 
  generateTokens, 
  validatePassword, 
  checkAuthRateLimit, 
  clearAuthAttempts, 
  sanitizeAuthInput 
} from '../utils/auth.js';
import { handleDatabaseError } from '../utils/errors.js';
import logger from '../utils/logger.js';


// Legacy function - now using improved auth utils
const createToken = async (user, secret, expiresIn) => {
  const tokens = await generateTokens(user);
  return tokens.accessToken;
};

export default {
  Query: {
    users: combineResolvers(
      isAuthenticated,
      async (parent, args, { models }) => {
        return await models.User.findAll();
      }
    ),
    user: combineResolvers(
      isAuthenticated,
      async (parent, { id }, { models }) => {
        return await models.User.findByPk(id);
      }
    ),
    me: async (parent, args, { models, me }) => {
      if (!me) {
        return null;
      }
      return await models.User.findByPk(me.id);
    },
  },

  Mutation: {
    signUp: async (
      parent,
      { username, email, password },
      { models }
    ) => {
      try {
        // Sanitize inputs
        username = sanitizeAuthInput(username);
        email = sanitizeAuthInput(email);

        // Validate password strength
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.isValid) {
          throw new UserInputError('Password does not meet requirements', {
            validationErrors: passwordValidation.errors
          });
        }

        // Check rate limiting
        checkAuthRateLimit(email);

        const user = await models.User.create({
          username,
          email,
          password,
        });

        // Clear any previous auth attempts
        clearAuthAttempts(email);

        // Generate tokens
        const tokens = await generateTokens(user);

        logger.info('User signed up successfully', {
          userId: user.id,
          username: user.username,
          email: user.email
        });

        return { 
          token: tokens.accessToken,
          refreshToken: tokens.refreshToken
        };
      } catch (error) {
        return handleDatabaseError(error, 'signUp');
      }
    },

    signIn: async (
      parent,
      { login, password },
      { models }
    ) => {
      try {
        // Sanitize input
        login = sanitizeAuthInput(login);

        // Check rate limiting
        checkAuthRateLimit(login);

        const user = await models.User.findByLogin(login);

        if (!user) {
          throw new AuthenticationError('Invalid credentials. Please try signing in again');
        }

        const isValid = await user.validatePassword(password);

        if (!isValid) {
          throw new AuthenticationError('Invalid credentials. Please try signing in again');
        }

        // Clear any previous auth attempts on successful login
        clearAuthAttempts(login);

        // Generate tokens
        const tokens = await generateTokens(user);

        logger.info('User signed in successfully', {
          userId: user.id,
          username: user.username,
          email: user.email
        });

        return { 
          token: tokens.accessToken,
          refreshToken: tokens.refreshToken
        };
      } catch (error) {
        logger.error('Sign in failed', {
          login,
          error: error.message
        });
        throw error;
      }
    },

    // updateUser: combineResolvers(
    //   isAuthenticated,
    //   async (parent, { username }, { models, me }) => {
    //     const user = await models.User.findByPk(me.id);
    //     return await user.update({ username });
    //   },
    // ),

    // deleteUser: combineResolvers(
    //   isAdmin,
    //   async (parent, { id }, { models }) => {
    //     return await models.User.destroy({
    //       where: { id }
    //     });
    //   },
    // ),
  },

  User: {
    messages: async (user, args, { models }) => {
      return await models.Message.findAll({
        where: {
          userId: user.id
        },
      });
    },
    // room: async (user, args, { loaders }) => {
    //   return await loaders.Room.load(user.roomId)
    // },
  },
}

