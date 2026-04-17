const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const User = require("../models/User");
const Portfolio = require("../models/Portfolio");

// @route   GET /api/portfolio
// @desc    Get user's portfolio
// @access  Private
router.get("/", auth, async (req, res) => {
  try {
    const portfolio = await Portfolio.find({ userId: req.user.id }).sort({ symbol: 1 });
    res.json(portfolio);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @route   POST /api/portfolio/buy
// @desc    Buy shares of a stock
// @access  Private
router.post("/buy", auth, async (req, res) => {
  const { symbol, shares, price } = req.body;

  if (!symbol || !shares || !price || shares <= 0 || price <= 0) {
    return res.status(400).json({ message: "Invalid trade parameters" });
  }

  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const totalCost = shares * price;

    if (user.balance < totalCost) {
      return res.status(400).json({ message: "Insufficient buying power" });
    }

    // Deduct balance
    user.balance -= totalCost;
    await user.save();

    // Upsert portfolio holding
    let holding = await Portfolio.findOne({ userId: req.user.id, symbol: symbol.toUpperCase() });

    if (holding) {
      // Calculate new average cost
      const totalOldCost = holding.shares * holding.averageCost;
      const newTotalCost = totalOldCost + totalCost;
      const newTotalShares = holding.shares + shares;
      
      holding.shares = newTotalShares;
      holding.averageCost = newTotalCost / newTotalShares;
      await holding.save();
    } else {
      holding = new Portfolio({
        userId: req.user.id,
        symbol: symbol.toUpperCase(),
        shares: shares,
        averageCost: price
      });
      await holding.save();
    }

    res.json({ balance: user.balance, holding });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @route   POST /api/portfolio/sell
// @desc    Sell shares of a stock
// @access  Private
router.post("/sell", auth, async (req, res) => {
  const { symbol, shares, price } = req.body;

  if (!symbol || !shares || !price || shares <= 0 || price <= 0) {
    return res.status(400).json({ message: "Invalid trade parameters" });
  }

  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const holding = await Portfolio.findOne({ userId: req.user.id, symbol: symbol.toUpperCase() });

    if (!holding || holding.shares < shares) {
      return res.status(400).json({ message: "Insufficient shares to sell" });
    }

    const totalValue = shares * price;

    // Add to balance
    user.balance += totalValue;
    await user.save();

    // Deduct shares or remove holding if 0
    holding.shares -= shares;

    if (holding.shares === 0) {
      await Portfolio.findByIdAndDelete(holding._id);
      res.json({ balance: user.balance, holding: null });
    } else {
      await holding.save();
      res.json({ balance: user.balance, holding });
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
