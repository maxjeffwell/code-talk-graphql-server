const mongoose  = require('mongoose');

const UserSchema = new mongoose.Schema({
  id: mongoose.Schema.Types.ObjectId,
  username: {
    type: String,
    unique: true,
    required: true
  },

  email: {
    type: String,
    required: true
  },

  password: {
    type: String,
    required: true
  },
  messages: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  }]

});

module.exports = mongoose.model('User', UserSchema);
