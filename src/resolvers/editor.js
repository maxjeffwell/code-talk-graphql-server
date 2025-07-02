import PubSub, { EVENTS } from '../subscription';
import { isAuthenticated } from './authorization';
import { combineResolvers } from 'graphql-resolvers';
import DOMPurify from 'isomorphic-dompurify';

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
      const sanitizedCode = DOMPurify.sanitize(code);
      PubSub.publish(EVENTS.EDITOR.TYPING_CODE, {typingCode: sanitizedCode});
      return sanitizedCode;
    })
  },

  Subscription: {
    typingCode: {
      subscribe: () => PubSub.asyncIterator(EVENTS.EDITOR.TYPING_CODE),
    },
  },
};

