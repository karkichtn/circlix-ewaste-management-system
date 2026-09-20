const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  rewardPointsPerKg: { type: Number, required: true, min: 0 }
}, { timestamps: true });

module.exports = mongoose.model("Category", categorySchema);