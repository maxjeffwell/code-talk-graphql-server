import PostgresPubSub, { EVENTS } from '../subscription';

export default {

  Query: {
    readCode: () => ({body: ``}),
  },

  Mutation: {
    typeCode: (root, args) => {
      const { code } = args;
      PostgresPubSub.publish(EVENTS.EDITOR.TYPING_CODE, {typingCode: code});
      return code;
    }
  },

  Subscription: {
    typingCode: {
      subscribe: () => PostgresPubSub.asyncIterator(EVENTS.EDITOR.TYPING_CODE),
    },
  },
};

