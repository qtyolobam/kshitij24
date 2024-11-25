const mongoose = require("mongoose");

const betSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  eventType: {
    type: String,
    enum: ["USP", "FLAGSHIP", "POPULAR", "OTHERS"],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  category: {
    type: String,
    required: false,
  },
});

const betModel = mongoose.model("Bet", betSchema);
module.exports = betModel;
