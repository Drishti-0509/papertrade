const express = require("express");
const router = express.Router();

const ALPHA_VANTAGE_KEY = process.env.ALPHA_VANTAGE_KEY || "demo";
const BASE_URL = "https://www.alphavantage.co/query";

// In-memory cache to mitigate rate-limits for testing
const cache = {
  quotes: {},
  searches: {}
};

// GET /api/stocks/search/:keyword
router.get("/search/:keyword", async (req, res) => {
  try {
    const { keyword } = req.params;
    
    if (cache.searches[keyword]) {
      return res.json(cache.searches[keyword]);
    }

    const response = await fetch(`${BASE_URL}?function=SYMBOL_SEARCH&keywords=${keyword}&apikey=${ALPHA_VANTAGE_KEY}`);
    const data = await response.json();

    if (data.Information && data.Information.includes("rate limit")) {
       return res.status(429).json({ message: "Alpha Vantage rate limit exceeded." });
    }

    const matches = data.bestMatches || [];
    const results = matches.map(match => ({
      symbol: match["1. symbol"],
      name: match["2. name"],
      type: match["3. type"],
      region: match["4. region"]
    }));

    cache.searches[keyword] = results;
    res.json(results);
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ message: "Failed to search stocks" });
  }
});

// GET /api/stocks/quote/:symbol
router.get("/quote/:symbol", async (req, res) => {
  try {
    const { symbol } = req.params;

    if (cache.quotes[symbol] && Date.now() - cache.quotes[symbol].timestamp < 60000) {
      return res.json(cache.quotes[symbol].data);
    }

    // 1. Fetch Global Quote
    const quoteResponse = await fetch(`${BASE_URL}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_KEY}`);
    const quoteData = await quoteResponse.json();

    // Rate Limit check
    if (quoteData.Information && quoteData.Information.includes("rate limit")) {
       // Mock fallback so the user can test the UI anyway
       return res.json({
         symbol: symbol.toUpperCase(),
         price: (Math.random() * 200 + 50).toFixed(2),
         changePercent: (Math.random() * 5 - 2).toFixed(2) + "%",
         high: (Math.random() * 200 + 100).toFixed(2),
         low: (Math.random() * 200 + 20).toFixed(2),
         volume: Math.floor(Math.random() * 10000000),
         chartData: Array.from({length: 20}).map((_, i) => ({
             time: `Day ${i + 1}`,
             price: (Math.random() * 200 + 50).toFixed(2)
         })),
         isMocked: true
       });
    }

    const globalQuote = quoteData["Global Quote"] || {};

    // 2. Fetch Daily Time Series for line chart
    const timeResponse = await fetch(`${BASE_URL}?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${ALPHA_VANTAGE_KEY}`);
    const timeData = await timeResponse.json();

    let chartData = [];
    const series = timeData["Time Series (Daily)"];
    
    if (series) {
      // Get the last 30 days and reverse it to be chronological
      const dates = Object.keys(series).slice(0, 30).reverse();
      chartData = dates.map(date => ({
        time: date,
        price: parseFloat(series[date]["4. close"])
      }));
    }

    const result = {
      symbol: symbol.toUpperCase(),
      price: globalQuote["05. price"] || 0,
      changePercent: globalQuote["10. change percent"] || "0%",
      high: globalQuote["03. high"] || 0,
      low: globalQuote["04. low"] || 0,
      volume: globalQuote["06. volume"] || 0,
      chartData: chartData
    };

    cache.quotes[symbol] = {
      timestamp: Date.now(),
      data: result
    };

    res.json(result);

  } catch (error) {
    console.error("Quote error:", error);
    res.status(500).json({ message: "Failed to fetch quote" });
  }
});

module.exports = router;
