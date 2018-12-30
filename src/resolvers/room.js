import { combineResolvers } from 'graphql-resolvers';

import PostgresPubSub, { EVENTS } from '../subscription';
import { isAuthenticated, isAdmin } from './authorization';

export default {
  Query: {
    rooms: async (parent, args, { models }) => {
      return await models.Room.findAll();
    },

    room: async (parent, { id }, { models }) => {
      return await models.Room.findByPk(id);
    },
  },

  Mutation: {
    createRoom: combineResolvers(
      isAuthenticated,
      async (parent, { name }, { models, me }) => {
        const room = await models.Room.create({
          name,
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
    roomJoined: {
      subscribe: () => PostgresPubSub.asyncIterator(EVENTS.ROOM.JOINED),
    },
    roomLeft: {
      subscribe: () => PostgresPubSub.asyncIterator(EVENTS.ROOM.LEFT),
    },
  }
};

