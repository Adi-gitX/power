**VERIFIED_PLAYBOOK: Alpha Vantage Stock Data API Integration**

**DISCLAIMER: This is a newly created playbook generated through deep research. It has not been verified through testing and should be validated before production use.**

**REQUIRED API KEY: You need to obtain an Alpha Vantage API key from https://www.alphavantage.co/support/#api-key (Free tier provides 25 requests/day)**

# Integration Playbook for Alpha Vantage Stock Data API in FastAPI/React

## Key Implementation Strategy

This integration leverages Alpha Vantage's API for real-time stock data and fundamental analysis while implementing robust rate limiting, Redis caching, and S&P 500-focused data pipelines. The solution combines FastAPI's asynchronous capabilities with React's state management for optimal performance.

---

## 1. Environment Setup & API Configuration

```bash
# Backend dependencies
pip install fastapi uvicorn python-dotenv alpha-vantage httpx redis fastapi-limiter fastapi-cache2 beautifulsoup4

```

```python
# .env configuration
ALPHA_VANTAGE_KEY="YOUR_KEY"
REDIS_URL="redis://localhost:6379"
SP500_REFRESH_HOURS=24

```

```python
# Secure API key handling (app/config.py)
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    alpha_vantage_key: str
    redis_url: str

settings = Settings()

```

---

## 2. Core API Endpoints Implementation

### Real-Time Stock Data Endpoint

```python
from fastapi import APIRouter, HTTPException
from alpha_vantage.timeseries import TimeSeries

router = APIRouter()

@router.get("/stocks/{symbol}/realtime")
async def get_realtime(symbol: str):
    ts = TimeSeries(key=settings.alpha_vantage_key)
    try:
        data, _ = ts.get_quote_endpoint(symbol)
        return {
            "price": data["05. price"],
            "volume": data["06. volume"],
            "last_refreshed": data["07. latest trading day"]
        }
    except ValueError as e:
        raise HTTPException(400, f"Alpha Vantage error: {str(e)}") from e

```

---

## 3. Rate Limiting & Caching

### Rate Limiter Configuration

```python
# app/security/rate_limiter.py
from fastapi_limiter import FastAPILimiter
from fastapi_limiter.depends import RateLimiter

async def init_limiter():
    await FastAPILimiter.init(redis.from_url(settings.redis_url))

api_limiter = RateLimiter(times=5, seconds=60)  # Alpha Vantage free tier limits

```

### Caching Strategy

```python
# app/services/cache.py
from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend
from fastapi_cache.decorator import cache

FastAPICache.init(RedisBackend(settings.redis_url), prefix="av-cache")

def alpha_cache(expire: int = 3600):
    return cache(expire=expire, namespace="alpha-vantage")

```

---

## 4. S&P 500 Focus Implementation

### S&P 500 Component Loader

```python
# app/services/sp500.py
from bs4 import BeautifulSoup
import httpx

async def refresh_sp500_list():
    async with httpx.AsyncClient() as client:
        response = await client.get("<https://en.wikipedia.org/wiki/List_of_S%26P_500_companies>")
        soup = BeautifulSoup(response.text, "html.parser")
        table = soup.find("table", {"class": "wikitable"})
        return [row.find("td").text.strip() for row in table.find_all("tr")[1:]]

```

---

## 5. Fundamental Data Integration

### Company Fundamentals Endpoint

```python
# app/routers/fundamentals.py
@router.get("/stocks/{symbol}/fundamentals")
@cache(alpha_cache(86400))  # 24-hour cache
@depends(api_limiter)
async def get_fundamentals(symbol: str):
    fd = FundamentalData(key=settings.alpha_vantage_key)
    try:
        data, _ = fd.get_company_overview(symbol)
        return {
            "market_cap": data["MarketCapitalization"],
            "pe_ratio": data["PERatio"],
            "profit_margin": data["ProfitMargin"]
        }
    except ValueError as e:
        raise HTTPException(400, f"Fundamental data error: {str(e)}") from e

```

---

## 6. Testing Implementation

### Integration Test Suite

```python
# tests/test_stocks.py
from fastapi.testclient import TestClient

def test_realtime_data(mock_alpha_vantage):
    client = TestClient(app)
    response = client.get("/stocks/MSFT/realtime")
    assert response.status_code == 200
    assert "price" in response.json()

def test_rate_limiting(mock_redis):
    client = TestClient(app)
    for _ in range(6):
        response = client.get("/stocks/AAPL/fundamentals")
    assert response.status_code == 429

```

---

## 7. Frontend Integration (React)

### Real-Time Data Fetching

```jsx
// src/components/StockWidget.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';

const StockWidget = ({ symbol }) => {
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_URL}/stocks/${symbol}/realtime`
        );
        setData(response.data);
      } catch (error) {
        console.error('Error fetching stock data:', error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [symbol]);

  return <div>{data?.price ? `$${data.price}` : 'Loading...'}</div>;
};

```

---

## 8. Deployment Configuration

### Rate Limiter Redis Setup

```yaml
# docker-compose.yml
services:
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  redis_data:

```

---

## 9. Monitoring & Optimization

### Cache Performance Metrics

```python
# app/monitoring/cache.py
from redis import Redis

def get_cache_metrics():
    conn = Redis.from_url(settings.redis_url)
    return {
        "hit_rate": conn.info()["keyspace_hits"] / conn.info()["keyspace_misses"],
        "memory_usage": conn.info()["used_memory_human"],
        "cached_symbols": conn.keys("av-cache:alpha-vantage:*")
    }

```

---

## 10. Common Pitfalls & Solutions

1. **Rate Limit Errors**
    - Implement exponential backoff for retries
    - Use `fastapi-limiter` with Redis for cluster-wide tracking
    - Consider tiered caching with Redis and in-memory cache
2. **Stale S&P 500 Data**
    - Implement background task for daily component list refresh:
    
    ```python
    from apscheduler.schedulers.asyncio import AsyncIOScheduler
    
    async def refresh_sp500_job():
        current_components = await refresh_sp500_list()
        redis.set("sp500", json.dumps(current_components))
    
    scheduler = AsyncIOScheduler()
    scheduler.add_job(refresh_sp500_job, 'interval', hours=24)
    scheduler.start()
    
    ```
    
3. **Cache Invalidation**
    - Use versioned cache keys
    - Implement cache busting on corporate actions:
    
    ```python
    async def invalidate_cache(symbol: str):
        await FastAPICache.clear(namespace=f"alpha-vantage:{symbol}")
    
    ```
    

---

This implementation provides a robust foundation for building investment tools with Alpha Vantage data, addressing key concerns around reliability, performance, and data freshness. The architecture supports easy scaling to premium API tiers through configuration changes.

**IMPORTANT NOTES:**

- **API Key Required**: Get your free API key from https://www.alphavantage.co/support/#api-key
- **Rate Limits**: Free tier allows 25 requests/day, 5 requests/minute
- **Redis Required**: Install and run Redis for caching and rate limiting
- **Testing Recommended**: Validate all endpoints before production deployment
