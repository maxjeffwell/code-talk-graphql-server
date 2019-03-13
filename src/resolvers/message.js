import { combineResolvers } from 'graphql-resolvers';
import { withFilter } from 'graphql-subscriptions';

import { isAuthenticated, isMessageOwner } from './authorization';
import PubSub, { EVENTS } from '../subscription';

// const toCursorHash = string => Buffer.from(string).toString('base64');

// const fromCursorHash = string => Buffer.from(string, 'base64').toString('ascii');

export default {
  Query: {
    // messages: combineResolvers(
    //   isAuthenticated,
    //   async (parent, { cursor, limit = 10, roomId }, { models }) => {
    //     const cursorOptions = cursor ? {
    //       where: {
    //         createdAt: {
    //           [Sequelize.Op.lt]: fromCursorHash(cursor),
    //         }
    //       },
    //     }
    //       : {};
    //
    //     const messages = await models.Message.findAll({
    //       raw: true,
    //       order: [['createdAt', 'DESC']],
    //       where: { id: roomId },
    //       limit: limit + 1,
    //       ...cursorOptions,
    //     });
    //
    //     const hasNextPage = messages.length > limit;
    //     const edges = hasNextPage ? messages.slice(0, -1) : messages;
    //
    //     return {
    //       edges,
    //       pageInfo: {
    //         hasNextPage,
    //         endCursor: toCursorHash(
    //           edges[edges.length - 1].createdAt.toString(),
    //         ),
    //       },
    //     };
    //   },
    // ),

    messages: combineResolvers(
      isAuthenticated,
      async (parent, { cursor, roomId }, { models, me }) => {
      await models.Room.findOne({ raw: true, where: { id: roomId } });
      await models.User.findOne({ raw: true, where: { id: me.id } });

      const options = {
        order: [['createdAt', 'DESC']],
        where: { roomId },
        limit: 10,
      };

      if (cursor) {
        options.where.createdAt = {
          [models.Op.lt]: cursor,
        };
      }

      return models.Message.findAll(options, { raw: true });
    }),

    message: async (parent, { id }, { models }) => await models.Message.findByPk(id),
  },

  Mutation: {
    createMessage: combineResolvers(
      isAuthenticated,
      async (parent, { text, roomId }, { models, me }) => {
        const message = await models.Message.create({
          text,
          roomId,
          userId: me.id,
        });

        PubSub.publish(EVENTS.MESSAGE.CREATED, {
          roomId,
          messageCreated: { message },
        });

        return message;
      },
    ),

    deleteMessage: combineResolvers(
      isAuthenticated,
      isMessageOwner,
      async (parent, { id }, { models }) => await models.Message.destroy({ where: { id } }),
    ),
  },

  Message: {
    user: async (message, args, { loaders }) => {
      return await loaders.user.load(message.userId);
    },
    room: {
      messages: async (room, args, { models }) => {
        return await models.Message.findAll({
          where: {
            roomId: args.roomId
          },
        });
      },
    },
  },

  Subscription: {
    messageCreated: {
      subscribe: withFilter(() => PubSub.asyncIterator(EVENTS.MESSAGE.CREATED),
        (payload, args) => payload.roomId === args.roomId),
    },
  },
};
