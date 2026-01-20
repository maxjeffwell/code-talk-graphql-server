import { Sequelize } from 'sequelize';
import { combineResolvers } from 'graphql-resolvers';

import PubSub, { EVENTS } from '../subscription';
import { isAuthenticated } from './authorization';
import { purgeCodeTalkCache } from '../utils/cloudflare.js';

const toCursorHash = string => Buffer.from(string).toString('base64');

const fromCursorHash = string => Buffer.from(string, 'base64').toString('ascii');

export default {
  Query: {
    rooms: combineResolvers(
      isAuthenticated,
      async (parent, { cursor, limit = 5 }, { models, me, timing }) => {
        const cursorOptions = cursor ? {
            where: {
              createdAt: {
                [Sequelize.Op.lt]: fromCursorHash(cursor),
              },
            },
          }
          : {};

        const rooms = await timing.time('db-rooms', 'PostgreSQL rooms query', () =>
          models.Room.findAll({
            order: [['createdAt', 'DESC']],
            limit: limit + 1,
            // Remove user filter to show all rooms to all authenticated users
            ...cursorOptions,
          })
        );

        const hasNextPage = rooms.length > limit;
        const edges = hasNextPage ? rooms.slice(0, -1) : rooms;

        return {
          edges,
          pageInfo: {
            hasNextPage,
            endCursor: edges.length > 0 ? toCursorHash(
              edges[edges.length - 1].createdAt.toString(),
            ) : null,
          },
        };
      }),

    room: combineResolvers(
      isAuthenticated,
      async (parent, { id }, { models, me, timing }) => {
        const room = await timing.time('db-room', 'PostgreSQL room lookup', () =>
          models.Room.findByPk(id)
        );

        if (!room) {
          throw new Error('Room not found');
        }

        return room;
      }),
  },

  Mutation: {
    createRoom: combineResolvers(
      isAuthenticated,
      async (parent, { title }, { models, me }) => {
        const room = await models.Room.create({
          title,
        });

        await room.addUser(me.id);

        await PubSub.publish(EVENTS.ROOM.CREATED, {
          roomCreated: { room },
        });

        purgeCodeTalkCache();

        return room;
      },
    ),

    deleteRoom: combineResolvers(
      isAuthenticated,
      async (parent, { id }, { models, me }) => {
        const room = await models.Room.findByPk(id);

        if (!room) {
          throw new Error('Room not found');
        }

        const result = await models.Room.destroy({ where: { id } });

        // Publish room deleted event
        await PubSub.publish(EVENTS.ROOM.DELETED, {
          roomDeleted: { id },
        });

        purgeCodeTalkCache();

        return result;
      },
    ),
    
    joinRoom: combineResolvers(
      isAuthenticated,
      async (parent, { roomId }, { models, me }) => {
        const room = await models.Room.findByPk(roomId);
        
        if (!room) {
          throw new Error('Room not found');
        }
        
        await room.addUser(me.id);
        
        // Fetch the room with the user included
        const roomWithUser = await models.Room.findByPk(roomId, {
          include: [{
            model: models.User,
            where: { id: me.id },
            through: { attributes: [] }
          }]
        });
        
        // Publish room user joined event
        await PubSub.publish(EVENTS.ROOM.USER_JOINED, {
          roomUserJoined: { 
            room: roomWithUser,
            user: me 
          },
        });
        
        return roomWithUser;
      },
    ),
    
    leaveRoom: combineResolvers(
      isAuthenticated,
      async (parent, { roomId }, { models, me }) => {
        const room = await models.Room.findByPk(roomId);
        
        if (!room) {
          throw new Error('Room not found');
        }
        
        await room.removeUser(me.id);
        
        // Publish room user left event
        await PubSub.publish(EVENTS.ROOM.USER_LEFT, {
          roomUserLeft: { 
            roomId,
            userId: me.id 
          },
        });
        
        return true;
      },
    ),
  },

  Room: {
    messages: async (room, { cursor, limit = 5 }, { models }) => {
      const cursorOptions = cursor ? {
          where: {
            roomId: room.id,
            createdAt: {
              [Sequelize.Op.lt]: fromCursorHash(cursor),
            },
          },
        }
        : {
          where: {
            roomId: room.id
          }
        };

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
          endCursor: edges.length > 0 ? toCursorHash(
            edges[edges.length - 1].createdAt.toString(),
          ) : null,
        },
      };
    },
    
    users: async (room, args, { models }) => {
      return await room.getUsers();
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
  }
};