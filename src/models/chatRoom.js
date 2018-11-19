const mongoose = require('mongoose');

const chatRoomSchema = new mongoose.Schema({
  id: {
    type: mongoose.Schema.Types.ObjectId
  },
  name: {
    type: String
  } ,
  description: {
    type: String
  }
});

module.exports = mongoose.model('ChatRoom', chatRoomSchema);
