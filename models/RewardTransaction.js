const mongoose = require("mongoose");

const rewardTransactionSchema = new mongoose.Schema({
  citizen: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  pickupRequest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "PickupRequest",
    required: true,
    unique: true
  },
  points: { type: Number, required: true },
  type: {
    type: String,
    enum: ["credit", "redeem"],
    default: "credit"
  },
  description: { type: String, default: "" }
}, { timestamps: true });

module.exports = mongoose.model("RewardTransaction", rewardTransactionSchema);