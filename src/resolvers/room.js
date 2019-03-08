import Sequelize from 'sequelize';
import { combineResolvers } from 'graphql-resolvers';

import PubSub, { EVENTS } from '../subscription';
import { isAuthenticated } from './authorization';

const toCursorHash = string => Buffer.from(string).toString('base64');

const fromCursorHash = string =>
  Buffer.from(string, 'base64').toString('ascii');

export default {
  Query: {
    rooms: combineResolvers(
      isAuthenticated,
      async (parent, { cursor, limit = 5 }, { models }) => {
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
    }),

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

        PubSub.publish(EVENTS.ROOM.CREATED, {
          roomCreated: { room },
        });

        return room;
        },
      ),

    deleteRoom: combineResolvers(
      isAuthenticated,
      async (parent, { id }, { models }) => {
        return await models.Room.destroy({ where: { id } });
        },
      ),
    },

  Room: {
    messages: async (room, args, { models }) => {
      return await models.Message.findAll({
        where: {
          roomId: room.id
        },
      });
      },
  },

  Subscription: {
    roomCreated: {
      subscribe: () => PubSub.asyncIterator(EVENTS.ROOM.CREATED),
    },
  }
};

