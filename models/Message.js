const mongoose = require("mongoose");
const {
  pending,
  solved,
  rejected,
  admin,
  moderator,
} = require("../utils/constants");

const { ObjectId } = mongoose.Schema.Types;

const messageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: [pending, solved, rejected],
      default: pending,
    },
    actionBy: {
      _id: false,
      userId: {
        type: ObjectId,
        ref: "User",
      },
      name: {
        type: String,
      },
      role: {
        type: String,
        enum: [admin, moderator],
      },
    },
  },
  {
    timestamps: true,
    strict: "throw",
  }
);

module.exports = mongoose.model("Message", messageSchema);
