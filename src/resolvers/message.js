import { Sequelize } from 'sequelize';
import { combineResolvers } from 'graphql-resolvers';
import DOMPurify from 'isomorphic-dompurify';

import PubSub, { EVENTS } from '../subscription';
import { isAuthenticated, isMessageOwner } from './authorization';

const toCursorHash = string => Buffer.from(string).toString('base64');

const fromCursorHash = string =>
  Buffer.from(string, 'base64').toString('ascii');

export default {
  Query: {
    messages: combineResolvers(
      isAuthenticated,
      async (parent, { cursor, limit = 10, roomId }, { models }) => {
      const whereClause = {
        ...(cursor && {
          createdAt: {
            [Sequelize.Op.lt]: fromCursorHash(cursor),
          },
        }),
        ...(roomId !== undefined && { 
          roomId: roomId === null ? null : (
            Number.isInteger(Number(roomId)) ? parseInt(roomId, 10) : null
          )
        }),
      };

      const messages = await models.Message.findAll({
        order: [['createdAt', 'DESC']],
        limit: limit + 1,
        where: whereClause,
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
    }),
    message: combineResolvers(
      isAuthenticated,
      async (parent, { id }, { models }) => {
        return await models.Message.findByPk(id);
      }
    ),
  },

  Mutation: {
    createMessage: combineResolvers(
      isAuthenticated,
      async (parent, { text, roomId }, { models, me }) => {
        const sanitizedText = DOMPurify.sanitize(text);
        const message = await models.Message.create({
          text: sanitizedText,
          userId: me.id,
          // roomId is optional and can be null for global messages
          ...(roomId !== undefined && { 
            roomId: roomId === null ? null : (
              Number.isInteger(Number(roomId)) ? parseInt(roomId, 10) : null
            )
          }),
        });

        PubSub.publish(EVENTS.MESSAGE.CREATED, {
          messageCreated: { message },
        });

        return message;
      },
    ),

    deleteMessage: combineResolvers(
      isAuthenticated,
      isMessageOwner,
      async (parent, { id }, { models }) => {
        const messageId = parseInt(id, 10);
        
        // Get the message before deleting to return it
        const message = await models.Message.findByPk(messageId);
        
        if (!message) {
          throw new Error('Message not found');
        }
        
        const deletedCount = await models.Message.destroy({ where: { id: messageId } });
        
        if (deletedCount === 0) {
          throw new Error('Message could not be deleted');
        }
        
        PubSub.publish(EVENTS.MESSAGE.DELETED, { messageDeleted: message });
        return message;
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
    messageDeleted: {
      subscribe: () => PubSub.asyncIterator(EVENTS.MESSAGE.DELETED),
    },
  },
  };
