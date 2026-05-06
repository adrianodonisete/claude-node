const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const TICKERS = {
  petr3: { symbol: 'PETR3.SA', name: 'PETR3', displayName: 'Petrobras PN' },
  itub3: {
    symbol: 'ITUB3.SA',
    name: 'ITUB3',
    displayName: 'Ita\xfa Unibanco ON',
  },
  vale3: { symbol: 'VALE3.SA', name: 'VALE3', displayName: 'Vale ON' },
};

// 2025-01-01 to 2025-12-31 as unix timestamps
const PERIOD_START = Math.floor(new Date('2025-01-01').getTime() / 1000);
const PERIOD_END = Math.floor(new Date('2025-12-31T23:59:59').getTime() / 1000);

const FOREX_PAIRS = {
  brl: { symbol: 'BRL=X', name: 'USD/BRL', displayName: 'Dólar/Real' },
};

// Simple in-memory cache for forex rates (5-minute TTL)
const forexCache = new Map();
const FOREX_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCachedForex(pair) {
  const cached = forexCache.get(pair);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > FOREX_CACHE_TTL) {
    forexCache.delete(pair);
    return null;
  }
  return cached.data;
}

function setCachedForex(pair, data) {
  forexCache.set(pair, { data, timestamp: Date.now() });
}

function getDataPath(ticker) {
  return path.join(DATA_DIR, `${ticker}.json`);
}

function isCached(ticker) {
  return fs.existsSync(getDataPath(ticker));
}

async function fetchYahoo(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&period1=${PERIOD_START}&period2=${PERIOD_END}`;
  console.log(`Fetching data from Yahoo Finance: ${symbol}`);
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });
  if (!res.ok) {
    throw new Error(`Yahoo Finance returned HTTP ${res.status} for ${symbol}`);
  }
  const json = await res.json();
  const result = json.chart.result[0];

  if (!result.timestamp) {
    throw new Error(`No data returned from Yahoo for ${symbol}`);
  }

  const timestamps = result.timestamp;
  const quotes = result.indicators.quote[0];

  return timestamps
    .map((ts, i) => ({
      date: new Date(ts * 1000).toISOString().split('T')[0],
      open: quotes.open[i] ? +quotes.open[i].toFixed(2) : null,
      high: quotes.high[i] ? +quotes.high[i].toFixed(2) : null,
      close: quotes.close[i] ? +quotes.close[i].toFixed(2) : null,
      volume: quotes.volume[i] || 0,
    }))
    .filter((d) => d.close !== null);
}

app.get('/api/stocks/:ticker', async (req, res) => {
  const { ticker } = req.params;
  const refresh = req.query.refresh === 'true';
  const info = TICKERS[ticker];

  if (!info) {
    return res.status(404).json({
      error: `Ticker not found. Available: ${Object.keys(TICKERS).join(', ')}`,
    });
  }

  try {
    if (!isCached(ticker) || refresh) {
      const data = await fetchYahoo(info.symbol);
      fs.writeFileSync(getDataPath(ticker), JSON.stringify(data, null, 2));
      return res.json(data);
    }

    const cached = JSON.parse(fs.readFileSync(getDataPath(ticker), 'utf8'));
    res.json(cached);
  } catch (err) {
    console.error(`Error fetching data for ${ticker}:`, err.message);
    if (isCached(ticker)) {
      console.log('Returning stale cached data');
      const cached = JSON.parse(fs.readFileSync(getDataPath(ticker), 'utf8'));
      return res.json(cached);
    }
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/forex/:pair', async (req, res) => {
  const { pair } = req.params;
  const refresh = req.query.refresh === 'true';
  const info = FOREX_PAIRS[pair];

  if (!info) {
    return res.status(404).json({
      error: `Forex pair not found. Available: ${Object.keys(FOREX_PAIRS).join(', ')}`,
    });
  }

  try {
    // Check in-memory cache first
    if (!refresh) {
      const cached = getCachedForex(pair);
      if (cached) {
        return res.json(cached);
      }
    }

    // Fetch from Yahoo Finance using existing fetchYahoo function
    const data = await fetchYahoo(info.symbol);

    if (!data || data.length === 0) {
      throw new Error('No data returned from Yahoo Finance');
    }

    // Get the most recent data point
    const latest = data[data.length - 1];

    // Calculate daily change if we have at least 2 data points
    let change = null;
    let changePct = null;
    if (data.length >= 2) {
      const previous = data[data.length - 2];
      change = latest.close - previous.close;
      changePct = (change / previous.close) * 100;
    }

    const result = {
      pair: info.name,
      displayName: info.displayName,
      rate: latest.close,
      date: latest.date,
      timestamp: new Date().toISOString(),
      change: change ? +change.toFixed(4) : null,
      changePct: changePct ? +changePct.toFixed(2) : null,
    };

    // Cache the result
    setCachedForex(pair, result);

    res.json(result);
  } catch (err) {
    console.error(`Error fetching forex data for ${pair}:`, err.message);

    // Try to return cached data even if expired
    const staleCache = forexCache.get(pair);
    if (staleCache) {
      console.log('Returning stale cached forex data');
      res.json(Object.assign({}, staleCache.data, { stale: true }));
      return;
    }

    res.status(500).json({ error: err.message });
  }
});

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/api/indices', async (_req, res) => {
  // Mock indices data - in production, this would fetch from a real API
  const mockData = {
    selic: 10.75,
    ipca: 4.8,
    history: [
      { date: '2025-01', selic: 10.5, ipca: 4.2 },
      { date: '2025-02', selic: 10.6, ipca: 4.3 },
      { date: '2025-03', selic: 10.8, ipca: 4.5 },
      { date: '2025-04', selic: 10.7, ipca: 4.6 },
      { date: '2025-05', selic: 10.75, ipca: 4.7 },
      { date: '2025-06', selic: 10.7, ipca: 4.8 },
      { date: '2025-07', selic: 10.75, ipca: 4.8 },
      { date: '2025-08', selic: 10.75, ipca: 4.8 },
      { date: '2025-09', selic: 10.75, ipca: 4.8 },
      { date: '2025-10', selic: 10.75, ipca: 4.8 },
      { date: '2025-11', selic: 10.75, ipca: 4.8 },
      { date: '2025-12', selic: 10.75, ipca: 4.8 },
    ],
  };
  res.json(mockData);
});

app.use(express.static(__dirname));

app.listen(PORT, () => {
  console.log(`IBov Analyser running at http://localhost:${PORT}`);
  console.log(
    `Tickers available: ${Object.values(TICKERS)
      .map((t) => t.name)
      .join(', ')}`,
  );
  console.log(`Data directory: ${DATA_DIR}`);
});
