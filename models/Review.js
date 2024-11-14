const mongoose = require("mongoose");
const validator = require("validator");

const { ObjectId } = mongoose.Schema.Types;

const reviewSchema = new mongoose.Schema({
  user: {
    type: ObjectId,
    required: true,
    ref: "User",
  },
  product: {
    type: ObjectId,
    required: true,
    ref: "Product",
  },
  rating: {
    type: Number,
    enum: [0, 1, 2, 3, 4, 5],
    default: 0,
  },
  comment: {
    type: String,
    maxLength: [250, "Not more than 250"],
    default: "",
  },
});

module.exports = mongoose.model("Reviews", reviewSchema);
