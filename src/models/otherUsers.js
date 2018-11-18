const mongoose = require('mongoose');

const otherUsersSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  }
});

module.exports = mongoose.model('otherUsers', otherUsersSchema);
