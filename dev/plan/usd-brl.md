# Implementation Plan: USD/BRL Exchange Rate Page

## Context

The user wants to add a new page to display the current USD to Brazilian Real (BRL) exchange rate. This addresses the need to quickly check currency conversion rates within the existing financial dashboard application. The requirement is to create a simple, focused page that shows only the current exchange rate without storing historical data, keeping implementation lightweight.

Currently, the application displays Brazilian stock data (PETR3, ITUB3, VALE3) with historical charts and analytics. Adding USD/BRL exchange rate complements this by providing forex data relevant to Brazilian financial markets.

## Requirements

1. Create new standalone page `usd_brl.html` in project root
2. Add navigation link in `index.html` menu
3. Display current USD/BRL exchange rate formatted as "R$ X,XX" (Brazilian format with comma)
4. Use existing `fetchYahoo()` function from `server.js` with Yahoo Finance symbol `BRL=X`
5. **No historical data storage** - only fetch and display latest value
6. Reuse existing CSS styling from `index.html` for visual consistency

## Implementation Approach

### Architecture

- **Backend**: New lightweight API endpoint `/api/forex/brl` that leverages existing `fetchYahoo()` function
- **Frontend**: New self-contained HTML page following `index.html` structure and styling
- **Data Flow**: Client → Express endpoint → Yahoo Finance API → Client display
- **Caching**: In-memory cache (5-minute TTL) to reduce Yahoo Finance API calls, no file persistence
- **Navigation**: Standard menu link in both pages for seamless navigation

### Critical Files

1. **[server.js](d:\Developer\work\apps\calc-node\server.js)** - Add forex configuration and endpoint
2. **[index.html](d:\Developer\work\apps\calc-node\index.html)** - Update navigation menu (line 178-183)
3. **usd_brl.html** (new file) - Exchange rate display page

## Detailed Implementation Steps

### Step 1: Backend Changes (server.js)

#### 1.1: Add Forex Configuration

**Location**: After line 17 (after `TICKERS` constant)

Add forex pairs configuration:

```javascript
const FOREX_PAIRS = {
    brl: { symbol: 'BRL=X', name: 'USD/BRL', displayName: 'Dólar/Real' },
};
```

#### 1.2: Add In-Memory Cache

**Location**: After line 21 (after `PERIOD_END` constant)

Add cache management for forex data:

```javascript
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
```

#### 1.3: Add Forex API Endpoint

**Location**: After line 88, before the root route `app.get('/', ...)`

Add new endpoint:

```javascript
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

        // Try to return cached data even if expired (stale data better than no data)
        const staleCache = forexCache.get(pair);
        if (staleCache) {
            console.log('Returning stale cached forex data');
            return res.json({ ...staleCache.data, stale: true });
        }

        res.status(500).json({ error: err.message });
    }
});
```

**Reused Function**: `fetchYahoo(symbol)` from lines 31-59 - no modifications needed

### Step 2: Frontend Page Creation (usd_brl.html)

**Location**: Create new file `d:\Developer\work\apps\calc-node\usd_brl.html`

**File Structure**:

1. Copy HTML structure and complete CSS from `index.html` (lines 1-174)
2. Add same menu navigation (lines 178-183) with new link
3. Create simplified content area with:
    - Large KPI card for exchange rate display
    - Last update timestamp
    - Daily change indicator (positive/negative colored)
    - Refresh button in header
    - Status bar for loading/error states
4. Add JavaScript for:
    - Fetch exchange rate from `/api/forex/brl`
    - Display formatted rate (Brazilian format: comma decimal)
    - Handle refresh button clicks
    - Status bar state management

**Key HTML Elements**:

```html
<!-- Large exchange rate display -->
<div class="kpi-card exchange-card">
    <div class="ticker">USD/BRL</div>
    <div class="price" id="exchange-rate">R$ --,--</div>
    <div class="change" id="change">--</div>
    <div class="update-info" id="update-date">--</div>
</div>
```

**Key JavaScript Functions**:

```javascript
// Fetch exchange rate from API
async function fetchExchangeRate(refresh = false) {
    setStatus('Buscando cotação...', 'loading');
    const url = refresh ? '/api/forex/brl?refresh=true' : '/api/forex/brl';
    // ... fetch and handle response
}

// Display rate with Brazilian formatting
function displayRate(data) {
    const formatted = `R$ ${data.rate.toFixed(2).replace('.', ',')}`;
    // ... update DOM elements
}
```

**Additional CSS Needed** (within `<style>` tag):

```css
.exchange-card {
    max-width: 400px;
    margin: 0 auto;
    padding: 24px;
}

.exchange-card .price {
    font-size: 48px;
    margin: 16px 0;
}

.update-info {
    font-size: 12px;
    color: #8899aa;
    margin-top: 8px;
}

.info-text {
    max-width: 600px;
    margin: 24px auto;
    padding: 16px;
    background: #152232;
    border: 1px solid #1e3a5f;
    border-radius: 8px;
    font-size: 14px;
    line-height: 1.6;
    color: #b0c4de;
}
```

