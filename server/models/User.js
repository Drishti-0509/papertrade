const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    balance: {
      type: Number,
      default: 100000, // Default paper trading balance
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
