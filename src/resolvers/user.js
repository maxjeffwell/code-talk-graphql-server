import jwt from 'jsonwebtoken';
// import { combineResolvers } from 'graphql-resolvers';

import { AuthenticationError, UserInputError } from 'apollo-server';
// import { isAdmin, isAuthenticated } from './authorization';


const createToken = async (user, secret, expiresIn) => {
  const { id, email, username, role } = user;
  return await jwt.sign({ id, email, username, role }, secret, {
    expiresIn,
  });
};

export default {
  Query: {
    users: async (parent, args, { models }) => {
      return await models.User.findAll();
    },
    user: async (parent, { id }, { models }) => {
      return await models.User.findByPk(id);
    },
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
      { models, secret }
    ) => {
      const user = await models.User.create({
        username,
        email,
        password,
      });

      return { token: createToken(user, secret, '1d') };
    },

    signIn: async (
      parent,
      { login, password },
      { models, secret }
    ) => {
      const user = await models.User.findByLogin(login);

      if (!user) {
        throw new UserInputError(
          'Invalid credentials. Please try signing in again'
        );
      }

      const isValid = await user.validatePassword(password);

      if (!isValid) {
        throw new AuthenticationError('Invalid credentials. Please try signing in again');
      }

      return { token: createToken(user, secret, '1d') };
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
    room: async (user, args, { loaders }) => {
      return await loaders.Room.load(user.roomId)
    },
  },
}

