import { Sequelize } from 'sequelize';
import { combineResolvers } from 'graphql-resolvers';
import DOMPurify from 'isomorphic-dompurify';

import PubSub, { EVENTS } from '../subscription';
import { isAuthenticated, isMessageOwner } from './authorization';
import { purgeCodeTalkCache } from '../utils/cloudflare.js';

const toCursorHash = string => Buffer.from(string).toString('base64');

const fromCursorHash = string =>
  Buffer.from(string, 'base64').toString('ascii');

export default {
  Query: {
    messages: combineResolvers(
      isAuthenticated,
      async (parent, { cursor, limit = 10, roomId }, { models, timing }) => {
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

      const messages = await timing.time('db-messages', 'PostgreSQL messages query', () =>
        models.Message.findAll({
          order: [['createdAt', 'DESC']],
          limit: limit + 1,
          where: whereClause,
        })
      );

      const hasNextPage = messages.length > limit;
      const edges = hasNextPage ? messages.slice(0, -1) : messages;

      return {
        edges,
        pageInfo: {
          hasNextPage,
          endCursor: edges.length > 0 ? toCursorHash(
            edges[edges.length - 1].createdAt.toString(),
          ) : '',
        },
      };
    }),
    message: combineResolvers(
      isAuthenticated,
      async (parent, { id }, { models, timing }) => {
        return await timing.time('db-message', 'PostgreSQL message lookup', () =>
          models.Message.findByPk(id)
        );
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

        // Purge Cloudflare cache on message create
        purgeCodeTalkCache();

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

        // Purge Cloudflare cache on message delete
        purgeCodeTalkCache();

        return message;
      },
    ),
  },

  Message: {
    user: async (message, args, { loaders }) => {
      return await loaders.user.load(message.userId);
    },
    room: async (message, args, { loaders }) => {
      return message.roomId ? await loaders.room.load(message.roomId) : null;
    },
  },

  Subscription: {
    messageCreated: {
      subscribe: combineResolvers(
        isAuthenticated,
        (parent, { roomId }, { me }) => {
          return PubSub.asyncIterator(EVENTS.MESSAGE.CREATED);
        }
      ),
      resolve: (payload, { roomId }) => {
        if (roomId !== undefined) {
          const messageRoomId = payload.messageCreated.message.roomId;
          
          // For global chat subscription (roomId === null)
          // Only show messages without a roomId
          if (roomId === null && messageRoomId !== null) return null;
          
          // For room-specific subscription (roomId !== null)
          // Only show messages for that specific room
          if (roomId !== null) {
            // Filter out global messages from room subscriptions
            if (messageRoomId === null) return null;
            // Filter out messages from other rooms
            if (messageRoomId !== parseInt(roomId, 10)) return null;
          }
        }
        return payload.messageCreated;
      },
    },
    messageDeleted: {
      subscribe: combineResolvers(
        isAuthenticated,
        () => PubSub.asyncIterator(EVENTS.MESSAGE.DELETED)
      ),
    },
  },
  };
