const Message = require('../../models/message');

module.exports = async(root, args, context) => {
  const { text } = args.message;
  const message = await Message.create({ text });
  context.pubsub.publish('NEW_MESSAGE', { newMessage: message});
  return message;
};
