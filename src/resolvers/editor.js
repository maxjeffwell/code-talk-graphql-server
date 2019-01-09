import PostgresPubSub, { EVENTS } from '../subscription';

export default {

  Query: {
    readCode: () => ({body: ``}),
  },

  Mutation: {
    typeCode: (root, args, context) => {
      const { code } = args;
      context.PostgresPubSub.publish(EVENTS.EDITOR.TYPING_CODE, {typingCode: code});
      return code;
    }
  },

  Subscription: {
    typingCode: {
      subscribe: () => PostgresPubSub.asyncIterator(EVENTS.EDITOR.TYPING_CODE),
    },
  },
};

