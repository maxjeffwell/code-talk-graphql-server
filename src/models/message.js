const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  id: mongoose.Schema.Types.ObjectId,
  text: {
    type: String,
    required: true
  }
});

module.exports = mongoose.model('Message', messageSchema);

