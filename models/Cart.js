const mongoose = require("mongoose");

const { ObjectId } = mongoose.Schema.Types;

const cartSchema = new mongoose.Schema(
  {
    userId: {
      type: ObjectId,
      ref: "User",
      required: true,
    },
    products: [
      {
        _id: false,
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
        img: {
          type: String,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: true,
    strict: "throw",
  }
);

cartSchema.pre("save", function (next) {
  const totalAmount = this.products.reduce((acc, product) => {
    return acc + product.price * product.quantity;
  }, 0);

  this.totalAmount = +totalAmount.toFixed(2); // toFixed returns a string, so convert it back to a number using the + operator
  next();
});

module.exports = mongoose.model("Cart", cartSchema);
