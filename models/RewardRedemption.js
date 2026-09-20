const mongoose = require("mongoose");

const rewardRedemptionSchema = new mongoose.Schema({
  citizen: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  rewardName: {
    type: String,
    required: true,
    trim: true
  },

  points: {
    type: Number,
    required: true,
    min: 1
  }
}, { timestamps: true });

module.exports = mongoose.model("RewardRedemption", rewardRedemptionSchema);