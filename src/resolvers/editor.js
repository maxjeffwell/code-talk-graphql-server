import PostgresPubSub, { EVENTS } from '../subscription';

export default {
  Subscription: {
    editorContent: {
      subscribe: () => PostgresPubSub.asyncIterator(EVENTS.EDITOR.CONTENT),
    },
  },
};

