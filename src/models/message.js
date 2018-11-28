const mongoose = require('mongoose');
const User = require('./user');

const messageSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true
  },
  username: {
    type: String
  },
  sentBy: {
    type: String,
    ref: User
    }
});

module.exports = mongoose.model('Message', messageSchema);

