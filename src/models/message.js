const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true
  },
  username: {
    type: String
  }
});

module.exports = mongoose.model('Message', messageSchema);

