Summary: **VERIFIED_PLAYBOOK**

**DISCLAIMER: This is a newly created playbook based on research. It has not been verified through testing and may require adjustments during implementation.**

# CoinGecko API Integration Playbook

## Required API Key

- **CoinGecko API Key**: Required for Demo plan (30 calls/minute)
- **Obtain from**: https://www.coingecko.com/en/api/pricing
- **Free tier**: 5-15 calls/minute (may hit rate limits quickly)
- **Demo plan**: 30 calls/minute (recommended for your use case)

## Installation

```bash
# Backend dependencies
pip install fastapi uvicorn pycoingecko python-dotenv httpx redis

# Frontend dependencies (in React project)
npm install axios

```

## Backend Implementation (FastAPI)

### 1. Environment Setup

Create `.env` file:

```
COINGECKO_API_KEY=your_demo_key_here
RATE_LIMIT=30
REDIS_URL=redis://localhost:6379

```

### 2. Core API Implementation

```python
# main.py
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pycoingecko import CoinGeckoAPI
import os
import redis
import json
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Crypto Market Data API")

# CORS middleware for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["<http://localhost:3000>"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize CoinGecko client
cg = CoinGeckoAPI(api_key=os.getenv('COINGECKO_API_KEY'))

# Redis for caching
redis_client = redis.Redis.from_url(os.getenv('REDIS_URL', 'redis://localhost:6379'))

@app.get("/api/crypto/price/{coin_id}")
async def get_real_time_price(coin_id: str):
    """Get current price for a cryptocurrency"""
    cache_key = f"price:{coin_id}"

    # Check cache first (30 second TTL)
    cached = redis_client.get(cache_key)
    if cached:
        return json.loads(cached)

    try:
        data = cg.get_price(
            ids=coin_id,
            vs_currencies='usd',
            include_24hr_change=True,
            include_market_cap=True,
            include_24hr_vol=True
        )

        if coin_id not in data:
            raise HTTPException(status_code=404, detail="Cryptocurrency not found")

        result = {
            "coin_id": coin_id,
            "price_usd": data[coin_id]['usd'],
            "price_change_24h": data[coin_id].get('usd_24h_change', 0),
            "market_cap": data[coin_id].get('usd_market_cap', 0),
            "volume_24h": data[coin_id].get('usd_24h_vol', 0),
            "last_updated": datetime.now().isoformat()
        }

        # Cache for 30 seconds
        redis_client.setex(cache_key, 30, json.dumps(result))
        return result

    except Exception as e:
        raise HTTPException(status_code=429, detail=f"API Error: {str(e)}")

@app.get("/api/crypto/historical/{coin_id}")
async def get_historical_data(coin_id: str, days: int = 30):
    """Get historical price data"""
    cache_key = f"historical:{coin_id}:{days}"

    # Check cache (5 minute TTL for historical data)
    cached = redis_client.get(cache_key)
    if cached:
        return json.loads(cached)

    try:
        data = cg.get_coin_market_chart_by_id(
            id=coin_id,
            vs_currency='usd',
            days=days
        )

        result = {
            "coin_id": coin_id,
            "days": days,
            "prices": data['prices'],
            "market_caps": data['market_caps'],
            "total_volumes": data['total_volumes']
        }

        # Cache for 5 minutes
        redis_client.setex(cache_key, 300, json.dumps(result))
        return result

    except Exception as e:
        raise HTTPException(status_code=429, detail=f"API Error: {str(e)}")

@app.get("/api/crypto/trending")
async def get_trending_coins():
    """Get trending cryptocurrencies"""
    cache_key = "trending"

    cached = redis_client.get(cache_key)
    if cached:
        return json.loads(cached)

    try:
        data = cg.get_search_trending()
        result = {
            "trending_coins": [
                {
                    "id": coin['item']['id'],
                    "name": coin['item']['name'],
                    "symbol": coin['item']['symbol'],
                    "market_cap_rank": coin['item']['market_cap_rank']
                }
                for coin in data['coins'][:10]
            ]
        }

        # Cache for 10 minutes
        redis_client.setex(cache_key, 600, json.dumps(result))
        return result

    except Exception as e:
        raise HTTPException(status_code=429, detail=f"API Error: {str(e)}")

@app.get("/api/crypto/top-coins")
async def get_top_coins(limit: int = 10):
    """Get top cryptocurrencies by market cap"""
    cache_key = f"top_coins:{limit}"

    cached = redis_client.get(cache_key)
    if cached:
        return json.loads(cached)

    try:
        data = cg.get_coins_markets(
            vs_currency='usd',
            order='market_cap_desc',
            per_page=limit,
            page=1,
            sparkline=False,
            price_change_percentage='24h'
        )

        result = {
            "top_coins": [
                {
                    "id": coin['id'],
                    "name": coin['name'],
                    "symbol": coin['symbol'],
                    "current_price": coin['current_price'],
                    "market_cap": coin['market_cap'],
                    "market_cap_rank": coin['market_cap_rank'],
                    "price_change_percentage_24h": coin['price_change_percentage_24h'],
                    "total_volume": coin['total_volume']
                }
                for coin in data
            ]
        }

        # Cache for 2 minutes
        redis_client.setex(cache_key, 120, json.dumps(result))
        return result

    except Exception as e:
        raise HTTPException(status_code=429, detail=f"API Error: {str(e)}")

# Rate limiting middleware
@app.middleware("http")
async def rate_limiter(request: Request, call_next):
    client_ip = request.client.host
    rate_limit_key = f"rate_limit:{client_ip}"

    current_requests = redis_client.incr(rate_limit_key)
    if current_requests == 1:
        redis_client.expire(rate_limit_key, 60)  # Reset every minute

    if current_requests > int(os.getenv('RATE_LIMIT', 30)):
        raise HTTPException(status_code=429, detail="Rate limit exceeded")

    response = await call_next(request)
    return response

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

```

