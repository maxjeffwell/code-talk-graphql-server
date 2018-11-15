const Message = require('../../models/message');

module.exports = async(root, args, context) => {
  const { body, user } = args.message;
  const message = await Message.create({ body, user });
  context.pubsub.publish('NEW_MESSAGE', { newMessage: message});
  return message;
};
