const mongoose = require('mongoose');

const CurrentUserSchema= new mongoose.Schema({
  id: mongoose.Schema.Types.ObjectId,
  username: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true
  }
});

module.exports = mongoose.model('CurrentUser', CurrentUserSchema);
