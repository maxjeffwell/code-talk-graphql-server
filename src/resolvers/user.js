import { combineResolvers } from 'graphql-resolvers';

import { AuthenticationError, UserInputError } from 'apollo-server-express';
import { isAdmin, isAuthenticated } from './authorization';
import {
  generateTokens,
  validatePassword,
  checkAuthRateLimit,
  clearAuthAttempts,
  sanitizeAuthInput,
  setAuthCookies,
  clearAuthCookies,
} from '../utils/auth.js';
import { handleDatabaseError } from '../utils/errors.js';
import logger from '../utils/logger.js';
import { validate, signUpSchema, signInSchema } from '../utils/validation.js';

export default {
  Query: {
    users: combineResolvers(
      isAuthenticated,
      async (parent, args, { models, timing }) => {
        return await timing.time('db-users', 'PostgreSQL users query', () =>
          models.User.findAll()
        );
      }
    ),
    user: combineResolvers(
      isAuthenticated,
      async (parent, { id }, { models, timing }) => {
        return await timing.time('db-user', 'PostgreSQL user lookup', () =>
          models.User.findByPk(id)
        );
      }
    ),
    me: async (parent, args, { models, me, timing }) => {
      if (!me) {
        return null;
      }
      return await timing.time('db-me', 'PostgreSQL current user', () =>
        models.User.findByPk(me.id)
      );
    },
  },

  Mutation: {
    signUp: async (
      parent,
      args,
      { models, res }
    ) => {
      try {
        // Validate and sanitize inputs
        const { username, email, password } = validate(signUpSchema, args, 'signUp');

        // Validate password strength
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.isValid) {
          throw new UserInputError('Password does not meet requirements', {
            validationErrors: passwordValidation.errors
          });
        }

        // Check rate limiting (distributed via Upstash when configured)
        await checkAuthRateLimit(email);

        const user = await models.User.create({
          username,
          email,
          password,
        });

        // Clear any previous auth attempts
        await clearAuthAttempts(email);

        // Generate tokens and set httpOnly cookies
        const tokens = await generateTokens(user);
        setAuthCookies(res, tokens);

        logger.info('User signed up successfully', {
          userId: user.id,
          username: user.username,
          email: user.email
        });

        // Return success with user info (tokens are in httpOnly cookies)
        return {
          success: true,
          user: user,
        };
      } catch (error) {
        // Re-throw validation and authentication errors without modification
        if (error instanceof UserInputError || error instanceof AuthenticationError) {
          throw error;
        }
        return handleDatabaseError(error, 'signUp');
      }
    },

    signIn: async (
      parent,
      args,
      { models, res, timing }
    ) => {
      try {
        // Validate and sanitize inputs
        const { login, password } = validate(signInSchema, args, 'signIn');

        // Check rate limiting (distributed via Upstash when configured)
        await checkAuthRateLimit(login);

        const user = await timing.time('db-login', 'PostgreSQL user lookup', () =>
          models.User.findByLogin(login)
        );

        if (!user) {
          throw new AuthenticationError('Invalid credentials. Please try signing in again');
        }

        const isValid = await timing.time('bcrypt', 'Password verification', () =>
          user.validatePassword(password)
        );

        if (!isValid) {
          throw new AuthenticationError('Invalid credentials. Please try signing in again');
        }

        // Clear any previous auth attempts on successful login
        await clearAuthAttempts(login);

        // Generate tokens and set httpOnly cookies
        const tokens = await timing.time('jwt', 'Token generation', () =>
          generateTokens(user)
        );
        setAuthCookies(res, tokens);

        logger.info('User signed in successfully', {
          userId: user.id,
          username: user.username,
          email: user.email
        });

        // Return success with user info (tokens are in httpOnly cookies)
        return {
          success: true,
          user: user,
        };
      } catch (error) {
        logger.error('Sign in failed', {
          login,
          error: error.message
        });
        throw error;
      }
    },

    signOut: async (parent, args, { res, me }) => {
      try {
        // Clear httpOnly auth cookies
        clearAuthCookies(res);

        logger.info('User signed out', {
          userId: me?.id,
          username: me?.username
        });

        return true;
      } catch (error) {
        logger.error('Sign out failed', {
          error: error.message
        });
        return false;
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

