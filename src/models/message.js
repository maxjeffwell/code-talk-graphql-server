const mongoose = require('mongoose');
const User = require('./user');

const messageSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true
  },
  created_at: {
    type: Date,
    required: true,
    default: Date.now
  },
  sentBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: User
    }
});

module.exports = mongoose.model('Message', messageSchema);