## Frontend Implementation (React)

### 1. API Service

```jsx
// src/services/cryptoApi.js
import axios from 'axios';

const API_BASE_URL = '<http://localhost:8000/api/crypto>';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 429) {
      console.warn('Rate limit exceeded, retrying in 60 seconds...');
    }
    return Promise.reject(error);
  }
);

export const cryptoApi = {
  getPrice: (coinId) => api.get(`/price/${coinId}`),
  getHistoricalData: (coinId, days = 30) => api.get(`/historical/${coinId}?days=${days}`),
  getTrendingCoins: () => api.get('/trending'),
  getTopCoins: (limit = 10) => api.get(`/top-coins?limit=${limit}`),
};

```

### 2. Real-time Price Component

```jsx
// src/components/PriceTracker.js
import React, { useEffect, useState } from 'react';
import { cryptoApi } from '../services/cryptoApi';

export default function PriceTracker({ coinId }) {
  const [priceData, setPriceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let interval;

    const fetchPrice = async () => {
      try {
        const { data } = await cryptoApi.getPrice(coinId);
        setPriceData(data);
        setError(null);
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to fetch price');
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchPrice();

    // Set up polling every 30 seconds
    interval = setInterval(fetchPrice, 30000);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [coinId]);

  if (loading) return <div>Loading price data...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!priceData) return <div>No data available</div>;

  const priceChangeColor = priceData.price_change_24h >= 0 ? 'green' : 'red';

  return (
    <div className="price-tracker">
      <h3>{coinId.toUpperCase()}</h3>
      <div className="price">${priceData.price_usd?.toFixed(2)}</div>
      <div className="change" style={{ color: priceChangeColor }}>
        24h: {priceData.price_change_24h?.toFixed(2)}%
      </div>
      <div className="market-cap">
        Market Cap: ${priceData.market_cap?.toLocaleString()}
      </div>
      <div className="volume">
        24h Volume: ${priceData.volume_24h?.toLocaleString()}
      </div>
      <div className="last-updated">
        Last updated: {new Date(priceData.last_updated).toLocaleTimeString()}
      </div>
    </div>
  );
}

```

### 3. Top Coins Dashboard

