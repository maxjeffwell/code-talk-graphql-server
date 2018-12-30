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
      async (parent, { title }, { models, user }) => {
        const room = await models.Room.create({
          title,
          userId: user.id,
        });

        PostgresPubSub.publish(EVENTS.ROOM.CREATED, {
          roomCreated: { room },
        });

        return room;
        },
      ),

    // userJoin: combineResolvers(
    //   isAuthenticated,
    //   async(parent, { title })
    // )

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
    userJoined: {
      subscribe: () => PostgresPubSub.asyncIterator(EVENTS.ROOM.JOINED),
    },
    userLeft: {
      subscribe: () => PostgresPubSub.asyncIterator(EVENTS.ROOM.LEFT),
    },
  }
};

