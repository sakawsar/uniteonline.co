const mongoose = require("mongoose");

const conversationSchema = mongoose.Schema({
  conversation_starter_email: {
    type: String,
    required: true,
    lowercase: true,
  },
  conversation_responder_email: {
    type: String,
    required: true,
    lowercase: true,
  },
});

const Conversation = mongoose.model("conversation", conversationSchema);

module.exports = Conversation;
