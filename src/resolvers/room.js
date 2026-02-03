/**
 * Room Resolvers
 *
 * GraphQL resolvers for room operations.
 * Business logic is delegated to RoomService.
 */

import { combineResolvers } from 'graphql-resolvers';

import PubSub, { EVENTS } from '../subscription';
import { isAuthenticated } from './authorization';
import { validate, createRoomSchema, roomIdSchema, joinLeaveRoomSchema } from '../utils/validation.js';
import * as RoomService from '../services/RoomService.js';
import * as MessageService from '../services/MessageService.js';

export default {
  Query: {
    rooms: combineResolvers(
      isAuthenticated,
      async (parent, { cursor, limit = 5 }, { models, timing }) => {
        return timing.time('db-rooms', 'PostgreSQL rooms query', () =>
          RoomService.getRooms(models, { cursor, limit })
        );
      }
    ),

    room: combineResolvers(
      isAuthenticated,
      async (parent, { id }, { models, timing }) => {
        return timing.time('db-room', 'PostgreSQL room lookup', () =>
          RoomService.getRoomById(models, id)
        );
      }
    ),
  },

  Mutation: {
    createRoom: combineResolvers(
      isAuthenticated,
      async (parent, args, { models, me }) => {
        const { title } = validate(createRoomSchema, args, 'createRoom');
        return RoomService.createRoom(models, {
          title,
          userId: me.id,
        });
      }
    ),

    deleteRoom: combineResolvers(
      isAuthenticated,
      async (parent, args, { models }) => {
        const { id } = validate(roomIdSchema, args, 'deleteRoom');
        return RoomService.deleteRoom(models, id);
      }
    ),

    joinRoom: combineResolvers(
      isAuthenticated,
      async (parent, args, { models, me }) => {
        const { roomId } = validate(joinLeaveRoomSchema, args, 'joinRoom');
        return RoomService.joinRoom(models, { roomId, user: me });
      }
    ),

    leaveRoom: combineResolvers(
      isAuthenticated,
      async (parent, args, { models, me }) => {
        const { roomId } = validate(joinLeaveRoomSchema, args, 'leaveRoom');
        return RoomService.leaveRoom(models, { roomId, userId: me.id });
      }
    ),
  },

  Room: {
    messages: async (room, { cursor, limit = 5 }, { models }) => {
      return MessageService.getMessagesByRoom(models, room.id, { cursor, limit });
    },

    users: async (room) => {
      return RoomService.getRoomUsers(room);
    },
  },

  Subscription: {
    roomCreated: {
      subscribe: () => PubSub.asyncIterator(EVENTS.ROOM.CREATED),
    },
    roomDeleted: {
      subscribe: () => PubSub.asyncIterator(EVENTS.ROOM.DELETED),
    },
    roomUserJoined: {
      subscribe: () => PubSub.asyncIterator(EVENTS.ROOM.USER_JOINED),
    },
    roomUserLeft: {
      subscribe: () => PubSub.asyncIterator(EVENTS.ROOM.USER_LEFT),
    },
  },
};
