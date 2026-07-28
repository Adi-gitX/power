Summary: **VERIFIED_PLAYBOOK**

**DISCLAIMER: This is a newly created playbook based on deep research. It has not been verified through testing and may require adjustments for your specific environment.**

**REQUIRED API KEYS/TOKENS:**

- **SLACK_SIGNING_SECRET**: Obtain from Slack App settings > Basic Information > App Credentials
- **SLACK_BOT_TOKEN**: Obtain from Slack App settings > OAuth & Permissions (starts with xoxb-)
- **MONGODB_URI**: Your MongoDB connection string

# Comprehensive Integration Playbook for Slack Bot with FastAPI and React

This guide provides a complete integration strategy for implementing Slack bot capabilities in a FastAPI/Python backend with React frontend, featuring MongoDB-driven task management, automated channel creation, and user mention workflows.

---

## 1. Core Infrastructure Setup

### 1.1 Package Installation

Install required dependencies using pip:

```bash
pip install fastapi slackers motor uvicorn python-dotenv slack-sdk

```

For React frontend, add the webhook package:

```bash
npm install react-slack-webhook

```

### 1.2 Environment Configuration

Create `.env` file:

```
SLACK_SIGNING_SECRET=your_signing_secret
SLACK_BOT_TOKEN=xoxb-your-bot-token
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/task_db
REACT_APP_BACKEND_URL=http://localhost:8000

```

Load configurations in FastAPI:

```python
from fastapi import FastAPI
from motor.motor_asyncio import AsyncIOMotorClient
import os

app = FastAPI()
app.mongodb_client = AsyncIOMotorClient(os.getenv("MONGODB_URI"))
app.mongodb = app.mongodb_client["task_db"]

```

---

## 2. Webhook Security Implementation

### 2.1 Signature Verification Middleware

```python
from fastapi import Request, HTTPException
import hmac
import hashlib
import time

async def verify_slack_signature(request: Request):
    timestamp = request.headers.get("X-Slack-Request-Timestamp")
    signature = request.headers.get("X-Slack-Signature")

    if abs(time.time() - int(timestamp)) > 60 * 5:
        raise HTTPException(400, "Invalid timestamp")

    body = await request.body()
    sig_basestring = f"v0:{timestamp}:{body.decode()}".encode()
    computed_signature = "v0=" + hmac.new(
        os.getenv("SLACK_SIGNING_SECRET").encode(),
        sig_basestring,
        hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(computed_signature, signature):
        raise HTTPException(403, "Invalid signature")

```

---

## 3. Task Management System

### 3.1 MongoDB Schema Design

```python
from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional

class Project(BaseModel):
    name: str
    channel_id: str
    channel_name: str
    created_at: datetime = datetime.utcnow()

class Task(BaseModel):
    title: str
    description: str
    project_id: str
    channel_id: str
    creator_slack_id: str
    assigned_user_slack_id: Optional[str] = None
    assigned_user_email: Optional[str] = None
    created_at: datetime = datetime.utcnow()
    status: str = "pending"

class UserMapping(BaseModel):
    slack_user_id: str
    email: str
    app_user_id: Optional[str] = None

```

### 3.2 CRUD Operations

```python
from bson import ObjectId

async def create_project(project: Project):
    result = await app.mongodb.projects.insert_one(project.dict())
    return await app.mongodb.projects.find_one({"_id": result.inserted_id})

async def get_project_by_channel(channel_id: str):
    return await app.mongodb.projects.find_one({"channel_id": channel_id})

async def create_task(task: Task):
    result = await app.mongodb.tasks.insert_one(task.dict())
    return await app.mongodb.tasks.find_one({"_id": result.inserted_id})

async def get_user_by_slack_id(slack_user_id: str):
    return await app.mongodb.user_mappings.find_one({"slack_user_id": slack_user_id})

async def create_user_mapping(user_mapping: UserMapping):
    result = await app.mongodb.user_mappings.insert_one(user_mapping.dict())
    return result.inserted_id

```

---

## 4. Slack Event Handling

### 4.1 Main Event Handler

