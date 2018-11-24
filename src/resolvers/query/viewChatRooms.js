const ChatRoom = require('../../models/chatRoom');

module.exports = async(_, { id }) => {
  return ChatRoom.findOne({ where: { id } });
}

