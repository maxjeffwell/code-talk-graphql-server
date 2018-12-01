const mongoose  = require('mongoose');
// const Message = require('./message');

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
  }
});

module.exports = mongoose.model('User', UserSchema);