```python
from slack_sdk import WebClient
import re
import json

@app.post("/api/slack/events")
async def handle_slack_events(request: Request):
    await verify_slack_signature(request)

    body = await request.body()
    payload = json.loads(body.decode())

    # Handle URL verification challenge
    if payload.get("type") == "url_verification":
        return {"challenge": payload["challenge"]}

    # Handle app mention events
    if payload.get("type") == "event_callback":
        event = payload.get("event", {})

        if event.get("type") == "app_mention":
            await handle_app_mention(event)

    return {"status": "ok"}

async def handle_app_mention(event):
    text = event.get("text", "")
    channel_id = event.get("channel")
    user_id = event.get("user")

    # Parse mentions and task description
    # Format: @botname @username "task description"
    mentions = parse_user_mentions(text)
    task_description = extract_task_description(text)

    if mentions and task_description:
        # Get or create project based on channel
        project = await get_or_create_project_for_channel(channel_id)

        # Get user email mapping
        assigned_user = mentions[0] if mentions else None
        user_mapping = None
        if assigned_user:
            user_mapping = await get_user_by_slack_id(assigned_user)

        # Create task
        task = Task(
            title=task_description,
            description=task_description,
            project_id=str(project["_id"]),
            channel_id=channel_id,
            creator_slack_id=user_id,
            assigned_user_slack_id=assigned_user,
            assigned_user_email=user_mapping.get("email") if user_mapping else None
        )

        created_task = await create_task(task)

        # Send confirmation message
        await send_slack_message(channel_id, f"✅ Task created: {task_description}")

def parse_user_mentions(text: str):
    # Extract user mentions from text (format: <@U1234567890>)
    return re.findall(r"<@(U[A-Z0-9]+)>", text)

def extract_task_description(text: str):
    # Extract text within quotes or after mentions
    quoted_match = re.search(r'"([^"]+)"', text)
    if quoted_match:
        return quoted_match.group(1)

    # Fallback: remove bot mention and user mentions
    clean_text = re.sub(r"<@[UW][A-Z0-9]+>", "", text).strip()
    return clean_text if clean_text else None

async def get_or_create_project_for_channel(channel_id: str):
    # Check if project exists for this channel
    project = await get_project_by_channel(channel_id)

    if not project:
        # Get channel info from Slack
        client = WebClient(token=os.getenv("SLACK_BOT_TOKEN"))
        channel_info = client.conversations_info(channel=channel_id)
        channel_name = channel_info["channel"]["name"]

        # Create new project
        new_project = Project(
            name=channel_name,
            channel_id=channel_id,
            channel_name=channel_name
        )
        project = await create_project(new_project)

    return project

async def send_slack_message(channel_id: str, message: str):
    client = WebClient(token=os.getenv("SLACK_BOT_TOKEN"))
    client.chat_postMessage(channel=channel_id, text=message)

```

---

## 5. Health Check and Status Endpoints

### 5.1 Health Check Endpoints

```python
@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow()}

@app.get("/api/slack/status")
async def slack_status():
    try:
        client = WebClient(token=os.getenv("SLACK_BOT_TOKEN"))
        auth_test = client.auth_test()
        return {
            "status": "connected",
            "bot_user_id": auth_test["user_id"],
            "team": auth_test["team"]
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/api/projects")
async def get_projects():
    projects = await app.mongodb.projects.find().to_list(None)
    return {"projects": projects}

@app.get("/api/tasks/{project_id}")
async def get_project_tasks(project_id: str):
    tasks = await app.mongodb.tasks.find({"project_id": project_id}).to_list(None)
    return {"tasks": tasks}

```

---

## 6. User Management Endpoints

### 6.1 User Mapping Management

```python
from pydantic import BaseModel

class UserMappingRequest(BaseModel):
    slack_user_id: str
    email: str
    app_user_id: Optional[str] = None

@app.post("/api/users/mapping")
async def create_user_mapping_endpoint(mapping: UserMappingRequest):
    user_mapping = UserMapping(**mapping.dict())
    mapping_id = await create_user_mapping(user_mapping)
    return {"id": str(mapping_id), "status": "created"}

@app.get("/api/users/mapping/{slack_user_id}")
async def get_user_mapping(slack_user_id: str):
    mapping = await get_user_by_slack_id(slack_user_id)
    if not mapping:
        raise HTTPException(404, "User mapping not found")
    return mapping

@app.get("/api/users/slack")
async def sync_slack_users():
    """Sync Slack workspace users for mapping"""
    client = WebClient(token=os.getenv("SLACK_BOT_TOKEN"))
    users = client.users_list()

    slack_users = []
    for user in users["members"]:
        if not user.get("deleted") and not user.get("is_bot"):
            slack_users.append({
                "id": user["id"],
                "name": user["name"],
                "real_name": user.get("real_name", ""),
                "email": user.get("profile", {}).get("email", "")
            })

    return {"users": slack_users}

```

