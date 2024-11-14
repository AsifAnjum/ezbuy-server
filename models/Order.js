const mongoose = require("mongoose");
const {
  pending,
  onTheWay,
  delivered,
  canceled,
  success,
  failed,
  reached,
  admin,
  moderator,
} = require("../utils/constants");

const { ObjectId } = mongoose.Schema.Types;

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: ObjectId,
      ref: "User",
      required: true,
    },
    userEmail: {
      type: String,
      required: true,
    },
    actionBy: {
      id: {
        type: ObjectId,
        ref: "User",
      },
      name: {
        type: String,
      },
      email: {
        type: String,
      },
      role: {
        type: String,
        enum: [admin, moderator],
      },
    },
    products: [
      {
        productId: {
          type: ObjectId,
          ref: "Product",
          required: true,
        },
        title: {
          type: String,
          required: true,
        },
        price: {
          type: Number,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
        },
      },
    ],

    couponCode: {
      type: String,
      default: "",
    },

    couponDiscount: {
      type: Number,
      default: 0,
    },

    totalAmount: {
      type: Number,
      required: true,
    },

    shippingAddress: {
      name: {
        type: String,
        default: "",
        required: true,
      },
      phone: {
        type: String,
        default: "",
        required: true,
      },
      streetAddress: {
        type: String,
        default: "",
        required: true,
      },
      city: {
        type: String,
        default: "",
        required: true,
      },
    },
    paymentDetails: {
      method: {
        type: String,
        enum: {
          values: ["cod", "online"],
          message: { value: "value must be cod or online" },
        },
        required: true,
      },
      transactionId: {
        type: String,
        default: "",
      },
      status: {
        type: String,
        enum: {
          values: [pending, success, failed],
          message: ["value must be pending,success,failed"],
        },
        default: "pending",
        required: true,
      },
    },
    shippingCharges: {
      type: Number,
      required: true,
      default: 0,
    },
    deliveryStatus: {
      type: String,
      enum: [pending, onTheWay, delivered, canceled, reached],
      default: pending,
      required: true,
    },
  },
  {
    timestamps: true,
    strict: "throw",
  }
);

module.exports = mongoose.model("Order", orderSchema);
