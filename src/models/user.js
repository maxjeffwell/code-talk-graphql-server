const mongoose  = require('mongoose');

const UserSchema = new mongoose.Schema({
  id: mongoose.Schema.Types.ObjectId,
  username: {
    type: String,
  },
  email: {
    type: String,
  },
  password: {
    type: String,
    required: true
  },
  messages: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'message'
  }]
});

module.exports = mongoose.model('User', UserSchema);
