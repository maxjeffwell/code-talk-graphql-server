/**
 * Message Resolvers
 *
 * GraphQL resolvers for message operations.
 * Business logic is delegated to MessageService.
 */

import { combineResolvers } from 'graphql-resolvers';

import PubSub, { EVENTS } from '../subscription';
import { isAuthenticated, isMessageOwner } from './authorization';
import { validate, createMessageSchema, deleteMessageSchema } from '../utils/validation.js';
import * as MessageService from '../services/MessageService.js';

export default {
  Query: {
    messages: combineResolvers(
      isAuthenticated,
      async (parent, { cursor, limit = 10, roomId }, { models, timing }) => {
        return timing.time('db-messages', 'PostgreSQL messages query', () =>
          MessageService.getMessages(models, { cursor, limit, roomId })
        );
      }
    ),

    message: combineResolvers(
      isAuthenticated,
      async (parent, { id }, { models, timing }) => {
        return timing.time('db-message', 'PostgreSQL message lookup', () =>
          MessageService.getMessageById(models, id)
        );
      }
    ),
  },

  Mutation: {
    createMessage: combineResolvers(
      isAuthenticated,
      async (parent, args, { models, me }) => {
        const { text, roomId } = validate(createMessageSchema, args, 'createMessage');
        return MessageService.createMessage(models, {
          text,
          userId: me.id,
          roomId,
        });
      }
    ),

    deleteMessage: combineResolvers(
      isAuthenticated,
      isMessageOwner,
      async (parent, args, { models }) => {
        const { id } = validate(deleteMessageSchema, args, 'deleteMessage');
        return MessageService.deleteMessage(models, id);
      }
    ),
  },

  Message: {
    user: async (message, args, { loaders }) => {
      return loaders.user.load(message.userId);
    },
    room: async (message, args, { loaders }) => {
      return message.roomId ? loaders.room.load(message.roomId) : null;
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
