const ChatRoom = require('../../models/chatRoom');

module.exports = async(_, { id }) => {
  return ChatRoom.find({ where: { id } });
}

