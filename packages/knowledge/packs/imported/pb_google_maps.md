# Google Maps Integration Playbook (React + FastAPI)
NOTE: This playbook and all associated code stubs are provided solely for reference purposes.
## 1. API Key Setup
1. Go to https://console.cloud.google.com/ → Create/select project
2. Enable APIs: Maps JavaScript API (+ Geocoding API, Places API if needed)
3. Credentials → Create API Key
4. Restrict key (required for production):
   - Application restrictions: HTTP referrers
   - Add: `https://yourdomain.com/*`, `http://localhost:*/*` (dev only, remove for prod)
   - API restrictions: Restrict to enabled APIs only
5. Enable billing: (required — without it, map shows "For development purposes only" watermark). Free tier: $200/month credit (~28,000 map loads). Set up budget alerts at Billing → Budgets & alerts.
## 2. Installation (React)
```bash
yarn add @vis.gl/react-google-maps
```
## 3. Core Implementation
### Basic Map with Markers
```jsx
import { APIProvider, Map, AdvancedMarker, useMap } from "@vis.gl/react-google-maps";
const MapComponent = () => {
  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
  if (!apiKey || apiKey === "YOUR_GOOGLE_MAPS_API_KEY") {
    return <div>Google Maps API key not configured</div>;
  }
  return (
    <APIProvider apiKey={apiKey}>
      <Map
        style={{ width: "100%", height: "100vh" }}
        defaultCenter={{ lat: 40.7128, lng: -74.006 }}
        defaultZoom={14}
        mapId="your-map-id" // Required for AdvancedMarker
        gestureHandling="greedy"
        disableDefaultUI={true}
        zoomControl={true}
        mapTypeControl={false}
        streetViewControl={false}
        fullscreenControl={false}
        onClick={(e) => {
          const { lat, lng } = e.detail.latLng;
          console.log("Clicked:", lat, lng);
        }}
      >
        <AdvancedMarker position={{ lat: 40.758, lng: -73.9855 }} onClick={() => handleMarkerClick()}>
          <div className="w-8 h-8 bg-cyan-400 rounded-full flex items-center justify-center">
            <span></span>
          </div>
        </AdvancedMarker>
        <MapContent />
      </Map>
    </APIProvider>
  );
};
```
### useMap Hook (CRITICAL: must be inside a child of `<Map>`)
```jsx
// WRONG — useMap outside Map
const MapPage = () => {
  const map = useMap(); // Won't work!
  return <Map>...</Map>;
};
// CORRECT — useMap inside a Map child component
const MapContent = () => {
  const map = useMap(); // Works!
  return <AdvancedMarker ... />;
};
const MapPage = () => (
  <Map>
    <MapContent />
  </Map>
);
```
## 4. Coordinate Conversion (Screen ↔ Geographic)
Essential for drawing/annotations that must stay pinned to map locations.
```jsx
const MapDrawing = () => {
  const map = useMap();
  const screenToLatLng = (x, y, canvasWidth, canvasHeight) => {
    if (!map || !window.google) return null;
    const bounds = map.getBounds();
    const projection = map.getProjection();
    if (!bounds || !projection) return null;
    const topRight = projection.fromLatLngToPoint(bounds.getNorthEast());
    const bottomLeft = projection.fromLatLngToPoint(bounds.getSouthWest());
    const worldPoint = new window.google.maps.Point(
      bottomLeft.x + (x / canvasWidth) * (topRight.x - bottomLeft.x),
      topRight.y + (y / canvasHeight) * (bottomLeft.y - topRight.y)
    );
    const latLng = projection.fromPointToLatLng(worldPoint);
    return { lat: latLng.lat(), lng: latLng.lng() };
  };
  const latLngToScreen = (lat, lng, canvasWidth, canvasHeight) => {
    if (!map || !window.google) return null;
    const bounds = map.getBounds();
    const projection = map.getProjection();
    if (!bounds || !projection) return null;
    const topRight = projection.fromLatLngToPoint(bounds.getNorthEast());
    const bottomLeft = projection.fromLatLngToPoint(bounds.getSouthWest());
    const point = projection.fromLatLngToPoint(new window.google.maps.LatLng(lat, lng));
    return {
      x: ((point.x - bottomLeft.x) / (topRight.x - bottomLeft.x)) * canvasWidth,
      y: ((point.y - topRight.y) / (bottomLeft.y - topRight.y)) * canvasHeight,
    };
  };
};
```
### MongoDB GeoJSON Storage
```python
# Store in GeoJSON format (longitude FIRST)
message_doc = {
    "location": {
        "type": "Point",
        "coordinates": [longitude, latitude]  # lng, lat order
    },
}
# Create 2dsphere index
await db.messages.create_index([("location", "2dsphere")])
# Query nearby locations
query = {
    "location": {
        "$near": {
            "$geometry": {"type": "Point", "coordinates": [lng, lat]},
            "$maxDistance": radius_km * 1000  # meters
        }
    }
}
```
### Data Storage Pattern for Drawings/Markers
```javascript
// Save as geoPoints (lat/lng), NOT screen pixels
{ geoPoints: [{ lat: 40.758, lng: -73.985 }, { lat: 40.759, lng: -73.980 }], color: "#EC4899" }
// Convert back to screen coords on each map move for rendering
```
## 5. Map Event Listeners
Re-render overlays when map moves:
```jsx
useEffect(() => {
  if (!map) return;
  const handleChange = () => renderOverlays();
  const listeners = [
    map.addListener("bounds_changed", handleChange),
    map.addListener("zoom_changed", handleChange),
    map.addListener("idle", handleChange),
  ];
  return () => listeners.forEach((l) => window.google?.maps?.event?.removeListener(l));
}, [map]);
```
## 7. Key Gotchas
- Coordinate order: Google Maps uses {lat, lng}. GeoJSON/backend uses [lng, lat]. NEVER mix these.
- mapId vs styles: Cannot use both. mapId enables AdvancedMarker.
- getBounds() returns null before map loads — use `idle` event or null check.
## 8. Common Errors & Fixes
- "InvalidKeyMapError" → Check REACT_APP_GOOGLE_MAPS_API_KEY in .env, restart frontend
- AdvancedMarker not showing → Add `mapId` prop to Map component
- Markers missing in loops → Add unique `key` prop
- Drawings drift on pan/zoom → Store as lat/lng, convert to screen on render