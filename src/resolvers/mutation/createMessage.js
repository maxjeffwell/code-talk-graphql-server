const CreateMessage = require('../../models/message');

module.exports = async(root, args, context) => {
  const { text } = args.message;
  const message = await CreateMessage.create({ text });
  context.pubsub.publish('NEW_MESSAGE', { newMessage: message});
  return message;
};
