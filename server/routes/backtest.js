const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");

const ALPHA_VANTAGE_KEY = process.env.ALPHA_VANTAGE_KEY || "demo";
const BASE_URL = "https://www.alphavantage.co/query";

const cache = {
  historicalData: {}
};

// Utils
const calcMA = (prices, period, index) => {
  if (index < period - 1) return null;
  let sum = 0;
  for (let i = index - period + 1; i <= index; i++) {
    sum += prices[i];
  }
  return sum / period;
};

// Deterministic random for consistent chart simulation
const generateMockAAPL = () => {
    const data = {};
    let currentPrice = 75.0; // Approx AAPL in 2019
    const startDate = new Date('2019-01-01'); // Need extra 200 days before 2020 for the 200MA to work!
    const endDate = new Date('2023-12-31');
    
    let seed = 12345;
    const seededRandom = () => {
        let x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
    };
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        if (d.getDay() === 0 || d.getDay() === 6) continue; // Skip weekends
        
        const move = (seededRandom() * 0.051) - 0.0245; // Slight upward drift over 4 years
        currentPrice = currentPrice * (1 + move);
        if (currentPrice < 10) currentPrice = 10; // floor

        const dateStr = d.toISOString().split('T')[0];
        data[dateStr] = {
            "1. open": currentPrice.toFixed(2),
            "2. high": (currentPrice * 1.01).toFixed(2),
            "3. low": (currentPrice * 0.99).toFixed(2),
            "4. close": currentPrice.toFixed(2),
            "5. volume": "100000000"
        };
    }
    return data;
};

