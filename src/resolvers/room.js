import { combineResolvers } from 'graphql-resolvers';

import pubsub, { EVENTS } from '../subscription';
import { isAuthenticated } from './authorization';

export default {
  Mutation: {
    createRoom: combineResolvers(
      isAuthenticated,
      async (parent, { name }, { models }) => {
        const room = await models.Room.create({
          name
        });

        pubsub.publish(EVENTS.ROOM.CREATED, {
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
      subscribe: () => pubsub.asyncIterator(EVENTS.ROOM.JOINED),
    },
    roomLeft: {
      subscribe: () => pubsub.asyncIterator(EVENTS.ROOM.LEFT),
    },
  },

};


