import PubSub, { EVENTS } from '../subscription';

// Ultra-minimal editor resolver for maximum performance
export default {
  Query: {
    readCode: () => ({ body: '' })
  },

  Mutation: {
    typeCode: (root, args) => {
      const body = args.code?.body || '';
      
      // Publish immediately without any processing
      PubSub.publish(EVENTS.EDITOR.TYPING_CODE, { 
        typingCode: { body } 
      });
      
      return { body };
    }
  },

  Subscription: {
    typingCode: {
      subscribe: () => PubSub.asyncIterator(EVENTS.EDITOR.TYPING_CODE),
    },
  },
};