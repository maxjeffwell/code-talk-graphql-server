import Sequelize from 'sequelize';
import { combineResolvers } from 'graphql-resolvers';

import PostgresPubSub, { EVENTS } from '../subscription';
import { isAuthenticated, isAdmin } from './authorization';

const toCursorHash = string => Buffer.from(string).toString('base64');

const fromCursorHash = string =>
  Buffer.from(string, 'base64').toString('ascii');

export default {
  Query: {
    rooms: async (parent, { cursor, limit = 50 }, { models }) => {
      const cursorOptions = cursor ? {
          where: {
            createdAt: {
              [Sequelize.Op.lt]: fromCursorHash(cursor),
            },
          },
        }
        : {};

      const rooms = await models.Room.findAll({
        order: [['createdAt', 'DESC']],
        limit: limit + 1,
        ...cursorOptions,
      });

      const hasNextPage = rooms.length > limit;
      const edges = hasNextPage ? rooms.slice(0, -1) : rooms;

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

    room: async (parent, { id }, { models }) => {
      return await models.Room.findByPk(id);
    },
  },

  Mutation: {
    createRoom: combineResolvers(
      isAuthenticated,
      async (parent, { title }, { models, me }) => {
        const room = await models.Room.create({
          title,
          userId: me.id,
        });

        PostgresPubSub.publish(EVENTS.ROOM.CREATED, {
          roomCreated: { room },
        });

        return room;
        },
      ),

    deleteRoom: combineResolvers(
      isAdmin,
      async (parent, { id }, { models }) => {
        return await models.Room.destroy({ where: { id } });
        },
      ),
    },

  Subscription: {
    roomCreated: {
      subscribe: () => PostgresPubSub.asyncIterator(EVENTS.ROOM.CREATED),
    },
    // userJoined: {
    //   subscribe: () => PostgresPubSub.asyncIterator(EVENTS.ROOM.JOINED),
    // },
    // userLeft: {
    //   subscribe: () => PostgresPubSub.asyncIterator(EVENTS.ROOM.LEFT),
    // },
  }
};