### Step 3: Update Navigation Menu (index.html)

**Location**: [index.html](d:\Developer\work\apps\calc-node\index.html) line 178-183

**Change**:

```html
<!-- BEFORE -->
<nav class="menu">
    <a href="/" class="menu-link">Home</a>
    <a href="/indices" class="menu-link">Índices</a>
    <a href="https://finance.yahoo.com" target="_blank" class="menu-link">Yahoo Finance</a>
    <a href="https://statusinvest.com.br/" target="_blank" class="menu-link">Status Invest</a>
</nav>

<!-- AFTER -->
<nav class="menu">
    <a href="/" class="menu-link">Home</a>
    <a href="/usd_brl.html" class="menu-link">USD/BRL</a>
    <a href="/indices" class="menu-link">Índices</a>
    <a href="https://finance.yahoo.com" target="_blank" class="menu-link">Yahoo Finance</a>
    <a href="https://statusinvest.com.br/" target="_blank" class="menu-link">Status Invest</a>
</nav>
```

**Note**: The new link should also be added to the menu in `usd_brl.html` for consistent navigation from both pages.

## Error Handling

1. **Yahoo Finance API Failures**: Return cached data marked with `stale: true` flag, display warning to user
2. **Empty Data Response**: Validate data array length, provide meaningful error messages
3. **Rate Limiting**: In-memory cache with 5-minute TTL reduces API call frequency
4. **Network Errors**: Graceful fallback to last known cached value, status bar shows error state

## Verification Steps

### Backend Testing

```bash
# Start server
node server.js

# Test forex endpoint
curl http://localhost:3000/api/forex/brl

# Expected JSON response:
{
  "pair": "USD/BRL",
  "displayName": "Dólar/Real",
  "rate": 5.23,
  "date": "2026-05-02",
  "timestamp": "2026-05-03T14:30:00.000Z",
  "change": 0.0145,
  "changePct": 0.28
}

# Test cache (should return same data within 5 minutes)
curl http://localhost:3000/api/forex/brl

# Test force refresh
curl http://localhost:3000/api/forex/brl?refresh=true
```

### Frontend Testing

1. **Page Load**
    - Navigate to `http://localhost:3000/usd_brl.html`
    - Verify page displays with correct styling (dark theme, blue accents)
    - Check exchange rate loads and displays in format "R$ X,XX"
    - Verify status bar shows loading → success states

2. **Refresh Functionality**
    - Click "Atualizar dados" button
    - Verify button disables during fetch
    - Check status bar updates to loading state
    - Confirm new data displays after fetch completes

3. **Navigation**
    - From `index.html`, click "USD/BRL" menu link
    - Verify navigation to exchange rate page
    - From `usd_brl.html`, click "Home" menu link
    - Verify navigation back to dashboard

4. **Visual Consistency**
    - Compare styling between `index.html` and `usd_brl.html`
    - Verify same color scheme (background #0f1923, cards #152232)
    - Check menu styling matches (blue links, hover effects)
    - Verify positive change = green, negative change = red

5. **Edge Cases**
    - Test with server stopped → verify error message displays
    - Test cache behavior by waiting 5+ minutes between loads
    - Verify stale data warning if Yahoo Finance is unavailable
    - Check mobile responsive layout (if applicable)

6. **Data Formatting**
    - Verify Brazilian Real format: comma as decimal separator (5,23 not 5.23)
    - Check "R$" prefix appears correctly
    - Verify date displays in readable format
    - Confirm change percentage shows sign (+/-)

### Integration Testing

1. Full user flow: Home → USD/BRL page → Back to Home
2. Verify both pages share consistent navigation experience
3. Test multiple page loads to confirm caching works correctly
4. Monitor browser console for any JavaScript errors
5. Check Network tab to verify API calls are properly cached

## Success Criteria

✅ New page `usd_brl.html` created with complete styling and functionality  
✅ API endpoint `/api/forex/brl` returns current USD/BRL exchange rate  
✅ Exchange rate displayed in Brazilian format: "R$ X,XX"  
✅ Menu navigation updated in both `index.html` and `usd_brl.html`  
✅ In-memory caching reduces API calls (5-minute TTL)  
✅ No historical data saved to file system  
✅ Error handling with graceful fallbacks  
✅ Visual consistency with existing dashboard styling  
✅ All verification tests pass successfully

## Notes

- **No Database/File Storage**: Per user requirement, data is only cached in memory temporarily
- **Reused Pattern**: The `fetchYahoo()` function is reused without modification, maintaining code consistency
- **Forex Symbol**: `BRL=X` is the standard Yahoo Finance symbol for USD/BRL exchange rate
- **Future Extensions**: Easy to add more forex pairs by extending `FOREX_PAIRS` object
- **Performance**: Minimal impact on server (lightweight endpoint, efficient caching)
