const mongoose = require("mongoose");

const questionnaireSchema = mongoose.Schema({
  user_id: {
    type: String,
    required: true,
  },
  questions: {
    type: String,
  },
  answers: {
    type: String,
  },
});

const Questionnaire = mongoose.model("questionnaire", questionnaireSchema);

module.exports = Questionnaire;
