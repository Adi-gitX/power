# WebSocket Integration Playbook

There is a test suite at the end of this file. Ask the agent to only save that test suite to /app/websocket_testing.md  before moving ahead.

## Requirements

### Backend
```bash
pip install python-socketio websockets aiohttp
```
- `python-socketio` - Socket.IO server implementation
- `websockets` - WebSocket protocol support
- `aiohttp` - Required for AsyncClient testing

### Frontend
```bash
npm install socket.io-client
```
- `socket.io-client` - Socket.IO client for React/JavaScript
---

## Core Setup

Code in this playbook is just for reference of how things should be done

### Backend (FastAPI + Socket.IO)

```python
logger = logging.getLogger(__name__)

sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')
fastapi_app = FastAPI()  # Keep reference for routes and lifecycle events

@sio.event
async def connect(sid, environ):
    logger.info(f"Client connected: {sid}") # Change accordingly to the requirement. Example - Track user session

@sio.event
async def disconnect(sid): 
    logger.info(f"Client disconnected: {sid}") # Change accordingly to the requirement. Example - Proper Resource Cleanup.

# REQUIRED: Room management for multi-user collaboration
# Allows broadcasting to specific groups of users (e.g., same document, plan, workspace)
@sio.event
async def join_room(sid, data):
    room_id = data.get("room_id")  # Use your identifier: plan_id, doc_id, workspace_id, etc.
    if not room_id:
        logger.warning(f" join_room called without room_id for {sid}, ignoring.")
        return
    await sio.enter_room(sid, room_id)
    logger.info(f"Client {sid} joined room {room_id}")

async def broadcast_to_room(room, message):  # To broadcast a message to all clients connected to a specific room.
    await sio.emit('update', message, room=room)

# Use fastapi_app for lifecycle events and routes
@fastapi_app.on_event("startup")
async def startup():
    logger.info("Server starting")

# Wrap FastAPI with Socket.IO
socket_app = socketio.ASGIApp(sio, other_asgi_app=fastapi_app, socketio_path='/api/socket.io')
app = socket_app

```

### Broadcast Example
```python
# Use fastapi_app for routes
@fastapi_app.post("/api/<YOUR_ENDPOINT>")
async def create_<YOUR_RESOURCE>(data: dict):
    # 1. Extract room/plan/document ID
    room_id = data.get("<YOUR_ROOM_IDENTIFIER>")
    if not room_id:
        raise HTTPException(400, "Missing room identifier")
    
    # 2. Save to database
    # (Copy data if using MongoDB to avoid ObjectId issues)
    broadcast_data = data.copy()
    await db.<YOUR_COLLECTION>.insert_one(data)
    
    # 3. Broadcast to room
    await broadcast_to_room(room_id, {
        "type": "<ACTION_TYPE>",      # e.g., "item_added", "plan_updated"
        "data": broadcast_data
    })
    
    return data

```

---

### Frontend (Socket.IO client)
```javascript
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const SOCKET_PATH = "/api/socket.io"; // Must match backend socketio_path

//  In React components, use useRef NOT global variables
function YourComponent({ room_id }) {
  const socketRef = useRef(null);  // useRef for socket storage

  useEffect(() => {
    // Initialize socket AFTER component mounts and data is ready
    socketRef.current = io(BACKEND_URL, { path: SOCKET_PATH });
    socketRef.current.on("connect", () => { 
      console.log("Connected");
      
      if (room_id) { socketRef.current.emit("join_room", { room_id });
      } else { console.warn("Missing room identifier");
      }
    }); 

    // Handle real-time updates
    socketRef.current.on("update", (data) => {
      handleRealtimeUpdate(data); // Replace with your actual handler function
    });

    // CRITICAL: Cleanup on unmount
    return () => {
      if (socketRef.current?.connected) { socketRef.current.disconnect(); }
    };
  }, [room_id]);

  // When emitting events, ALWAYS check connection first
  const sendUpdate = (data) => {
    if (socketRef.current?.connected) {  // Connection check
      socketRef.current.emit("your_event", data);
    }
  };
}

// WRONG: Never do this in React
// let socket = null;  // This causes multi-user issues!

```

---

Always include a way for users to add collaborators in any collaborative feature — for example, by providing a Room ID or a shareable link.

--- 

## Common Issues (Quick Notes)

