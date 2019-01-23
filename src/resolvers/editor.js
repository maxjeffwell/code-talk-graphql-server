import PubSub, { EVENTS } from '../subscription';

export default {

  Query: {
    readCode: () => ({body: ``}),
  },

  Mutation: {
    typeCode: (root, args) => {
      const { code } = args;
      PubSub.publish(EVENTS.EDITOR.TYPING_CODE, {typingCode: code});
      return code;
    }
  },

  Subscription: {
    typingCode: {
      subscribe: () => PubSub.asyncIterator(EVENTS.EDITOR.TYPING_CODE),
    },
  },
};