---

## 7. Frontend Integration

### 7.1 React Components for Task Management

```jsx
import React, { useState, useEffect } from 'react';

function SlackTaskManager() {
    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [slackStatus, setSlackStatus] = useState(null);

    useEffect(() => {
        fetchProjects();
        checkSlackStatus();
    }, []);

    const fetchProjects = async () => {
        try {
            const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/projects`);
            const data = await response.json();
            setProjects(data.projects);
        } catch (error) {
            console.error('Error fetching projects:', error);
        }
    };

    const checkSlackStatus = async () => {
        try {
            const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/slack/status`);
            const data = await response.json();
            setSlackStatus(data);
        } catch (error) {
            console.error('Error checking Slack status:', error);
        }
    };

    const fetchTasks = async (projectId) => {
        try {
            const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/tasks/${projectId}`);
            const data = await response.json();
            setTasks(data.tasks);
        } catch (error) {
            console.error('Error fetching tasks:', error);
        }
    };

    return (
        <div className="slack-task-manager">
            <h2>Slack Task Manager</h2>

            <div className="status-section">
                <h3>Slack Status</h3>
                {slackStatus && (
                    <div className={`status ${slackStatus.status}`}>
                        Status: {slackStatus.status}
                        {slackStatus.bot_user_id && <span> | Bot ID: {slackStatus.bot_user_id}</span>}
                    </div>
                )}
            </div>

            <div className="projects-section">
                <h3>Projects (Channels)</h3>
                <div className="projects-list">
                    {projects.map(project => (
                        <div
                            key={project._id}
                            className={`project-item ${selectedProject?._id === project._id ? 'selected' : ''}`}
                            onClick={() => {
                                setSelectedProject(project);
                                fetchTasks(project._id);
                            }}
                        >
                            <h4>#{project.channel_name}</h4>
                            <p>Created: {new Date(project.created_at).toLocaleDateString()}</p>
                        </div>
                    ))}
                </div>
            </div>

            {selectedProject && (
                <div className="tasks-section">
                    <h3>Tasks for #{selectedProject.channel_name}</h3>
                    <div className="tasks-list">
                        {tasks.map(task => (
                            <div key={task._id} className="task-item">
                                <h4>{task.title}</h4>
                                <p>{task.description}</p>
                                <div className="task-meta">
                                    <span>Status: {task.status}</span>
                                    {task.assigned_user_email && <span> | Assigned: {task.assigned_user_email}</span>}
                                    <span> | Created: {new Date(task.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="instructions">
                <h3>How to Use</h3>
                <p>In any Slack channel, mention the bot with a user and task description:</p>
                <code>@taskbot @username "Complete the project documentation"</code>
                <p>This will automatically create a task in the project named after the channel.</p>
            </div>
        </div>
    );
}

export default SlackTaskManager;

```

### 7.2 User Mapping Component

```jsx
import React, { useState, useEffect } from 'react';

function UserMappingManager() {
    const [slackUsers, setSlackUsers] = useState([]);
    const [mappings, setMappings] = useState([]);
    const [newMapping, setNewMapping] = useState({ slack_user_id: '', email: '' });

    useEffect(() => {
        fetchSlackUsers();
    }, []);

    const fetchSlackUsers = async () => {
        try {
            const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/users/slack`);
            const data = await response.json();
            setSlackUsers(data.users);
        } catch (error) {
            console.error('Error fetching Slack users:', error);
        }
    };

    const createMapping = async () => {
        try {
            const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/users/mapping`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newMapping)
            });

            if (response.ok) {
                setNewMapping({ slack_user_id: '', email: '' });
                alert('User mapping created successfully!');
            }
        } catch (error) {
            console.error('Error creating mapping:', error);
        }
    };

    return (
        <div className="user-mapping-manager">
            <h2>User Mapping Management</h2>

            <div className="create-mapping">
                <h3>Create New Mapping</h3>
                <select
                    value={newMapping.slack_user_id}
                    onChange={(e) => setNewMapping({...newMapping, slack_user_id: e.target.value})}
                >
                    <option value="">Select Slack User</option>
                    {slackUsers.map(user => (
                        <option key={user.id} value={user.id}>
                            {user.real_name} (@{user.name})
                        </option>
                    ))}
                </select>

                <input
                    type="email"
                    placeholder="Email address"
                    value={newMapping.email}
                    onChange={(e) => setNewMapping({...newMapping, email: e.target.value})}
                />

                <button onClick={createMapping}>Create Mapping</button>
            </div>
        </div>
    );
}

export default UserMappingManager;

```

---

## 8. Slack App Configuration

### 8.1 Required Slack App Settings

**OAuth & Permissions - Bot Token Scopes:**

- `app_mentions:read` - Listen for mentions
- `channels:read` - Read channel information
- `chat:write` - Send messages
- `users:read` - Read user information
- `users:read.email` - Read user email addresses

**Event Subscriptions:**

- Request URL: `https://your-domain.com/api/slack/events`
- Subscribe to Bot Events:
    - `app_mention` - When bot is mentioned

**App Home:**

- Enable "Messages Tab"
- Allow users to send DMs

### 8.2 Installation Instructions

1. Create a new Slack app at https://api.slack.com/apps
2. Configure OAuth scopes as listed above
3. Set up Event Subscriptions with your webhook URL
4. Install the app to your workspace
5. Copy the Bot User OAuth Token and Signing Secret to your `.env` file

---

## 9. Testing & Validation

### 9.1 Local Development Setup

```bash
# Start FastAPI server
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# In another terminal, expose with ngrok
ngrok http 8000

```

### 9.2 Testing Scenarios

```python
# Test webhook signature verification
import pytest
from fastapi.testclient import TestClient

def test_slack_event_verification():
    client = TestClient(app)

    # Test with invalid signature
    response = client.post("/api/slack/events",
                          json={"type": "url_verification", "challenge": "test"},
                          headers={"X-Slack-Signature": "invalid"})
    assert response.status_code == 403

def test_project_creation():
    # Test auto-creation of projects
    pass

def test_task_creation():
    # Test task creation from mentions
    pass

```

---

## 10. Error Handling and Logging

### 10.1 Comprehensive Error Handling

```python
import logging
from fastapi import HTTPException

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )

async def handle_app_mention(event):
    try:
        # ... existing code ...
        logger.info(f"Successfully processed mention in channel {event.get('channel')}")
    except Exception as e:
        logger.error(f"Error processing app mention: {str(e)}", exc_info=True)
        # Send error message to Slack
        await send_slack_message(event.get('channel'), "❌ Sorry, I couldn't process that request.")

```

---

## 11. Production Deployment

### 11.1 Environment Variables

```bash
# Production .env
SLACK_SIGNING_SECRET=your_production_signing_secret
SLACK_BOT_TOKEN=xoxb-your-production-bot-token
MONGODB_URI=mongodb+srv://prod-user:pass@prod-cluster.mongodb.net/task_db
REACT_APP_BACKEND_URL=https://your-production-domain.com

```

### 11.2 Database Indexes

```python
# Create indexes for better performance
async def create_indexes():
    await app.mongodb.projects.create_index("channel_id", unique=True)
    await app.mongodb.tasks.create_index([("project_id", 1), ("created_at", -1)])
    await app.mongodb.user_mappings.create_index("slack_user_id", unique=True)
    await app.mongodb.user_mappings.create_index("email", unique=True)

# Call during startup
@app.on_event("startup")
async def startup_event():
    await create_indexes()

```

---

## 12. Common Issues & Solutions

**Problem**: Webhook verification failures

**Solution**: Ensure your signing secret is correct and handle request body parsing properly

**Problem**: Bot not responding to mentions

**Solution**: Check that the bot is added to the channel and has proper permissions

**Problem**: User mapping not working

**Solution**: Ensure users have email addresses in their Slack profiles and proper scopes are configured

**Problem**: MongoDB connection issues

**Solution**: Use connection pooling and implement retry logic

---

This comprehensive playbook provides everything needed to implement a Slack bot integration with task management capabilities. The system automatically creates projects based on channel names, handles user mentions for task assignment, and provides a complete web interface for managing the integration.
