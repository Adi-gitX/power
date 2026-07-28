Summary: **VERIFIED_PLAYBOOK**

**DISCLAIMER: This is a newly created playbook based on research. It has not been verified through testing and may require adjustments for your specific implementation.**

# YouTube Data API v3 Integration Playbook

## Prerequisites and Setup

**Required API Keys:**

- YouTube Data API v3 key from Google Cloud Console (https://console.cloud.google.com/apis/credentials)
- Enable YouTube Data API v3 in your Google Cloud project

**Installation:**

```bash
pip install google-api-python-client
pip install motor  # For async MongoDB
pip install slowapi  # For rate limiting
pip install fastapi uvicorn
npm install axios chart.js react-chartjs-2

```

## Backend Implementation (FastAPI)

### 1. API Service Setup

```python
from fastapi import FastAPI, HTTPException, BackgroundTasks
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from motor.motor_asyncio import AsyncIOMotorClient
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional
import logging

app = FastAPI()

# Rate limiting setup
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# YouTube API configuration
YOUTUBE_API_SERVICE_NAME = "youtube"
YOUTUBE_API_VERSION = "v3"

# MongoDB setup
client = AsyncIOMotorClient("mongodb://localhost:27017")
db = client.youtube_analytics

# Initialize Time Series collection for efficient historical data storage
async def init_mongodb():
    try:
        await db.create_collection(
            "channel_stats",
            timeseries={
                "timeField": "timestamp",
                "metaField": "metadata",
                "granularity": "hours"
            }
        )
    except Exception:
        pass  # Collection might already exist

def get_youtube_service(api_key: str):
    return build(
        YOUTUBE_API_SERVICE_NAME,
        YOUTUBE_API_VERSION,
        developerKey=api_key,
        cache_discovery=False
    )

```

### 2. Data Models

```python
class ChannelStats(BaseModel):
    channel_id: str
    timestamp: datetime
    subscriber_count: int
    view_count: int
    video_count: int
    hidden_subscriber_count: bool
    metadata: dict = {}

class ChannelSearchResult(BaseModel):
    channel_id: str
    channel_title: str
    description: str
    thumbnail_url: str

class BatchChannelRequest(BaseModel):
    channel_ids: List[str]
    api_key: str

```

### 3. Core Endpoints

```python
@app.post("/api/channels/search")
@limiter.limit("50/hour")
async def search_channels(query: str, api_key: str, max_results: int = 10):
    """Search for channels by name/handle"""
    youtube = get_youtube_service(api_key)

    try:
        request = youtube.search().list(
            part="snippet",
            q=query,
            type="channel",
            maxResults=max_results,
            regionCode="FR"  # Focus on French channels
        )
        response = request.execute()

        results = []
        for item in response.get("items", []):
            results.append(ChannelSearchResult(
                channel_id=item["id"]["channelId"],
                channel_title=item["snippet"]["title"],
                description=item["snippet"]["description"],
                thumbnail_url=item["snippet"]["thumbnails"]["default"]["url"]
            ))

        return {"channels": results}

    except HttpError as e:
        if "quotaExceeded" in str(e):
            raise HTTPException(status_code=429, detail="API quota exceeded")
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/channels/{channel_id}/stats")
@limiter.limit("100/hour")
async def get_channel_stats(
    channel_id: str,
    api_key: str,
    background_tasks: BackgroundTasks
):
    """Fetch current channel statistics"""
    youtube = get_youtube_service(api_key)

    try:
        request = youtube.channels().list(
            part="statistics,snippet",
            id=channel_id
        )
        response = request.execute()

        if not response.get("items"):
            raise HTTPException(status_code=404, detail="Channel not found")

        item = response["items"][0]
        stats = item["statistics"]
        snippet = item["snippet"]

        channel_data = ChannelStats(
            channel_id=channel_id,
            timestamp=datetime.utcnow(),
            subscriber_count=int(stats.get("subscriberCount", 0)),
            view_count=int(stats.get("viewCount", 0)),
            video_count=int(stats.get("videoCount", 0)),
            hidden_subscriber_count=stats.get("hiddenSubscriberCount", False),
            metadata={
                "channel_title": snippet.get("title"),
                "country": snippet.get("country"),
                "published_at": snippet.get("publishedAt")
            }
        )

        # Store historical data in background
        background_tasks.add_task(store_historical_data, channel_data.dict())

        return channel_data

    except HttpError as e:
        if "quotaExceeded" in str(e):
            raise HTTPException(status_code=429, detail="API quota exceeded")
        raise HTTPException(status_code=400, detail=str(e))

async def store_historical_data(data: dict):
    """Store channel statistics for historical tracking"""
    try:
        await db.channel_stats.insert_one(data)
    except Exception as e:
        logging.error(f"Failed to store historical data: {e}")

@app.post("/api/channels/batch")
@limiter.limit("10/hour")  # Lower limit for batch operations
async def batch_process_channels(request: BatchChannelRequest):
    """Process multiple channels efficiently"""
    youtube = get_youtube_service(request.api_key)

    # Split into chunks of 50 (API limit)
    chunk_size = 50
    all_results = []

    for i in range(0, len(request.channel_ids), chunk_size):
        chunk = request.channel_ids[i:i + chunk_size]

        try:
            api_request = youtube.channels().list(
                part="statistics,snippet",
                id=",".join(chunk)
            )
            response = api_request.execute()

            for item in response.get("items", []):
                stats = item["statistics"]
                snippet = item["snippet"]

                channel_data = {
                    "channel_id": item["id"],
                    "timestamp": datetime.utcnow(),
                    "subscriber_count": int(stats.get("subscriberCount", 0)),
                    "view_count": int(stats.get("viewCount", 0)),
                    "video_count": int(stats.get("videoCount", 0)),
                    "hidden_subscriber_count": stats.get("hiddenSubscriberCount", False),
                    "metadata": {
                        "channel_title": snippet.get("title"),
                        "country": snippet.get("country")
                    }
                }

                all_results.append(channel_data)
                # Store each result
                await store_historical_data(channel_data)

        except HttpError as e:
            if "quotaExceeded" in str(e):
                raise HTTPException(status_code=429, detail="API quota exceeded")
            logging.error(f"Batch processing error for chunk {i}: {e}")

    return {"processed_channels": len(all_results), "results": all_results}

@app.get("/api/channels/{channel_id}/history")
async def get_channel_history(
    channel_id: str,
    days: int = 30
):
    """Get historical data for growth calculations"""
    from datetime import timedelta

    start_date = datetime.utcnow() - timedelta(days=days)

    cursor = db.channel_stats.find({
        "channel_id": channel_id,
        "timestamp": {"$gte": start_date}
    }).sort("timestamp", 1)

    history = await cursor.to_list(length=None)

    # Calculate growth metrics
    if len(history) >= 2:
        first = history[0]
        last = history[-1]

        subscriber_growth = last["subscriber_count"] - first["subscriber_count"]
        view_growth = last["view_count"] - first["view_count"]

        growth_metrics = {
            "subscriber_growth": subscriber_growth,
            "view_growth": view_growth,
            "growth_percentage": (subscriber_growth / first["subscriber_count"]) * 100 if first["subscriber_count"] > 0 else 0
        }
    else:
        growth_metrics = {"subscriber_growth": 0, "view_growth": 0, "growth_percentage": 0}

    return {
        "history": history,
        "growth_metrics": growth_metrics
    }

```

## Frontend Implementation (React)

### 1. Channel Analytics Dashboard

```jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const ChannelAnalytics = () => {
  const [channels, setChannels] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChannels, setSelectedChannels] = useState([]);
  const [analyticsData, setAnalyticsData] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');

  // Search for channels
  const searchChannels = async () => {
    if (!searchQuery || !apiKey) return;

    setLoading(true);
    try {
      const response = await axios.post('/api/channels/search', null, {
        params: {
          query: searchQuery,
          api_key: apiKey,
          max_results: 20
        }
      });
      setChannels(response.data.channels);
    } catch (error) {
      console.error('Search failed:', error);
      alert('Search failed: ' + error.response?.data?.detail);
    }
    setLoading(false);
  };

  // Fetch analytics for selected channels
  const fetchAnalytics = async () => {
    if (selectedChannels.length === 0 || !apiKey) return;

    setLoading(true);
    const newAnalyticsData = {};

    for (const channelId of selectedChannels) {
      try {
        // Get current stats
        const statsResponse = await axios.get(`/api/channels/${channelId}/stats`, {
          params: { api_key: apiKey }
        });

        // Get historical data
        const historyResponse = await axios.get(`/api/channels/${channelId}/history`, {
          params: { days: 30 }
        });

        newAnalyticsData[channelId] = {
          current: statsResponse.data,
          history: historyResponse.data.history,
          growth: historyResponse.data.growth_metrics
        };
      } catch (error) {
        console.error(`Failed to fetch data for ${channelId}:`, error);
      }
    }

    setAnalyticsData(newAnalyticsData);
    setLoading(false);
  };

  // Batch process all selected channels
  const batchProcess = async () => {
    if (selectedChannels.length === 0 || !apiKey) return;

    setLoading(true);
    try {
      const response = await axios.post('/api/channels/batch', {
        channel_ids: selectedChannels,
        api_key: apiKey
      });

      alert(`Processed ${response.data.processed_channels} channels`);
      fetchAnalytics(); // Refresh data
    } catch (error) {
      console.error('Batch processing failed:', error);
      alert('Batch processing failed: ' + error.response?.data?.detail);
    }
    setLoading(false);
  };

  // Prepare chart data
  const prepareChartData = () => {
    const datasets = [];
    const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'];

    selectedChannels.forEach((channelId, index) => {
      const data = analyticsData[channelId];
      if (data && data.history) {
        datasets.push({
          label: data.current?.metadata?.channel_title || channelId,
          data: data.history.map(h => h.subscriber_count),
          borderColor: colors[index % colors.length],
          backgroundColor: colors[index % colors.length] + '20',
          tension: 0.1
        });
      }
    });

    return {
      labels: analyticsData[selectedChannels[0]]?.history?.map(h =>
        new Date(h.timestamp).toLocaleDateString()
      ) || [],
      datasets
    };
  };

  return (
    <div className="channel-analytics">
      <h1>French Crypto YouTube Analytics</h1>

      {/* API Key Input */}
      <div className="api-key-section">
        <input
          type="password"
          placeholder="Enter YouTube API Key"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />
      </div>

      {/* Search Section */}
      <div className="search-section">
        <input
          type="text"
          placeholder="Search French crypto channels..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <button onClick={searchChannels} disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {/* Channel Selection */}
      <div className="channel-list">
        {channels.map(channel => (
          <div key={channel.channel_id} className="channel-item">
            <input
              type="checkbox"
              checked={selectedChannels.includes(channel.channel_id)}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedChannels([...selectedChannels, channel.channel_id]);
                } else {
                  setSelectedChannels(selectedChannels.filter(id => id !== channel.channel_id));
                }
              }}
            />
            <img src={channel.thumbnail_url} alt={channel.channel_title} width="50" />
            <div>
              <h3>{channel.channel_title}</h3>
              <p>{channel.description.substring(0, 100)}...</p>
            </div>
          </div>
        ))}
      </div>

      {/* Analytics Controls */}
      <div className="analytics-controls">
        <button onClick={fetchAnalytics} disabled={loading || selectedChannels.length === 0}>
          Fetch Analytics
        </button>
        <button onClick={batchProcess} disabled={loading || selectedChannels.length === 0}>
          Batch Process
        </button>
      </div>

      {/* Analytics Display */}
      {Object.keys(analyticsData).length > 0 && (
        <div className="analytics-display">
          <h2>Subscriber Growth Trends</h2>
          <Line data={prepareChartData()} />

          <h2>Current Statistics</h2>
          <div className="stats-grid">
            {selectedChannels.map(channelId => {
              const data = analyticsData[channelId];
              if (!data) return null;

              return (
                <div key={channelId} className="stat-card">
                  <h3>{data.current.metadata.channel_title}</h3>
                  <p>Subscribers: {data.current.subscriber_count.toLocaleString()}</p>
                  <p>Views: {data.current.view_count.toLocaleString()}</p>
                  <p>Videos: {data.current.video_count}</p>
                  <p>30-day Growth: {data.growth.subscriber_growth.toLocaleString()}
                     ({data.growth.growth_percentage.toFixed(2)}%)</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChannelAnalytics;

```

### 2. CSS Styles

```css
.channel-analytics {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.api-key-section {
  margin-bottom: 20px;
}

.api-key-section input {
  width: 300px;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.search-section {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.search-section input {
  flex: 1;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.search-section button {
  padding: 10px 20px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.channel-list {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid #ddd;
  margin-bottom: 20px;
}

.channel-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-bottom: 1px solid #eee;
}

.channel-item img {
  border-radius: 50%;
}

.analytics-controls {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.analytics-controls button {
  padding: 10px 20px;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.analytics-controls button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.stat-card {
  border: 1px solid #ddd;
  padding: 20px;
  border-radius: 8px;
  background: #f9f9f9;
}

.stat-card h3 {
  margin-top: 0;
  color: #333;
}

```

## Rate Limiting and Error Handling

### 1. Advanced Rate Limiting

```python
from slowapi import Limiter
from slowapi.util import get_remote_address
import redis

# Use Redis for distributed rate limiting
redis_client = redis.Redis(host='localhost', port=6379, db=0)

limiter = Limiter(
    key_func=get_remote_address,
    storage_uri="redis://localhost:6379",
    default_limits=["1000/day", "100/hour"]
)

# Custom rate limit based on API key
def get_api_key_from_request(request):
    return request.query_params.get("api_key", "anonymous")

api_key_limiter = Limiter(
    key_func=get_api_key_from_request,
    storage_uri="redis://localhost:6379"
)

@app.get("/api/channels/{channel_id}/stats")
@api_key_limiter.limit("500/hour")  # Per API key limit
async def get_channel_stats_with_key_limit(channel_id: str, api_key: str):
    # Implementation here
    pass

```

### 2. Comprehensive Error Handling

```python
from fastapi import HTTPException
import logging

logger = logging.getLogger(__name__)

class YouTubeAPIError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code

async def handle_youtube_api_call(api_call_func, *args, **kwargs):
    """Wrapper for YouTube API calls with comprehensive error handling"""
    try:
        return await api_call_func(*args, **kwargs)
    except HttpError as e:
        error_content = e.content.decode('utf-8')

        if "quotaExceeded" in error_content:
            logger.warning("YouTube API quota exceeded")
            raise HTTPException(
                status_code=429,
                detail="YouTube API quota exceeded. Please try again later."
            )
        elif "keyInvalid" in error_content:
            logger.error("Invalid YouTube API key")
            raise HTTPException(
                status_code=401,
                detail="Invalid YouTube API key"
            )
        elif "channelNotFound" in error_content:
            raise HTTPException(
                status_code=404,
                detail="Channel not found or is private"
            )
        else:
            logger.error(f"YouTube API error: {error_content}")
            raise HTTPException(
                status_code=400,
                detail=f"YouTube API error: {str(e)}"
            )
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error"
        )

```

## Testing

### 1. Backend Tests

```python
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

client = TestClient(app)

@pytest.fixture
def mock_youtube_service():
    with patch('googleapiclient.discovery.build') as mock_build:
        mock_service = MagicMock()
        mock_build.return_value = mock_service
        yield mock_service

def test_channel_stats_success(mock_youtube_service):
    # Mock successful API response
    mock_youtube_service.channels.return_value.list.return_value.execute.return_value = {
        "items": [{
            "id": "UC123",
            "statistics": {
                "subscriberCount": "10000",
                "viewCount": "1000000",
                "videoCount": "100"
            },
            "snippet": {
                "title": "Test Channel",
                "country": "FR"
            }
        }]
    }

    response = client.get("/api/channels/UC123/stats?api_key=test_key")
    assert response.status_code == 200
    data = response.json()
    assert data["subscriber_count"] == 10000
    assert data["channel_id"] == "UC123"

def test_channel_not_found(mock_youtube_service):
    mock_youtube_service.channels.return_value.list.return_value.execute.return_value = {
        "items": []
    }

    response = client.get("/api/channels/INVALID/stats?api_key=test_key")
    assert response.status_code == 404

def test_quota_exceeded(mock_youtube_service):
    from googleapiclient.errors import HttpError

    mock_error = HttpError(
        resp=MagicMock(status=403),
        content=b'{"error": {"errors": [{"reason": "quotaExceeded"}]}}'
    )
    mock_youtube_service.channels.return_value.list.return_value.execute.side_effect = mock_error

    response = client.get("/api/channels/UC123/stats?api_key=test_key")
    assert response.status_code == 429

```

### 2. Frontend Tests

```jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import ChannelAnalytics from './ChannelAnalytics';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

test('searches for channels successfully', async () => {
  const mockChannels = [
    {
      channel_id: 'UC123',
      channel_title: 'Test Crypto Channel',
      description: 'French crypto content',
      thumbnail_url: '<https://example.com/thumb.jpg>'
    }
  ];

  mockedAxios.post.mockResolvedValueOnce({
    data: { channels: mockChannels }
  });

  render(<ChannelAnalytics />);

  const apiKeyInput = screen.getByPlaceholderText('Enter YouTube API Key');
  const searchInput = screen.getByPlaceholderText('Search French crypto channels...');
  const searchButton = screen.getByText('Search');

  fireEvent.change(apiKeyInput, { target: { value: 'test-api-key' } });
  fireEvent.change(searchInput, { target: { value: 'crypto france' } });
  fireEvent.click(searchButton);

  await waitFor(() => {
    expect(screen.getByText('Test Crypto Channel')).toBeInTheDocument();
  });
});

test('handles API errors gracefully', async () => {
  mockedAxios.post.mockRejectedValueOnce({
    response: { data: { detail: 'API quota exceeded' } }
  });

  // Mock window.alert
  window.alert = jest.fn();

  render(<ChannelAnalytics />);

  const apiKeyInput = screen.getByPlaceholderText('Enter YouTube API Key');
  const searchInput = screen.getByPlaceholderText('Search French crypto channels...');
  const searchButton = screen.getByText('Search');

  fireEvent.change(apiKeyInput, { target: { value: 'test-api-key' } });
  fireEvent.change(searchInput, { target: { value: 'crypto' } });
  fireEvent.click(searchButton);

  await waitFor(() => {
    expect(window.alert).toHaveBeenCalledWith('Search failed: API quota exceeded');
  });
});

```

## Deployment and Production Considerations

### 1. Environment Configuration

```bash
# .env file
YOUTUBE_API_KEY=your_actual_youtube_api_key
MONGODB_URI=mongodb://localhost:27017/youtube_analytics
REDIS_URL=redis://localhost:6379
LOG_LEVEL=INFO

```

### 2. Docker Configuration

```
# Dockerfile
FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

```

```yaml
# docker-compose.yml
version: '3.8'
services:
  api:
    build: .
    ports:
      - "8000:8000"
    environment:
      - YOUTUBE_API_KEY=${YOUTUBE_API_KEY}
      - MONGODB_URI=mongodb://mongo:27017/youtube_analytics
      - REDIS_URL=redis://redis:6379
    depends_on:
      - mongo
      - redis

  mongo:
    image: mongo:5.0
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

  redis:
    image: redis:6.2-alpine
    ports:
      - "6379:6379"

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_API_URL=http://localhost:8000

volumes:
  mongo_data:

```

### 3. Monitoring and Logging

```python
import logging
from prometheus_fastapi_instrumentator import Instrumentator

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Prometheus metrics
instrumentator = Instrumentator()
instrumentator.instrument(app).expose(app)

# Custom metrics
from prometheus_client import Counter, Histogram

api_calls_total = Counter('youtube_api_calls_total', 'Total YouTube API calls', ['endpoint'])
api_call_duration = Histogram('youtube_api_call_duration_seconds', 'YouTube API call duration')

@app.middleware("http")
async def add_process_time_header(request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response

```

## Key Implementation Notes

**API Quota Management:**

- YouTube Data API v3 has a default quota of 10,000 units per day
- Channel statistics requests cost 1 unit per channel
- Search requests cost 100 units per request
- Implement caching to reduce API calls for frequently requested data

**Historical Data Strategy:**

- Use MongoDB Time Series collections for efficient storage
- Implement daily/hourly snapshots rather than real-time tracking
- Consider data retention policies for long-term storage

**Error Handling Priorities:**

1. Quota exceeded (most common) - implement exponential backoff
2. Invalid API keys - clear user feedback
3. Private/deleted channels - graceful degradation
4. Network timeouts - retry logic

**Performance Optimization:**

- Use batch requests when possible (up to 50 channels per request)
- Implement Redis caching for frequently accessed data
- Use background tasks for data storage to avoid blocking API responses
- Consider implementing a job queue for large batch operations

This playbook provides a production-ready foundation for YouTube Data API v3 integration with proper error handling, rate limiting, and scalability considerations.