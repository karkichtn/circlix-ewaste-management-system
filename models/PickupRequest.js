const mongoose = require("mongoose");

const pickupRequestSchema = new mongoose.Schema({
  citizen: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    required: true
  },

  quantity: {
    type: Number,
    required: true,
    min: 1
  },

  approximateWeight: {
    type: Number,
    required: true,
    min: 0.1
  },

  area: {
    type: String,
    required: true,
    trim: true
  },

  address: {
    type: String,
    required: true,
    trim: true
  },

  preferredDate: {
    type: Date,
    required: true
  },

  assignedAgent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },

  status: {
    type: String,
    enum: [
      "Requested",
      "Scheduled",
      "Collected",
      "Recycled"
    ],
    default: "Requested"
  }

}, {
  timestamps: true
});

module.exports =
  mongoose.model(
    "PickupRequest",
    pickupRequestSchema
  );