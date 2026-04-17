const mongoose = require("mongoose");

const PortfolioSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    symbol: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
    shares: {
      type: Number,
      required: true,
      min: 0
    },
    averageCost: {
      type: Number,
      required: true,
      min: 0
    }
  },
  { timestamps: true }
);

// Ensure a user only has one document per symbol
PortfolioSchema.index({ userId: 1, symbol: 1 }, { unique: true });

module.exports = mongoose.model("Portfolio", PortfolioSchema);
