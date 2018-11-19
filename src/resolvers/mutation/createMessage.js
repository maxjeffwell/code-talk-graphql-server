const Message = require('../../models/message');

module.exports = async(_, { message }, { pubsub }) => {
  const dbMessage = await Message.create({ ...message });
  pubsub.publish('PUBSUB_NEW_MESSAGE', { newMessage: dbMessage });
  return true;
};
