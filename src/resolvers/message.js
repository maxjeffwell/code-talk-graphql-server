import { Sequelize } from 'sequelize';
import { combineResolvers } from 'graphql-resolvers';

import PubSub, { EVENTS } from '../subscription';
import { isAuthenticated, isMessageOwner } from './authorization';

const toCursorHash = string => Buffer.from(string).toString('base64');

const fromCursorHash = string =>
  Buffer.from(string, 'base64').toString('ascii');

export default {
  Query: {
    messages: async (parent, { cursor, limit = 10 }, { models }) => {
      const cursorOptions = cursor
        ? {
          where: {
            createdAt: {
              [Sequelize.Op.lt]: fromCursorHash(cursor),
            },
          },
        }
        : {};

      const messages = await models.Message.findAll({
        order: [['createdAt', 'DESC']],
        limit: limit + 1,
        ...cursorOptions,
      });

      const hasNextPage = messages.length > limit;
      const edges = hasNextPage ? messages.slice(0, -1) : messages;

      return {
        edges,
        pageInfo: {
          hasNextPage,
          endCursor: toCursorHash(
            edges[edges.length - 1].createdAt.toString(),
          ),
        },
      };
    },
    message: async (parent, { id }, { models }) => {
      return await models.Message.findByPk(id);
    },
  },

  Mutation: {
    // createMessage: combineResolvers(
    //   isAuthenticated,
    //   async (parent, { text, file }, { models, me }) => {
    //     const message = await models.Message.create({
    //       text,
    //
    //       userId: me.id,
    //     });
    //
    //     PubSub.publish(EVENTS.MESSAGE.CREATED, {
    //       messageCreated: { message },
    //     });
    //
    //     return message;
    //   },
    // ),

    createMessage: combineResolvers(
      isAuthenticated,
      (async (parent, { file, ...args }, { models, me }) => {
        try {
          const messageData = args;
          if (file) {
            messageData.filetype = file.type;
            messageData.url = file.path;
          }
          const message = await models.Message.create({
            ...messageData,
            userId: me.id,
          });

          const asyncFunc = async () => {
            const me = await models.User.findOne({
              where: {
                id: me.id,
              },
            });

            PubSub.publish(EVENTS.MESSAGE.CREATED, {
              messageCreated: {
                ...message.dataValues,
                me: me.dataValues,
              },
            });
          };
          asyncFunc();

          return message;
        } catch (err) {
          console.log(err);
        }
      }),
    ),

    deleteMessage: combineResolvers(
      isAuthenticated,
      isMessageOwner,
      async (parent, { id }, { models }) => {
        const messageDeleted = await models.Message.destroy({ where: { id } });
        // PubSub.publish(EVENTS.MESSAGE.DELETED, { messageDeleted });
        return messageDeleted;
      },
    ),
  },

  Message: {
    user: async (message, args, { loaders }) => {
      return await loaders.user.load(message.userId);
    },
  },

  Subscription: {
    messageCreated: {
      subscribe: () => PubSub.asyncIterator(EVENTS.MESSAGE.CREATED),
    },
    // messageDeleted: {
    // subscribe: () => PubSub.asyncIterator(EVENTS.MESSAGE.DELETED),
    // },
    },
  };
