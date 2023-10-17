const mongoose = require("mongoose");

const messageSchema = mongoose.Schema({
  conversation_id: {
    type: String,
    required: true,
    lowercase: true,
  },
  message_from: {
    type: String,
    required: true,
    lowercase: true,
  },
  message_to: {
    type: String,
    required: true,
    lowercase: true,
  },
  message: {
    type: String,
    required: true,
    lowercase: true,
  },
});

const Message = mongoose.model("message", messageSchema);

module.exports = Message;