```jsx
// src/components/TopCoinsDashboard.js
import React, { useEffect, useState } from 'react';
import { cryptoApi } from '../services/cryptoApi';

export default function TopCoinsDashboard() {
  const [topCoins, setTopCoins] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTopCoins = async () => {
      try {
        const { data } = await cryptoApi.getTopCoins(10);
        setTopCoins(data.top_coins);
      } catch (error) {
        console.error('Failed to fetch top coins:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTopCoins();

    // Refresh every 2 minutes
    const interval = setInterval(fetchTopCoins, 120000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div>Loading top cryptocurrencies...</div>;

  return (
    <div className="top-coins-dashboard">
      <h2>Top Cryptocurrencies</h2>
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Name</th>
            <th>Price</th>
            <th>24h Change</th>
            <th>Market Cap</th>
          </tr>
        </thead>
        <tbody>
          {topCoins.map((coin) => (
            <tr key={coin.id}>
              <td>{coin.market_cap_rank}</td>
              <td>
                {coin.name} ({coin.symbol.toUpperCase()})
              </td>
              <td>${coin.current_price?.toFixed(2)}</td>
              <td style={{
                color: coin.price_change_percentage_24h >= 0 ? 'green' : 'red'
              }}>
                {coin.price_change_percentage_24h?.toFixed(2)}%
              </td>
              <td>${coin.market_cap?.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

```

## Database Schema (MongoDB)

```jsx
// MongoDB collections for storing crypto data
const cryptoPriceSchema = {
  coin_id: String,
  price_usd: Number,
  price_change_24h: Number,
  market_cap: Number,
  volume_24h: Number,
  timestamp: Date,
  source: String // 'coingecko'
};

const userQuerySchema = {
  user_id: String,
  query: String,
  coin_id: String,
  query_type: String, // 'price', 'historical', 'growth'
  response: Object,
  timestamp: Date
};

```

## Rate Limit Management

### Key Strategies:

1. **Caching**: Implement Redis caching with appropriate TTLs
2. **Request Batching**: Combine multiple coin requests into single API calls
3. **Intelligent Polling**: Adjust polling frequency based on user activity
4. **Fallback Handling**: Graceful degradation when rate limits are hit

### Rate Limit Monitoring:

```python
@app.get("/api/rate-limit-status")
async def get_rate_limit_status():
    """Check current rate limit usage"""
    # This would track your API usage
    return {
        "requests_made": "25",
        "requests_remaining": "5",
        "reset_time": "45 seconds"
    }

```

## Testing

### Backend Tests

```python
# tests/test_crypto_api.py
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_get_bitcoin_price():
    response = client.get("/api/crypto/price/bitcoin")
    assert response.status_code == 200
    data = response.json()
    assert "price_usd" in data
    assert "coin_id" in data

def test_get_historical_data():
    response = client.get("/api/crypto/historical/bitcoin?days=7")
    assert response.status_code == 200
    data = response.json()
    assert "prices" in data
    assert len(data["prices"]) > 0

def test_invalid_coin():
    response = client.get("/api/crypto/price/invalidcoin123")
    assert response.status_code == 404

```

### Frontend Tests

```jsx
// src/components/__tests__/PriceTracker.test.js
import { render, screen, waitFor } from '@testing-library/react';
import PriceTracker from '../PriceTracker';
import { cryptoApi } from '../../services/cryptoApi';

jest.mock('../../services/cryptoApi');

test('displays bitcoin price correctly', async () => {
  const mockPriceData = {
    coin_id: 'bitcoin',
    price_usd: 45000,
    price_change_24h: 2.5
  };

  cryptoApi.getPrice.mockResolvedValue({ data: mockPriceData });

  render(<PriceTracker coinId="bitcoin" />);

  await waitFor(() => {
    expect(screen.getByText('$45000.00')).toBeInTheDocument();
    expect(screen.getByText('24h: 2.50%')).toBeInTheDocument();
  });
});

```

## Common Issues and Solutions

1. **Rate Limit Exceeded (429 errors)**
    - Implement exponential backoff
    - Increase cache TTL values
    - Consider upgrading to paid plan
2. **Stale Data**
    - Monitor cache hit rates
    - Implement cache invalidation strategies
    - Add manual refresh options
3. **API Downtime**
    - Implement circuit breaker pattern
    - Add fallback data sources
    - Store historical data locally
4. **Memory Issues with Historical Data**
    - Paginate large datasets
    - Implement data compression
    - Use streaming for large responses

## Security Considerations

1. **API Key Protection**
    - Store in environment variables
    - Never expose in frontend code
    - Rotate keys regularly
2. **Rate Limiting**
    - Implement per-user rate limiting
    - Add IP-based restrictions
    - Monitor for abuse patterns
3. **Data Validation**
    - Validate all coin IDs
    - Sanitize user inputs
    - Implement request size limits

This playbook provides a complete integration solution for CoinGecko API with your crypto AI assistant, handling real-time data, rate limits, and providing a robust foundation for cryptocurrency market data queries.