Summary: **VERIFIED_PLAYBOOK**

**DISCLAIMER: This is a newly created playbook based on deep research. It has not been verified through testing and may require adjustments during implementation.**

# Comprehensive Integration Playbook for Travel Planning Application

This guide provides a complete implementation strategy for integrating OpenWeatherMap, Google Maps, and National Park Service APIs into a FastAPI/React stack. We combine weather forecasting, geographic visualization, and park information services while maintaining security and performance best practices.

## API Configuration and Security

### 1. API Key Acquisition

**OpenWeatherMap**

1. Register at [openweathermap.org/api](http://openweathermap.org/api)
2. Navigate to "My API Keys"
3. Create new key with "Current Weather Data" scope

**Google Maps**

1. Create project in Google Cloud Console
2. Enable "Maps JavaScript API"
3. Generate unrestricted key for development (restrict for production)

**National Park Service**

1. Request key at [api.nps.gov](http://api.nps.gov/)
2. Whitelist application domains
3. Set rate limit alerts (5000 req/hr default)

### 2. Environment Management

**FastAPI Backend**

```python
# .env
OPENWEATHER_KEY=your_key
NPS_KEY=your_key

```

```python
# config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    openweather_key: str
    nps_key: str

    class Config:
        env_file = ".env"

```

**React Frontend**

```jsx
// .env.local
REACT_APP_GMAPS_KEY=your_key
REACT_APP_API_BASE=http://localhost:8000

```

## Backend Implementation

### 1. Weather Endpoint

```python
@app.get("/api/weather")
async def get_weather(lat: float, lon: float):
    async with httpx.AsyncClient() as client:
        try:
            res = await client.get(
                f"<https://api.openweathermap.org/data/3.0/onecall>",
                params={
                    "lat": lat,
                    "lon": lon,
                    "appid": settings.openweather_key,
                    "units": "imperial"
                },
                timeout=10
            )
            res.raise_for_status()
            return {
                "temp": res.json()["current"]["temp"],
                "conditions": res.json()["current"]["weather"][0]["main"]
            }
        except httpx.HTTPStatusError as e:
            raise HTTPException(502, f"Weather API error: {str(e)}")

```

### 2. Parks Endpoint

```python
@app.get("/api/parks")
async def get_parks(state: str):
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(
                "<https://developer.nps.gov/api/v1/parks>",
                params={
                    "stateCode": state,
                    "api_key": settings.nps_key,
                    "fields": "images"
                }
            )
            parks = res.json()["data"]
            return [{
                "name": p["fullName"],
                "coordinates": p["latLong"],
                "image": p["images"][0]["url"] if p["images"] else None
            } for p in parks]
    except KeyError:
        raise HTTPException(500, "Invalid NPS API response format")

```

### 3. Error Handling

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["<http://localhost:3000>"],
    allow_methods=["*"],
    allow_headers=["*"]
)

@app.exception_handler(HTTPException)
async def unified_error_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "path": request.url.path,
            "timestamp": datetime.now().isoformat()
        }
    )

```

## Frontend Implementation

### 1. Map Component

```jsx
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api'

const MapWrapper = ({ locations }) => {
  const { isLoaded } = useJsApiLoader({
    id: 'travel-map',
    googleMapsApiKey: process.env.REACT_APP_GMAPS_KEY
  })

  return isLoaded ? (
    <GoogleMap
      zoom={8}
      center={locations[0]}
      mapContainerStyle={{ width: '100%', height: '400px' }}
    >
      {locations.map((loc, i) => (
        <Marker key={i} position={loc} />
      ))}
    </GoogleMap>
  ) : <div>Loading map...</div>
}

```

### 2. Weather Display

```jsx
const WeatherPanel = ({ coords }) => {
  const [weather, setWeather] = useState(null)

  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_BASE}/weather`, {
      params: { lat: coords.lat, lon: coords.lng }
    })
    .then(res => setWeather(res.data))
    .catch(err => showToast(`Weather update failed: ${err.response?.data?.error}`))
  }, [coords])

  return weather ? (
    <div className="weather-card">
      <h3>{weather.temp}°F</h3>
      <p>{weather.conditions}</p>
    </div>
  ) : <Spinner />
}

```

### 3. Park Information

