/**
 * User Resolvers
 *
 * GraphQL resolvers for user operations.
 * Authentication business logic is delegated to UserService.
 */

import { combineResolvers } from 'graphql-resolvers';
import { UserInputError } from 'apollo-server-express';

import { isAuthenticated } from './authorization';
import { validatePassword } from '../utils/auth.js';
import { handleDatabaseError } from '../utils/errors.js';
import logger from '../utils/logger.js';
import { validate, signUpSchema, signInSchema } from '../utils/validation.js';
import * as UserService from '../services/UserService.js';

export default {
  Query: {
    users: combineResolvers(
      isAuthenticated,
      async (parent, args, { models, timing }) => {
        return timing.time('db-users', 'PostgreSQL users query', () =>
          UserService.getAllUsers(models)
        );
      }
    ),

    user: combineResolvers(
      isAuthenticated,
      async (parent, { id }, { models, timing }) => {
        return timing.time('db-user', 'PostgreSQL user lookup', () =>
          UserService.getUserById(models, id)
        );
      }
    ),

    me: async (parent, args, { models, me, timing }) => {
      if (!me) {
        return null;
      }
      return timing.time('db-me', 'PostgreSQL current user', () =>
        UserService.getUserById(models, me.id)
      );
    },
  },

  Mutation: {
    signUp: async (parent, args, { models, res }) => {
      try {
        // Validate inputs
        const { username, email, password } = validate(signUpSchema, args, 'signUp');

        // Validate password strength
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.isValid) {
          throw new UserInputError('Password does not meet requirements', {
            validationErrors: passwordValidation.errors,
          });
        }

        // Create user and generate tokens via service
        const { user, tokens } = await UserService.createUser(models, {
          username,
          email,
          password,
        });

        // Set httpOnly cookies
        UserService.setUserAuthCookies(res, tokens);

        return {
          success: true,
          user,
        };
      } catch (error) {
        if (error instanceof UserInputError) {
          throw error;
        }
        return handleDatabaseError(error, 'signUp');
      }
    },

    signIn: async (parent, args, { models, res, timing }) => {
      // Validate inputs
      const { login, password } = validate(signInSchema, args, 'signIn');

      // Authenticate user via service (includes rate limiting)
      const { user, tokens } = await timing.time('auth', 'User authentication', () =>
        UserService.authenticateUser(models, { login, password })
      );

      // Set httpOnly cookies
      UserService.setUserAuthCookies(res, tokens);

      return {
        success: true,
        user,
      };
    },

    signOut: async (parent, args, { res, me }) => {
      try {
        UserService.clearUserAuthCookies(res);

        logger.info('User signed out', {
          userId: me?.id,
          username: me?.username,
        });

        return true;
      } catch (error) {
        logger.error('Sign out failed', { error: error.message });
        return false;
      }
    },
  },

  User: {
    messages: async (user, args, { models }) => {
      return models.Message.findAll({
        where: { userId: user.id },
      });
    },
  },
};