1. 404 Socket path → Use `/api/socket.io` on both frontend + backend.  
2. ObjectId error → Copy dict before MongoDB insert.  
3. No realtime updates → Ensure room join + broadcast event exist.  
4. Duplicate items → Check `exists` before adding.  
5. Disconnects after 60s → Increase Nginx timeout to `3600s` if used.  
6. Content Loss → Implement debouncing and conflict resolution
7. Stale Data → New users should see existing content on join
8. Real-time synchronization → Add timestamp-based conflict resolution and periodic sync mechanisms for real time synchronization.
9. Premature WebSocket initialization → Ensures socket connections are only created after documentId is available.
10. React socket lifecycle → Use `useRef`, check `.connected` before emit, cleanup in useEffect return. See frontend example.
11. Clipboard permissions → Wrap `navigator.clipboard.writeText()` in try-catch with `document.execCommand('copy')` fallback. Grant test permissions via `context.grant_permissions(['clipboard-write'])`.
12. DateTime serialization: Convert datetime objects to ISO format before broadcasting.
13. Room join timeout → Emit `join_room` only after `connect` event fires. Backend must emit acknowledgment after successful room join to confirm connection.
14. FastAPI lifecycle events → Use `fastapi_app` (not reassigned `app`) for `@app.on_event()` and routes. After wrapping with Socket.IO, the variable is a `socketio.ASGIApp`, not FastAPI.
---

---

## Checklist
- [ ] `/api/socket.io` reachable  
- [ ] Clients join correct room  
- [ ] Broadcasts reach all clients  
- [ ] Optimistic update on client  
- [ ] No duplicates / serialization errors

Save the below Test Suite to `/app/websocket_testing.md` without any changes and tell the testing agent to read `/app/websocket_testing.md` for generating test cases.

## MANDATORY: WebSocket Test Suite Implementation


### Required Test Implementation

CRITICAL: You MUST implement test functions for EVERY applicable item listed below. Do NOT skip any test case.

Use `python-socketio` client to connect and test Socket.IO functionality.

1. Connection Lifecycle Testing 
- Test successful connection to `/api/socket.io`
- Test connection failure with wrong path (should fail)
- Test disconnect event fires correctly
- Test connection status tracking
- Verify resource cleanup on disconnect

2. Room Management Testing (REQUIRED if rooms are implemented)
- Test `join_room` event with valid room_id
- Test `join_room` with missing/invalid room_id (should handle gracefully)
- Test multiple clients in same room
- Test clients in different rooms (messages isolated)
- Test leaving room on disconnect

3. Broadcasting & Real-time Sync Testing 
- Test `update` event received by all clients in same room
- Test messages NOT received by clients in different rooms
- Test real-time updates propagate immediately
- Test new joiners receive existing content (if applicable)
- Test simultaneous edits don't cause data loss
- Test debounced updates persist correctly (no data loss during rapid changes)

4. Error Handling Testing 
- Test malformed room_id handling
- Test missing data in events
- Test rapid connect/disconnect cycles
- Test socket connection status checks before emitting (verify `socket.connected` is checked)
- Test behavior when emitting during disconnect (should handle gracefully or queue)
- Test reconnection logic with exponential backoff

5. Multi-user Collaboration Testing (REQUIRED if collaboration exists)
- Test 2+ users in same room receive each other's updates
- Test no data loss with concurrent users
- Test user addition/removal from room
- Test access control if authentication exists

6. Performance Testing 
- Test multiple concurrent rooms
- Test rapid successive updates (no message loss)

### Backend Implementation Requirements

- Use `python-socketio` client library (NOT `requests`)
- Create test class with Socket.IO connection methods
- Test actual Socket.IO events (`connect`, `disconnect`, `join_room`, `update`)
- Include both positive and negative test cases
- Test only features that exist in the application
- Generate test report showing pass/fail for each category

---

## Playwright Frontend Testing

Use Playwright to test WebSocket functionality from the browser perspective.

1. Connection & UI State Testing 
- Test connection status indicator appears (connected/disconnected)
- Test UI enables/disables features based on connection state
- Test reconnection UI feedback on network interruption

2. Real-time Updates in UI 
- Test changes from User A appear in User B's browser immediately
- Test optimistic updates render before server confirmation
- Test UI updates don't cause flickering or re-renders

3. Multi-user Collaboration Flow (REQUIRED if collaboration exists)
- Test 2 browsers in same room see each other's edits
- Test presence indicators (user avatars, typing indicators)
- Test cursor positions sync across users (if applicable)

4. Error Handling & Edge Cases 
- Test UI behavior when socket disconnects mid-action
- Test queued actions sent after reconnection
- Test conflict resolution UI (e.g., merge conflicts, last-write-wins)
- Test component unmount properly disconnects socket (no memory leaks)

5. Room Management from UI (REQUIRED if rooms exist)
- Test joining room via URL/invite link
- Test room switching between different rooms
- Test leaving room on page navigation