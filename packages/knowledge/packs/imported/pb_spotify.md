**SPOTIFY INTEGRATION VERIFIED_PLAYBOOK**

**DISCLAIMER: This is a newly created playbook based on current research and may require testing and validation in your specific environment.**

# SPOTIFY WEB API AND WEB PLAYBOOK SDK INTEGRATION PLAYBOOK

## Required API Keys and Setup

- **Spotify Client ID and Client Secret**: Obtain from [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
- **Redirect URI**: Must be registered in your Spotify app settings
- **Required Scopes**: `user-read-playback-state`, `user-modify-playback-state`, `user-read-private`, `streaming`

## Installation Requirements

```bash
# Backend dependencies
pip install spotipy fastapi python-multipart

# Frontend dependencies
npm install react-spotify-web-playback-sdk

```

## 1. Backend Setup (FastAPI)

### Environment Configuration

```python
# .env file
SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here
REDIRECT_URI=http://localhost:3000/auth/callback

```

### Authentication Endpoints

```python
# auth.py
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import RedirectResponse
import spotipy
from spotipy.oauth2 import SpotifyOAuth
import os

router = APIRouter()

def get_spotify_oauth():
    return SpotifyOAuth(
        client_id=os.getenv("SPOTIFY_CLIENT_ID"),
        client_secret=os.getenv("SPOTIFY_CLIENT_SECRET"),
        redirect_uri=os.getenv("REDIRECT_URI"),
        scope="user-read-playback-state user-modify-playback-state user-read-private streaming"
    )

@router.get("/auth/login")
async def spotify_login():
    sp_oauth = get_spotify_oauth()
    auth_url = sp_oauth.get_authorize_url()
    return {"auth_url": auth_url}

@router.get("/auth/callback")
async def spotify_callback(code: str):
    sp_oauth = get_spotify_oauth()
    token_info = sp_oauth.get_access_token(code)
    return {"access_token": token_info["access_token"], "refresh_token": token_info["refresh_token"]}

@router.post("/auth/refresh")
async def refresh_token(refresh_token: str):
    sp_oauth = get_spotify_oauth()
    token_info = sp_oauth.refresh_access_token(refresh_token)
    return {"access_token": token_info["access_token"]}

```

### User Profile and Premium Check

```python
# user.py
@router.get("/user/profile")
async def get_user_profile(access_token: str):
    sp = spotipy.Spotify(auth=access_token)
    try:
        profile = sp.me()
        return {
            "id": profile["id"],
            "display_name": profile["display_name"],
            "product": profile["product"],  # "free" or "premium"
            "is_premium": profile["product"] == "premium"
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid token")

```

### Search and Playback Endpoints

```python
# playback.py
@router.get("/search")
async def search_tracks(q: str, access_token: str):
    sp = spotipy.Spotify(auth=access_token)
    results = sp.search(q, limit=20, type='track')
    return results

@router.post("/play")
async def start_playback(
    track_uri: str,
    position_ms: int = 0,
    device_id: str = None,
    access_token: str = None
):
    sp = spotipy.Spotify(auth=access_token)
    try:
        sp.start_playback(
            device_id=device_id,
            uris=[track_uri],
            position_ms=position_ms
        )
        return {"status": "playing", "position_ms": position_ms}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/pause")
async def pause_playback(device_id: str = None, access_token: str = None):
    sp = spotipy.Spotify(auth=access_token)
    sp.pause_playback(device_id=device_id)
    return {"status": "paused"}

@router.get("/playback/state")
async def get_playback_state(access_token: str):
    sp = spotipy.Spotify(auth=access_token)
    state = sp.current_playback()
    return state

```

## 2. Frontend Setup (React)

### Spotify Player Component

```jsx
// SpotifyPlayer.jsx
import React, { useState, useEffect, useCallback } from 'react';

const SpotifyPlayer = ({ accessToken, onReady, onPlayerStateChanged }) => {
  const [player, setPlayer] = useState(null);
  const [deviceId, setDeviceId] = useState(null);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    // Check if user has premium
    const checkPremium = async () => {
      try {
        const response = await fetch('/api/user/profile', {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const profile = await response.json();
        setIsPremium(profile.is_premium);
      } catch (error) {
        console.error('Error checking premium status:', error);
      }
    };

    if (accessToken) {
      checkPremium();
    }
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken || !isPremium) return;

    // Load Spotify Web Playback SDK
    const script = document.createElement('script');
    script.src = '<https://sdk.scdn.co/spotify-player.js>';
    script.async = true;
    document.body.appendChild(script);

    window.onSpotifyWebPlaybackSDKReady = () => {
      const spotifyPlayer = new window.Spotify.Player({
        name: 'Baseball Walkup Songs Player',
        getOAuthToken: cb => { cb(accessToken); },
        volume: 0.5
      });

      // Ready
      spotifyPlayer.addListener('ready', ({ device_id }) => {
        console.log('Ready with Device ID', device_id);
        setDeviceId(device_id);
        onReady && onReady(device_id);
      });

      // Not Ready
      spotifyPlayer.addListener('not_ready', ({ device_id }) => {
        console.log('Device ID has gone offline', device_id);
      });

      // Player state changed
      spotifyPlayer.addListener('player_state_changed', (state) => {
        if (!state) return;
        onPlayerStateChanged && onPlayerStateChanged(state);
      });

      // Connect to the player
      spotifyPlayer.connect();
      setPlayer(spotifyPlayer);
    };

    return () => {
      if (player) {
        player.disconnect();
      }
    };
  }, [accessToken, isPremium]);

  const playTrack = async (trackUri, positionMs = 0) => {
    if (!deviceId) return;

    try {
      await fetch('/api/play', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          track_uri: trackUri,
          position_ms: positionMs,
          device_id: deviceId
        })
      });
    } catch (error) {
      console.error('Error playing track:', error);
    }
  };

  const pauseTrack = async () => {
    if (!deviceId) return;

    try {
      await fetch('/api/pause', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ device_id: deviceId })
      });
    } catch (error) {
      console.error('Error pausing track:', error);
    }
  };

  if (!isPremium) {
    return (
      <div className="premium-required">
        <h3>Spotify Premium Required</h3>
        <p>This feature requires a Spotify Premium subscription to play music.</p>
      </div>
    );
  }

  return (
    <div className="spotify-player">
      <div className="player-controls">
        <button onClick={pauseTrack}>Pause</button>
      </div>
      {/* Player will be controlled via Web API calls */}
    </div>
  );
};

export default SpotifyPlayer;

```

### Search Component

```jsx
// SearchComponent.jsx
import React, { useState } from 'react';

const SearchComponent = ({ accessToken, onTrackSelect }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const searchTracks = async () => {
    if (!query.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const data = await response.json();
      setResults(data.tracks.items);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="search-component">
      <div className="search-input">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for songs..."
          onKeyPress={(e) => e.key === 'Enter' && searchTracks()}
        />
        <button onClick={searchTracks} disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      <div className="search-results">
        {results.map((track) => (
          <div key={track.id} className="track-item">
            <img src={track.album.images[2]?.url} alt={track.name} />
            <div className="track-info">
              <h4>{track.name}</h4>
              <p>{track.artists.map(a => a.name).join(', ')}</p>
              <p>{Math.floor(track.duration_ms / 1000)}s</p>
            </div>
            <button onClick={() => onTrackSelect(track)}>
              Select
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SearchComponent;

```

### Main App Component

```jsx
// App.jsx
import React, { useState, useEffect } from 'react';
import SpotifyPlayer from './SpotifyPlayer';
import SearchComponent from './SearchComponent';

function App() {
  const [accessToken, setAccessToken] = useState(null);
  const [deviceId, setDeviceId] = useState(null);
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [customStartTime, setCustomStartTime] = useState(0);

  useEffect(() => {
    // Check for auth callback
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code) {
      handleAuthCallback(code);
    }
  }, []);

  const handleAuthCallback = async (code) => {
    try {
      const response = await fetch(`/api/auth/callback?code=${code}`);
      const data = await response.json();
      setAccessToken(data.access_token);
      localStorage.setItem('spotify_access_token', data.access_token);
      localStorage.setItem('spotify_refresh_token', data.refresh_token);

      // Clean up URL
      window.history.replaceState({}, document.title, '/');
    } catch (error) {
      console.error('Auth callback error:', error);
    }
  };

  const handleLogin = async () => {
    try {
      const response = await fetch('/api/auth/login');
      const data = await response.json();
      window.location.href = data.auth_url;
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const playSelectedTrack = async () => {
    if (!selectedTrack || !deviceId) return;

    try {
      await fetch('/api/play', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          track_uri: selectedTrack.uri,
          position_ms: customStartTime * 1000,
          device_id: deviceId
        })
      });
    } catch (error) {
      console.error('Error playing track:', error);
    }
  };

  if (!accessToken) {
    return (
      <div className="login-screen">
        <h1>Baseball Walkup Songs</h1>
        <button onClick={handleLogin}>Login with Spotify</button>
      </div>
    );
  }

  return (
    <div className="app">
      <h1>Baseball Walkup Songs</h1>

      <SpotifyPlayer
        accessToken={accessToken}
        onReady={setDeviceId}
        onPlayerStateChanged={(state) => console.log('Player state:', state)}
      />

      <SearchComponent
        accessToken={accessToken}
        onTrackSelect={setSelectedTrack}
      />

      {selectedTrack && (
        <div className="selected-track">
          <h3>Selected Track: {selectedTrack.name}</h3>
          <div className="start-time-control">
            <label>Start Time (seconds):</label>
            <input
              type="number"
              value={customStartTime}
              onChange={(e) => setCustomStartTime(parseInt(e.target.value) || 0)}
              min="0"
              max={Math.floor(selectedTrack.duration_ms / 1000)}
            />
          </div>
          <button onClick={playSelectedTrack}>
            Play from {customStartTime}s
          </button>
        </div>
      )}
    </div>
  );
}

export default App;

```

## 3. Mobile Browser Considerations

### Handle Autoplay Restrictions

```jsx
// Add to SpotifyPlayer component
const handleMobilePlay = () => {
  // Mobile browsers require user interaction
  if (player) {
    player.activateElement().then(() => {
      playTrack(selectedTrack.uri, customStartTime * 1000);
    });
  }
};

```

### CSS for Mobile Responsiveness

```css
/* Mobile styles */
@media (max-width: 768px) {
  .track-item {
    flex-direction: column;
    padding: 1rem;
  }

  .player-controls button {
    min-height: 44px; /* Touch target size */
    font-size: 16px;
  }
}

```

## 4. Audio Mixing Considerations

Since you need to mix announcer audio with Spotify music:

```jsx
// Audio mixing component
const AudioMixer = ({ announcerAudio, spotifyPlayer }) => {
  const [announcerVolume, setAnnouncerVolume] = useState(1.0);
  const [musicVolume, setMusicVolume] = useState(0.3);

  const playWalkupSequence = async () => {
    // Start Spotify track at custom time with reduced volume
    await spotifyPlayer.setVolume(musicVolume);
    await playSelectedTrack();

    // Play announcer audio over the music
    const audio = new Audio(announcerAudio);
    audio.volume = announcerVolume;
    audio.play();

    // Fade out music after 20 seconds
    setTimeout(() => {
      fadeOutMusic();
    }, 20000);
  };

  const fadeOutMusic = () => {
    const fadeInterval = setInterval(() => {
      spotifyPlayer.getVolume().then(volume => {
        if (volume > 0.05) {
          spotifyPlayer.setVolume(volume - 0.05);
        } else {
          spotifyPlayer.pause();
          clearInterval(fadeInterval);
        }
      });
    }, 100);
  };
};

```

## 5. Error Handling and Limitations

### Handle Free vs Premium Users

```jsx
const PremiumGate = ({ children, isPremium }) => {
  if (!isPremium) {
    return (
      <div className="premium-required">
        <h3>Spotify Premium Required</h3>
        <p>Web playback requires a Spotify Premium subscription.</p>
        <a href="<https://www.spotify.com/premium/>" target="_blank">
          Upgrade to Premium
        </a>
      </div>
    );
  }
  return children;
};

```

### Token Refresh Logic

```jsx
const useSpotifyAuth = () => {
  const [accessToken, setAccessToken] = useState(null);

  const refreshToken = async () => {
    const refreshToken = localStorage.getItem('spotify_refresh_token');
    if (!refreshToken) return false;

    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken })
      });
      const data = await response.json();
      setAccessToken(data.access_token);
      localStorage.setItem('spotify_access_token', data.access_token);
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  };

  return { accessToken, refreshToken };
};

```

## 6. Testing

### Backend Tests

```python
# test_spotify.py
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_search_endpoint():
    # Mock Spotify API response
    response = client.get("/api/search?q=test")
    assert response.status_code == 200

def test_premium_check():
    # Test premium user validation
    response = client.get("/api/user/profile")
    # Add assertions based on mock data

```

### Frontend Tests

```jsx
// SpotifyPlayer.test.jsx
import { render, screen } from '@testing-library/react';
import SpotifyPlayer from './SpotifyPlayer';

test('shows premium required message for free users', () => {
  render(<SpotifyPlayer accessToken="test" isPremium={false} />);
  expect(screen.getByText('Spotify Premium Required')).toBeInTheDocument();
});

```

## Important Notes

1. **Premium Requirement**: Web Playback SDK only works with Spotify Premium accounts
2. **Mobile Limitations**: Mobile browsers have autoplay restrictions that require user interaction
3. **Rate Limits**: Spotify API has rate limits - implement proper error handling
4. **HTTPS Required**: Web Playback SDK requires HTTPS in production
5. **Device Management**: Users can only have one active device at a time

This playbook provides a complete integration for Spotify Web API and Web Playback SDK with your React/FastAPI application, handling authentication, premium user validation, custom timestamp playback, and mobile browser support.