```jsx
const ParkSelector = ({ state }) => {
  const [parks, setParks] = useState([])

  useEffect(() => {
    const fetchParks = async () => {
      try {
        const { data } = await axios.get(
          `${process.env.REACT_APP_API_BASE}/parks`,
          { params: { state } }
        )
        setParks(data)
      } catch (err) {
        showToast(`Failed loading parks: ${err.message}`)
      }
    }

    if(state) fetchParks()
  }, [state])

  return (
    <div className="park-grid">
      {parks.map(park => (
        <ParkCard
          name={park.name}
          image={park.image}
          coordinates={park.coordinates}
        />
      ))}
    </div>
  )
}

```

## Testing Strategy

### 1. Backend Tests

```python
@pytest.mark.asyncio
async def test_weather_endpoint(mock_httpx):
    mock_httpx.get.return_value = Mock(
        status_code=200,
        json=lambda: {"current": {"temp": 72, "weather": [{"main": "Clear"}]}}
    )

    client = TestClient(app)
    response = client.get("/api/weather?lat=40&lon=-75")
    assert response.status_code == 200
    assert response.json()["temp"] == 72

@pytest.mark.asyncio
async def test_parks_error_handling(mock_httpx):
    mock_httpx.get.side_effect = httpx.ConnectTimeout("API timeout")
    client = TestClient(app)
    response = client.get("/api/parks?state=CA")
    assert response.status_code == 502
    assert "API timeout" in response.json()["error"]

```

### 2. Frontend Tests

```jsx
// ParkSelector.test.js
import { render, screen, waitFor } from '@testing-library/react'
import { rest } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  rest.get('/api/parks', (req, res, ctx) => {
    return res(ctx.json([{
      name: "Yosemite",
      coordinates: "37.8651,-119.5383"
    }]))
  })
)

test('displays park data', async () => {
  render(<ParkSelector state="CA" />)
  await waitFor(() => {
    expect(screen.getByText('Yosemite')).toBeInTheDocument()
  })
})

```

## Optimization Practices

1. **Caching Layer**
    
    Implement Redis with 15-minute TTL for API responses:
    
    ```python
    @app.get("/api/weather")
    @cache(expire=900)
    async def get_weather(lat: float, lon: float):
        # Existing implementation
    
    ```
    
2. **Request Batching**
    
    Combine weather and park coordinates in single requests:
    
    ```jsx
    const [mapData, setMapData] = useState({ weather: null, parks: [] })
    
    useEffect(() => {
      Promise.all([
        axios.get('/api/weather', { params: coords }),
        axios.get('/api/parks', { params: { state } })
      ]).then(([weatherRes, parksRes]) => {
        setMapData({
          weather: weatherRes.data,
          parks: parksRes.data
        })
      })
    }, [coords, state])
    
    ```
    
3. **Progressive Loading**
    
    Implement skeleton screens for API responses:
    
    ```jsx
    const ParkSkeleton = () => (
      <div className="skeleton-card">
        <div className="skeleton-image" />
        <div className="skeleton-text" />
      </div>
    )
    
    {parks.length ? parks.map(...) : Array(5).fill(<ParkSkeleton />)}
    
    ```
    

## Maintenance Considerations

1. **Key Rotation**
    
    Implement monthly key rotation with:
    
    ```bash
    # Key rotation script
    aws secretsmanager update-secret --secret-id api-keys --secret-string "$(new_keys)"
    
    ```
    
2. **Performance Monitoring**
    
    Configure Datadog RUM:
    
    ```jsx
    datadogRum.init({
      applicationId: 'APP_ID',
      clientToken: 'PUBLIC_TOKEN',
      site: 'datadoghq.com',
      service: 'travel-app',
      sampleRate: 100,
    })
    
    ```
    
3. **Cost Controls**
    
    Set API budget alerts:
    
    ```python
    # FastAPI middleware
    @app.middleware("http")
    async def rate_limiter(request: Request, call_next):
        if request.url.path == "/api/weather":
            check_openweather_quota()
        return await call_next(request)
    
    ```
    

## Required API Keys Summary

**CRITICAL: Obtain these API keys before implementation:**

1. **OpenWeatherMap API Key** - Get from [openweathermap.org/api](http://openweathermap.org/api) (free tier available)
2. **Google Maps API Key** - Get from Google Cloud Console (requires billing account)
3. **National Park Service API Key** - Get from [api.nps.gov](http://api.nps.gov/) (free)

This implementation balances functionality with security, providing a robust foundation for trip planning applications. Regular audits of API usage patterns and continuous monitoring of third-party service status pages ensure sustained reliability.
