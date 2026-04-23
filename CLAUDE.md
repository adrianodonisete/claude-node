# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

This is a Node.js web application using Express for the backend and Chart.js for frontend visualizations. The app displays financial index data (stocks and indices) with a dashboard-style interface.

### Key Components
- **server.js**: Express backend with API endpoints for stock and index data
- **index.html**: Single-page application with Chart.js visualizations
- **data/**: JSON cache files for stock historical data (petr3.json, itub3.json, vale3.json)
- **data/indices data**: JSON cache for index data (selic, ipca)

### API Endpoints
- `GET /` - Serves the main HTML page
- `GET /api/stocks/:ticker` - Returns historical stock data (with caching)
- `GET /api/indices` - Returns index data (selic, ipca with history)
- `GET /api/stocks/:ticker?refresh=true` - Forces refresh of stock data from Yahoo Finance

## Development Commands

### Setup
```bash
# Install dependencies
npm install

# Start the server
node server.js
```

### Testing
The application uses mock data in the `data/` directory. Tests can be run by:
```bash
# Start server and manually test endpoints
node server.js
# Then use curl or browser to test:
# http://localhost:3000
# http://localhost:3000/api/stocks/petr3
# http://localhost:3000/api/indices
```

### Data Management
- Stock data is cached in `data/*.json` files
- To clear cache, delete files in `data/` directory
- Indices data is generated dynamically in the backend

## File Patterns

### Backend (server.js)
- Uses Express static file serving for `index.html`
- Implements caching with `isCached()` and file system checks
- Error handling returns cached data when available
- Yahoo Finance API integration via Node fetch

### Frontend (index.html)
- Single HTML file with inline JavaScript
- Uses Chart.js via CDN for all visualizations
- Responsive grid layout for charts
- Dynamic data fetching from backend API
- State management with `stockData` and `charts` objects
- Reusable chart rendering functions for individual stocks and comparisons

## Best Practices

1. **Data Caching**: Always check `isCached()` before fetching from Yahoo Finance
2. **Error Handling**: Return stale cached data if API fails
3. **Chart Management**: Destroy old chart instances before creating new ones
4. **Responsive Design**: Use CSS Grid with `auto-fit` and `minmax()` for responsive layouts
5. **Modular Functions**: Break down rendering into reusable functions (e.g., `renderStockChart`, `calcKPI`)

## Common Operations

### Adding New Tickers
1. Add to `TICKERS` object in server.js
2. No frontend changes needed - the dashboard is dynamic

### Adding New Indices
1. Add to `INDICES` arrays in index.html JavaScript
2. Update mock data in server.js `/api/indices` endpoint
3. Add color and name mappings in index.html

### Refreshing Data
- Use `?refresh=true` query parameter to force refresh
- Frontend has built-in refresh button that reloads all data