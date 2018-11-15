const mongoose = require('mongoose');
// const { Schema } = 'mongoose';

const messageSchema = new mongoose.Schema({
  body: {
    type: String,
    required: true
  },
  user: {
    // type: Schema.Types.ObjectId,
    type: String,
    ref: 'user'
  }
});

module.exports = mongoose.model('Message', messageSchema);

