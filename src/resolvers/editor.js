import PostgresPubSub, { EVENTS } from '../subscription';

export default {

  Query: {
    readCode: () => ({body: ``}),
    info: () => { `GraphQL implementation of Jeff CodeEditor`},
  },

  Mutation: {
    typeCode: (root, { code }, context) => {
      context.PostgresPubSub.publish(EVENTS.EDITOR.TYPING_CODE,
        {typingCode: code});
      return code;
    }
  },

  Subscription: {
    typingCode: {
      subscribe: () => PostgresPubSub.asyncIterator(EVENTS.EDITOR.TYPING_CODE),
    },
  },
};

