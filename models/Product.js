const mongoose = require("mongoose");
const validator = require("validator");
const { continued, discontinued } = require("../utils/constants");

const { ObjectId } = mongoose.Schema.Types;

const productSchema = new mongoose.Schema(
  {
    createdBy: {
      type: ObjectId,
      ref: "User",
    },

    title: {
      type: String,
      minLength: [3, "title at least 5 characters"],
      maxLength: [150, "title is too long"],
      trim: true,
      required: [true, "title is required!"],
    },
    slug: {
      type: String,
      unique: [true, "already exists"],
      // required: true,
    },

    description: {
      type: String,
      required: [true, "description  is required!"],
    },
    brand: {
      type: String,
      required: [true, "brand is required!"],
    },
    imgUrls: {
      type: [String],
      required: true,
      validate: {
        validator: (value) => {
          if (!Array.isArray(value) || value.length > 4) {
            return false;
          }

          value.forEach((url) => {
            if (!validator.isURL(url)) {
              return false;
            }
          });
          return true;
        },
        message: "Please provide valid image urls (maximum 4)",
      },
    },
    category: {
      type: String,
      enum: {
        values: [
          "Electronics",
          "Clothing",
          "Books",
          "Kitchen",
          "Toys",
          "Sports",
          "Gaming",
          "Others",
        ],
        message:
          "Invalid category. Please choose from Electronics, Clothing, Books, Home & Kitchen, Toys, Sports and Others.",
      },
      required: true,
    },
    price: {
      type: Number,
      required: true,
      cast: "Must be number",
    },
    sale: {
      type: Number,
      default: 0,
      max: [100, "Sale must be less than 100%"],
      required: true,
    },
    salePrice: {
      type: Number,
      default: 0,
      required: true,
    },
    tags: {
      type: [String],
      required: [true, "tags needed"],
      validate: {
        validator: function (value) {
          return value.length > 0;
        },
        message: "pls provide tags",
      },
    },
    stock: {
      type: Number,
      required: true,
    },
    views: {
      type: Number,
      required: true,
      default: 0,
    },
    review: [
      {
        type: ObjectId,
        ref: "Review",
      },
    ],
    averageRating: {
      userId: [{ type: ObjectId, ref: "User" }],

      rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
    },
    ratingDistribution: {
      0: { type: Number, default: 0 },
      1: { type: Number, default: 0 },
      2: { type: Number, default: 0 },
      3: { type: Number, default: 0 },
      4: { type: Number, default: 0 },
      5: { type: Number, default: 0 },
    },
    sold: {
      type: Number,
      default: 0,
      required: true,
    },
    status: {
      type: String,
      enum: {
        values: [continued, discontinued],
        message:
          "Invalid value: {VALUE}. Please choose from continued or discontinued.",
      },
      default: continued,
    },
  },
  {
    timestamps: true,
    strict: "throw",
  }
);

module.exports = mongoose.model("Product", productSchema);