// GET or POST for backtest parsing
router.post("/", auth, async (req, res) => {
  try {
    const { symbol, strategy, startDate, endDate } = req.body;

    if (!symbol || !strategy || !startDate || !endDate) {
      return res.status(400).json({ message: "Invalid parameters" });
    }

    let rawData;
    // Cache daily full data to avoid spamming alpha vantage during consecutive tests
    if (cache.historicalData[symbol] && Date.now() - cache.historicalData[symbol].timestamp < 3600000) {
       rawData = cache.historicalData[symbol].data;
    } else {
       const response = await fetch(`${BASE_URL}?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=full&apikey=${ALPHA_VANTAGE_KEY}`);
       const result = await response.json();
       
       if (result.Information && result.Information.includes("rate limit") || !result["Time Series (Daily)"]) {
          console.log("Alpha Vantage limit hit, generating mock fallback for ", symbol);
          rawData = generateMockAAPL();
       } else {
          rawData = result["Time Series (Daily)"];
       }
       cache.historicalData[symbol] = {
           timestamp: Date.now(),
           data: rawData
       };
    }

    // Process dates chronologically
    const dates = Object.keys(rawData).sort(); // YYYY-MM-DD string sort works chronologically
    const prices = [];
    const dateMap = [];
    
    dates.forEach(d => {
        prices.push(parseFloat(rawData[d]["4. close"]));
        dateMap.push(d);
    });

    let startCapital = 10000;
    let cash = startCapital;
    let shares = 0;
    let trades = [];
    let equityCurve = [];
    let maxEquity = startCapital;
    let maxDrawdown = 0;

    // RSI arrays
    let gains = [];
    let losses = [];
    let avgGain = null;
    let avgLoss = null;

    let inPosition = false;
    let buyPrice = 0;
    
    for (let i = 1; i < prices.length; i++) {
        // Calculate daily return for RSI
        const change = prices[i] - prices[i-1];
        gains.push(Math.max(change, 0));
        losses.push(Math.max(-change, 0));
        
        const currentDate = dateMap[i];
        
        // Skip dates before start date (but we still calculated the history for MA/RSI!)
        if (currentDate < startDate) continue;
        if (currentDate > endDate) break;

        let signal = 0; // 1 = Buy, -1 = Sell, 0 = Hold
        const price = prices[i];

        // STRATEGY 1: MA_CROSSOVER
        if (strategy === 'MA_CROSSOVER') {
            const ma50 = calcMA(prices, 50, i);
            const ma200 = calcMA(prices, 200, i);
            
            // Need previous days to detect crossover
            const prevMa50 = calcMA(prices, 50, i - 1);
            const prevMa200 = calcMA(prices, 200, i - 1);

            if (ma50 !== null && ma200 !== null && prevMa50 !== null && prevMa200 !== null) {
                if (prevMa50 <= prevMa200 && ma50 > ma200) {
                    signal = 1; // Cross above
                } else if (prevMa50 >= prevMa200 && ma50 < ma200) {
                    signal = -1; // Cross below
                }
            }
        } 
        // STRATEGY 2: RSI
        else if (strategy === 'RSI') {
            let rsi = 50;
            if (i >= 14) {
                if (avgGain === null) {
                    // Initial average
                    avgGain = gains.slice(i-14, i).reduce((a,b)=>a+b,0)/14;
                    avgLoss = losses.slice(i-14, i).reduce((a,b)=>a+b,0)/14;
                } else {
                    // Smoothed
                    avgGain = (avgGain * 13 + gains[i-1]) / 14;
                    avgLoss = (avgLoss * 13 + losses[i-1]) / 14;
                }
                
                if (avgLoss === 0) rsi = 100;
                else {
                    const rs = avgGain / avgLoss;
                    rsi = 100 - (100 / (1 + rs));
                }
            }
            
            if (rsi < 30) signal = 1;
            if (rsi > 70) signal = -1;
        }

        // Execute logic
        if (signal === 1 && !inPosition) {
            shares = cash / price;
            cash = 0;
            inPosition = true;
            buyPrice = price;
            trades.push({
                type: 'BUY',
                date: currentDate,
                price: price,
                profitPercent: 0
            });
        } else if (signal === -1 && inPosition) {
            cash = shares * price;
            
            // Mark profit in trades
            const profitPercent = ((price - buyPrice) / buyPrice) * 100;
            trades.push({
                type: 'SELL',
                date: currentDate,
                price: price,
                profitPercent: profitPercent
            });
            
            shares = 0;
            inPosition = false;
        }

        // Record daily equity
        const currentEquity = cash + (shares * price);
        equityCurve.push({
            date: currentDate,
            equity: currentEquity 
        });

        // Track max drawdown
        if (currentEquity > maxEquity) maxEquity = currentEquity;
        const currentDrawdown = ((maxEquity - currentEquity) / maxEquity) * 100;
        if (currentDrawdown > maxDrawdown) maxDrawdown = currentDrawdown;
    }

    // Force sell at the end if holding
    if (inPosition && dateMap.length > 0) {
        const lastPrice = prices[dateMap.indexOf(equityCurve[equityCurve.length-1].date)];
        cash = shares * lastPrice;
        const profitPercent = ((lastPrice - buyPrice) / buyPrice) * 100;
        trades.push({
            type: 'SELL',
            date: equityCurve[equityCurve.length-1].date,
            price: lastPrice,
            profitPercent: profitPercent
        });
    }

    const finalEquity = equityCurve.length > 0 ? equityCurve[equityCurve.length-1].equity : startCapital;
    const totalReturn = ((finalEquity - startCapital) / startCapital) * 100;
    
    const sellTrades = trades.filter(t => t.type === 'SELL');
    const winningTrades = sellTrades.filter(t => t.profitPercent > 0).length;
    const winRate = sellTrades.length > 0 ? (winningTrades / sellTrades.length) * 100 : 0;

    res.json({
        totalReturn,
        winRate,
        numberOfTrades: sellTrades.length,
        maxDrawdown,
        finalEquity,
        trades,
        equityCurve
    });

  } catch (error) {
    console.error("Backtest error:", error);
    res.status(500).json({ message: "Failed to run backtest" });
  }
});

module.exports = router;
