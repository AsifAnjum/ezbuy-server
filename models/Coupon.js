const mongoose = require("mongoose");
const { active, blocked } = require("../utils/constants");

const { ObjectId } = mongoose.Schema.Types;

const couponSchema = new mongoose.Schema(
  {
    createdBy: {
      type: ObjectId,
      ref: "User",
      required: true,
    },
    code: {
      type: String,
      unique: true,
      maxLength: [40, "Code must be less than 40 characters"],
      required: true,
      validate: {
        validator: function (value) {
          return /^\S+$/.test(value); // Ensures no spaces
        },
        message: "Code must be a single word",
      },
    },
    discount: {
      type: Number,
      min: [0, "Discount cannot be less than 0"],
      max: [100, "Discount cannot be more than 100"],
      required: true,
    },
    status: {
      type: String,
      enum: [active, blocked],
      default: active,
    },
    expiryDate: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 10 * 60 * 1000),
      validate: {
        validator: function (value) {
          return value > new Date();
        },
        message: "Expiry date must be in the future",
      },
    },

    used: {
      type: Number,
      default: 0,
    },
    stock: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
    strict: "throw",
  }
);

module.exports = mongoose.model("coupon", couponSchema);
