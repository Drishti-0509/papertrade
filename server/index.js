require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const sentimentRoutes = require("./routes/sentiment");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

const watchedSymbols = new Set();
const mockPrices = {};

io.on("connection", (socket) => {
  socket.on("subscribe", (symbols) => {
    if (Array.isArray(symbols)) {
      symbols.forEach(s => watchedSymbols.add(s));
    }
  });
});

setInterval(() => {
  watchedSymbols.forEach(symbol => {
    if (!mockPrices[symbol]) {
      mockPrices[symbol] = 100 + Math.random() * 50;
    }
    const changePct = (Math.random() * 0.02 - 0.01);
    const changeAmount = mockPrices[symbol] * changePct;
    mockPrices[symbol] += changeAmount;

    io.emit("price_update", {
      symbol,
      price: mockPrices[symbol].toFixed(2),
      change: changeAmount.toFixed(2)
    });
  });
}, 15000);

// Middleware
app.use(express.json());
app.use(cors({ origin: "*" }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/stocks", require("./routes/stocks"));
app.use("/api/portfolio", require("./routes/portfolio"));
app.use("/api/backtest", require("./routes/backtest"));
app.use("/api/sentiment", sentimentRoutes);

// Test route
app.get("/", (req, res) => {
  res.send("Trading Platform API is running");
});

// Database + Server
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB via Mongoose");
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err);
  });