import { combineResolvers } from 'graphql-resolvers';

import PostgresPubSub, { EVENTS } from '../subscription';
import { isAuthenticated } from './authorization';

export default {
  Query: {
    rooms: async (parent, args, { models }) => {
      return await models.Room.findAll();
    }
  },

  Mutation: {
    createRoom: combineResolvers(
      isAuthenticated,
      async (parent, { name }, { models }) => {
        const room = await models.Room.create({
          name
        });

        PostgresPubSub.publish(EVENTS.ROOM.CREATED, {
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

  Subscription: {
    roomJoined: {
      subscribe: () => PostgresPubSub.asyncIterator(EVENTS.ROOM.JOINED),
    },
    roomLeft: {
      subscribe: () => PostgresPubSub.asyncIterator(EVENTS.ROOM.LEFT),
    },
  }
};

