const mongoose = require("mongoose");
const validator = require("validator");
const { ObjectId } = mongoose.Schema.Types;
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const {
  moderator,
  admin,
  active,
  inactive,
  blocked,
  user,
  productManager,
} = require("../utils/constants");

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Please Provide full Name"],
      trim: true,
      validate: {
        validator: (value) => /^[a-zA-Z\s]+$/.test(value),
        message: "Name must only contain alphabetical characters",
      },

      minLength: [3, "Name at least 3 characters"],
      maxLength: [150, "Name is too long"],
    },
    email: {
      type: String,
      validate: [validator.isEmail, "Please provide a valid email"],

      trim: true,
      lowercase: true,
      unique: true,
      required: [true, "Email address is required!"],
    },

    password: {
      type: String,
      required: [true, "field required"],

      validate: {
        validator: (value) =>
          validator.isStrongPassword(value, {
            minLength: 6,
            minLowercase: 0,
            minNumbers: 0,
            minUppercase: 0,
            minSymbols: 0,
          }),
        message: "Password is not strong enough",
      },
    },
    confirmPassword: {
      type: String,
      required: [true, "Please confirm your password"],
      validate: {
        validator: function (value) {
          return value === this.password;
        },
        message: "Password do not matched",
      },
    },
    gender: {
      type: String,
      enum: {
        values: ["male", "female", "other"],
        message: "Invalid Data. Must be Male ,Female Or Other",
      },
      lowercase: true,
      required: [true, "field required"],
    },

    // imgUrl: {
    //   type: String,
    //   default: "",
    //   validate: {
    //     validator: (value) => {
    //       return value === "" || validator.isURL(value);
    //     },
    //     message: "Something went wrong, please try again, value: {VALUE}",
    //   },
    // },
    address: {
      type: String,
      default: "",
    },
    contactNumber: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      default: active,
      enum: {
        values: [active, inactive, blocked],
        message:
          "Invalid value: {VALUE}. Please Choose from active,inactive, blocked",
      },
    },
    role: {
      type: String,
      enum: {
        values: [user, moderator, admin, productManager],
        message:
          "Invalid value: {VALUE}. Please Choose from buyer,seller,moderator,admin",
      },
      default: user,
    },

    // cart: {
    //   products: [
    //     {
    //       productId: {
    //         type: ObjectId,
    //         ref: "Product",
    //         required: true,
    //       },
    //       title: {
    //         type: String,
    //         required: true,
    //       },
    //       price: {
    //         type: Number,
    //         required: true,
    //       },
    //       quantity: {
    //         type: Number,
    //         required: true,
    //       },
    //     },
    //   ],
    // },

    lastLogin: Date,

    confirmationToken: String,
    confirmationTokenExpires: Date,

    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
  },
  {
    timestamps: true,
    strict: "throw",
  }
);

userSchema.pre("save", function (next) {
  if (!this.isModified("password")) {
    //  only run if password is modified
    return next();
  }
  const password = this.password;
  const hashedPassword = bcrypt.hashSync(password);

  this.password = hashedPassword;

  this.confirmPassword = undefined;

  next();
});

userSchema.methods.comparePassword = function (password, hash) {
  return bcrypt.compareSync(password, hash);
};

userSchema.methods.hashedPassword = function (password) {
  return bcrypt.hashSync(password);
};

userSchema.methods.generateResetToken = function () {
  const token = crypto.randomBytes(32).toString("hex");
  this.passwordResetToken = token;

  const date = new Date();

  date.setMinutes(date.getMinutes() + 15); // 5 minutes
  this.passwordResetExpires = date;

  return token;
};

module.exports = mongoose.model("User", userSchema);
