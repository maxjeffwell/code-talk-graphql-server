module.exports = {
  subscribe: (root, args, context) => {
      return context.pubsub.asyncIterator('PUBSUB_NEW_MESSAGE');
    }
  };

