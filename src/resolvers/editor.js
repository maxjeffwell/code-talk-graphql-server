import PostgresPubSub, { EVENTS } from '../subscription';

export default {
  Subscription: {
    editorContentEdited: {
      subscribe: () => PostgresPubSub.asyncIterator(EVENTS.EDITOR.CONTENT),
    },
  },
};

