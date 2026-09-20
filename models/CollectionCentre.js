const mongoose = require("mongoose");

const collectionCentreSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  area: { type: String, required: true, trim: true },
  address: { type: String, required: true, trim: true },
  contact: { type: String, default: "" }
}, { timestamps: true });

module.exports = mongoose.model("CollectionCentre", collectionCentreSchema);