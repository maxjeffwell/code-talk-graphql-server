import PubSub, { EVENTS } from '../subscription';
import { isAuthenticated } from './authorization';
import { combineResolvers } from 'graphql-resolvers';

export default {
  Query: {
    readCode: combineResolvers(
      isAuthenticated,
      () => ({body: ``}))
  },

  Mutation: {
    typeCode: combineResolvers(
      isAuthenticated,
      (root, args) => {
      const { code } = args;
      PubSub.publish(EVENTS.EDITOR.TYPING_CODE, {typingCode: code});
      return code;
    })
  },

  Subscription: {
    typingCode: {
      subscribe: () => PubSub.asyncIterator(EVENTS.EDITOR.TYPING_CODE),
    },
  },
};

