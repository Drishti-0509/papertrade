const express = require('express');
const router = express.Router();
const axios = require('axios');

router.get('/:symbol', async (req, res) => {
    const { symbol } = req.params;
    const key = process.env.FINNHUB_KEY;

    const positiveWords = ['buy', 'growth', 'profit', 'surge', 'up', 'gain', 'rise', 'strong', 'beat', 'high'];
    const negativeWords = ['sell', 'loss', 'crash', 'drop', 'down', 'risk', 'fall', 'weak', 'miss', 'low'];

    try {
        const to = new Date().toISOString().split('T')[0];
        const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const response = await axios.get(
            `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${from}&to=${to}&token=${key}`
        );

        const headlines = response.data.slice(0, 10);
        let totalScore = 0;

        const scored = headlines.map(article => {
            const text = article.headline.toLowerCase();
            let score = 0;
            positiveWords.forEach(w => { if (text.includes(w)) score += 1; });
            negativeWords.forEach(w => { if (text.includes(w)) score -= 1; });
            totalScore += score;
            return { headline: article.headline, score, url: article.url };
        });

        const label = totalScore > 0 ? 'Bullish' : totalScore < 0 ? 'Bearish' : 'Neutral';

        res.json({ symbol, score: totalScore, label, headlines: scored });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch sentiment' });
    }
});

module.exports = router;