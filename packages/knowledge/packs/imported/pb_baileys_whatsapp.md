Summary: **VERIFIED_PLAYBOOK**

**DISCLAIMER: This is a newly created playbook based on deep research. It has not been verified through testing and may require adjustments during implementation.**

# Baileys WhatsApp Web API Integration Playbook

## Overview

This playbook provides a complete integration guide for building a WhatsApp bot using the Baileys library for Node.js, integrated with a FastAPI backend for task management. The solution uses a hybrid architecture where Node.js handles WhatsApp protocol communication while FastAPI manages business logic and database operations.

## Required API Keys/Tokens

- **No API keys required** - Baileys connects directly to WhatsApp Web using your personal WhatsApp account
- **Redis connection string** (for session persistence)
- **MongoDB connection string** (for task storage)

## System Architecture

### Core Components:

- **Node.js Microservice**: Handles Baileys WebSocket connections and WhatsApp protocol logic
- **FastAPI Backend**: Manages task business logic, REST endpoints, and database operations
- **Redis Cache**: Stores session credentials and message queues
- **React Frontend**: QR display and task management interface
- **MongoDB**: Task storage and user management

## Installation Requirements

### Node.js Service (Baileys Core):

```bash
npm init -y
npm install @whiskeysockets/baileys qrcode-terminal redis express cors axios

```

### FastAPI Backend:

```bash
pip install fastapi uvicorn redis aioredis pymongo motor httpx python-multipart

```

### React Frontend:

```bash
npm install react-qr-code axios socket.io-client @mui/material

```

## Implementation

### 1. Node.js WhatsApp Service

Create `whatsapp-service.js`:

```jsx
const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')
const express = require('express')
const cors = require('cors')
const Redis = require('redis')
const axios = require('axios')

const app = express()
app.use(cors())
app.use(express.json())

const redis = Redis.createClient()
const FASTAPI_URL = process.env.FASTAPI_URL || '<http://localhost:8000>'

let sock = null
let qrCode = null

async function initWhatsApp() {
    try {
        const { state, saveCreds } = await useMultiFileAuthState('auth_info')

        sock = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            browser: ['Task Bot', 'Chrome', '1.0.0']
        })

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update

            if (qr) {
                qrCode = qr
                await redis.set('whatsapp:qr', qr, 'EX', 60)
                console.log('QR Code generated')
            }

            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut
                console.log('Connection closed due to ', lastDisconnect?.error, ', reconnecting ', shouldReconnect)

                if (shouldReconnect) {
                    setTimeout(initWhatsApp, 5000)
                }
            } else if (connection === 'open') {
                console.log('WhatsApp connected successfully')
                qrCode = null
                await redis.del('whatsapp:qr')
            }
        })

        sock.ev.on('messages.upsert', async ({ messages, type }) => {
            if (type === 'notify') {
                for (const message of messages) {
                    if (!message.key.fromMe && message.message) {
                        await handleIncomingMessage(message)
                    }
                }
            }
        })

        sock.ev.on('creds.update', saveCreds)

    } catch (error) {
        console.error('WhatsApp initialization error:', error)
        setTimeout(initWhatsApp, 10000)
    }
}

async function handleIncomingMessage(message) {
    try {
        const phoneNumber = message.key.remoteJid.replace('@s.whatsapp.net', '')
        const messageText = message.message.conversation ||
                           message.message.extendedTextMessage?.text || ''

        // Forward message to FastAPI for processing
        const response = await axios.post(`${FASTAPI_URL}/api/whatsapp/message`, {
            phone_number: phoneNumber,
            message: messageText,
            message_id: message.key.id,
            timestamp: message.messageTimestamp
        })

        // Send response back to WhatsApp if FastAPI returns one
        if (response.data.reply) {
            await sendMessage(phoneNumber, response.data.reply)
        }

    } catch (error) {
        console.error('Error handling incoming message:', error)
    }
}

async function sendMessage(phoneNumber, text) {
    try {
        if (!sock) {
            throw new Error('WhatsApp not connected')
        }

        const jid = phoneNumber.includes('@') ? phoneNumber : `${phoneNumber}@s.whatsapp.net`
        await sock.sendMessage(jid, { text })
        return { success: true }

    } catch (error) {
        console.error('Error sending message:', error)
        return { success: false, error: error.message }
    }
}

// REST API endpoints
app.get('/qr', async (req, res) => {
    try {
        const qr = await redis.get('whatsapp:qr')
        res.json({ qr: qr || null })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

app.post('/send', async (req, res) => {
    const { phone_number, message } = req.body
    const result = await sendMessage(phone_number, message)
    res.json(result)
})

app.get('/status', (req, res) => {
    res.json({
        connected: sock?.user ? true : false,
        user: sock?.user || null
    })
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
    console.log(`WhatsApp service running on port ${PORT}`)
    initWhatsApp()
})

```

### 2. FastAPI Backend Integration

Create `whatsapp_routes.py`:

```python
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
import httpx
import re
from datetime import datetime

from database import get_database
from models import Task, User

router = APIRouter(prefix="/api/whatsapp", tags=["whatsapp"])

WHATSAPP_SERVICE_URL = "<http://localhost:3001>"

class IncomingMessage(BaseModel):
    phone_number: str
    message: str
    message_id: str
    timestamp: int

class OutgoingMessage(BaseModel):
    phone_number: str
    message: str

class MessageResponse(BaseModel):
    reply: Optional[str] = None
    success: bool = True

@router.post("/message", response_model=MessageResponse)
async def handle_whatsapp_message(
    message_data: IncomingMessage,
    db = Depends(get_database)
):
    """Process incoming WhatsApp messages and generate responses"""
    try:
        phone_number = message_data.phone_number
        message_text = message_data.message.strip().lower()

        # Get or create user
        user = await get_or_create_user(db, phone_number)

        # Parse command
        response = await process_task_command(db, user, message_text)

        return MessageResponse(reply=response)

    except Exception as e:
        return MessageResponse(
            reply="Sorry, I encountered an error processing your request. Please try again.",
            success=False
        )

async def get_or_create_user(db, phone_number: str):
    """Get existing user or create new one"""
    users_collection = db.users

    user = await users_collection.find_one({"phone_number": phone_number})
    if not user:
        user_data = {
            "phone_number": phone_number,
            "created_at": datetime.utcnow(),
            "task_count": 0
        }
        result = await users_collection.insert_one(user_data)
        user_data["_id"] = result.inserted_id
        return user_data

    return user

async def process_task_command(db, user, message_text: str) -> str:
    """Process task-related commands"""

    # Create task command: "create task: buy groceries"
    if message_text.startswith("create task:"):
        task_description = message_text.replace("create task:", "").strip()
        if not task_description:
            return "Please provide a task description. Example: 'create task: buy groceries'"

        task_data = {
            "user_id": str(user["_id"]),
            "phone_number": user["phone_number"],
            "description": task_description,
            "completed": False,
            "created_at": datetime.utcnow()
        }

        tasks_collection = db.tasks
        result = await tasks_collection.insert_one(task_data)

        # Update user task count
        await db.users.update_one(
            {"_id": user["_id"]},
            {"$inc": {"task_count": 1}}
        )

        return f"✅ Task created: {task_description}"

    # List tasks command: "list tasks"
    elif message_text in ["list tasks", "show tasks", "my tasks"]:
        tasks_collection = db.tasks
        tasks = await tasks_collection.find({
            "user_id": str(user["_id"]),
            "completed": False
        }).to_list(length=20)

        if not tasks:
            return "📝 You have no pending tasks."

        response = "📋 Your pending tasks:\
\
"
        for i, task in enumerate(tasks, 1):
            response += f"{i}. {task['description']}\
"

        response += f"\
Total: {len(tasks)} tasks"
        return response

    # Complete task command: "complete task 1"
    elif message_text.startswith("complete task"):
        try:
            task_number = int(re.search(r'\\d+', message_text).group())
        except (AttributeError, ValueError):
            return "Please specify a task number. Example: 'complete task 1'"

        tasks_collection = db.tasks
        tasks = await tasks_collection.find({
            "user_id": str(user["_id"]),
            "completed": False
        }).to_list(length=100)

        if task_number < 1 or task_number > len(tasks):
            return f"Invalid task number. You have {len(tasks)} pending tasks."

        task_to_complete = tasks[task_number - 1]

        await tasks_collection.update_one(
            {"_id": task_to_complete["_id"]},
            {
                "$set": {
                    "completed": True,
                    "completed_at": datetime.utcnow()
                }
            }
        )

        return f"✅ Completed: {task_to_complete['description']}"

    # Help command
    elif message_text in ["help", "commands", "?"]:
        return """🤖 Task Bot Commands:

📝 Create task: create task: [description]
📋 List tasks: list tasks
✅ Complete task: complete task [number]
❓ Help: help

Examples:
• create task: buy groceries
• list tasks
• complete task 1"""

    else:
        return """I didn't understand that command. Send 'help' to see available commands.

Quick examples:
• create task: buy groceries
• list tasks
• complete task 1"""

@router.post("/send")
async def send_whatsapp_message(message: OutgoingMessage):
    """Send message via WhatsApp service"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{WHATSAPP_SERVICE_URL}/send",
                json={
                    "phone_number": message.phone_number,
                    "message": message.message
                }
            )
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/qr")
async def get_qr_code():
    """Get current QR code for authentication"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{WHATSAPP_SERVICE_URL}/qr")
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status")
async def get_whatsapp_status():
    """Get WhatsApp connection status"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{WHATSAPP_SERVICE_URL}/status")
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

```

### 3. React Frontend Components

Create `WhatsAppQR.jsx`:

```jsx
import React, { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { Box, Typography, Button, Alert, CircularProgress } from '@mui/material';
import axios from 'axios';

const WhatsAppQR = () => {
    const [qrCode, setQrCode] = useState(null);
    const [status, setStatus] = useState('disconnected');
    const [loading, setLoading] = useState(false);

    const checkStatus = async () => {
        try {
            const response = await axios.get('/api/whatsapp/status');
            setStatus(response.data.connected ? 'connected' : 'disconnected');
            return response.data.connected;
        } catch (error) {
            console.error('Status check failed:', error);
            setStatus('error');
            return false;
        }
    };

    const fetchQR = async () => {
        try {
            const response = await axios.get('/api/whatsapp/qr');
            if (response.data.qr) {
                setQrCode(response.data.qr);
            } else {
                setQrCode(null);
            }
        } catch (error) {
            console.error('QR fetch failed:', error);
        }
    };

    const startPolling = () => {
        const interval = setInterval(async () => {
            const isConnected = await checkStatus();
            if (isConnected) {
                setQrCode(null);
                clearInterval(interval);
            } else {
                await fetchQR();
            }
        }, 3000);

        return interval;
    };

    useEffect(() => {
        checkStatus();
        const interval = startPolling();

        return () => clearInterval(interval);
    }, []);

    const handleConnect = async () => {
        setLoading(true);
        await checkStatus();
        if (status !== 'connected') {
            startPolling();
        }
        setLoading(false);
    };

    return (
        <Box sx={{ textAlign: 'center', p: 3 }}>
            <Typography variant="h4" gutterBottom>
                WhatsApp Task Bot
            </Typography>

            {status === 'connected' && (
                <Alert severity="success" sx={{ mb: 2 }}>
                    WhatsApp is connected! You can now send task commands.
                </Alert>
            )}

            {status === 'disconnected' && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                    WhatsApp is not connected. Scan the QR code to connect.
                </Alert>
            )}

            {status === 'error' && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    Connection error. Please check if the WhatsApp service is running.
                </Alert>
            )}

            {qrCode && (
                <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        Scan this QR code with WhatsApp:
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                        <QRCode value={qrCode} size={256} />
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                        Open WhatsApp → Settings → Linked Devices → Link a Device
                    </Typography>
                </Box>
            )}

            <Button
                variant="contained"
                onClick={handleConnect}
                disabled={loading || status === 'connected'}
                startIcon={loading && <CircularProgress size={20} />}
            >
                {status === 'connected' ? 'Connected' : 'Connect WhatsApp'}
            </Button>

            {status === 'connected' && (
                <Box sx={{ mt: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        Available Commands:
                    </Typography>
                    <Typography variant="body2" component="div" sx={{ textAlign: 'left', maxWidth: 400, mx: 'auto' }}>
                        • <strong>create task: [description]</strong> - Create a new task<br/>
                        • <strong>list tasks</strong> - Show all pending tasks<br/>
                        • <strong>complete task [number]</strong> - Mark task as completed<br/>
                        • <strong>help</strong> - Show all commands
                    </Typography>
                </Box>
            )}
        </Box>
    );
};

export default WhatsAppQR;

```

### 4. Database Models

Create `models.py`:

```python
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from bson import ObjectId

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid objectid")
        return ObjectId(v)

    @classmethod
    def __modify_schema__(cls, field_schema):
        field_schema.update(type="string")

class User(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    phone_number: str
    created_at: datetime
    task_count: int = 0

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class Task(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    user_id: str
    phone_number: str
    description: str
    completed: bool = False
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

```

### 5. Session Persistence & Reconnection

The Baileys library automatically handles session persistence through the `useMultiFileAuthState` function, which saves authentication credentials to the `auth_info` directory. For production, consider implementing database-backed session storage:

```jsx
// Enhanced session management
const { MongoClient } = require('mongodb')

class DatabaseAuthState {
    constructor(mongoUrl, userId) {
        this.client = new MongoClient(mongoUrl)
        this.userId = userId
    }

    async saveCreds(creds) {
        await this.client.db('whatsapp').collection('auth').updateOne(
            { userId: this.userId },
            { $set: { creds, updatedAt: new Date() } },
            { upsert: true }
        )
    }

    async loadCreds() {
        const doc = await this.client.db('whatsapp').collection('auth').findOne({ userId: this.userId })
        return doc?.creds || {}
    }
}

```

### 6. Testing

Create `test_whatsapp.py`:

```python
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_whatsapp_status():
    response = client.get("/api/whatsapp/status")
    assert response.status_code == 200
    assert "connected" in response.json()

def test_message_processing():
    message_data = {
        "phone_number": "1234567890",
        "message": "create task: test task",
        "message_id": "test123",
        "timestamp": 1234567890
    }

    response = client.post("/api/whatsapp/message", json=message_data)
    assert response.status_code == 200
    assert "Task created" in response.json()["reply"]

def test_qr_endpoint():
    response = client.get("/api/whatsapp/qr")
    assert response.status_code == 200

```

### 7. Deployment Configuration

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  whatsapp-service:
    build: ./whatsapp-service
    ports:
      - "3001:3001"
    volumes:
      - ./auth_info:/app/auth_info
    environment:
      - FASTAPI_URL=http://fastapi-backend:8000
    depends_on:
      - redis

  fastapi-backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - MONGODB_URL=mongodb://mongo:27017/taskbot
      - REDIS_URL=redis://redis:6379
    depends_on:
      - mongo
      - redis

  react-frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_API_URL=http://localhost:8000

  mongo:
    image: mongo:5
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

  redis:
    image: redis:7
    ports:
      - "6379:6379"

volumes:
  mongo_data:

```

## Security Considerations

1. **Authentication Storage**: Store WhatsApp credentials securely, preferably encrypted
2. **Rate Limiting**: Implement rate limiting to prevent spam
3. **User Validation**: Validate phone numbers and sanitize input
4. **Error Handling**: Don't expose internal errors to WhatsApp users
5. **Logging**: Log all interactions for debugging and monitoring

## Common Issues & Solutions

1. **QR Code Expiration**: QR codes expire after 60 seconds. Implement auto-refresh
2. **Connection Drops**: Handle reconnection gracefully with exponential backoff
3. **Message Delivery**: WhatsApp may delay or drop messages during high load
4. **Multi-Device**: Baileys supports multi-device, but session management becomes complex
5. **Rate Limits**: WhatsApp has undocumented rate limits. Monitor for blocks

## Production Checklist

- [ ]  Set up proper logging and monitoring
- [ ]  Implement database backups
- [ ]  Configure SSL/TLS for all services
- [ ]  Set up health checks for all components
- [ ]  Implement proper error handling and user feedback
- [ ]  Test reconnection scenarios
- [ ]  Monitor WhatsApp connection stability
- [ ]  Set up alerts for service failures

This playbook provides a complete foundation for building a WhatsApp task management bot using Baileys with FastAPI backend integration. The hybrid architecture ensures scalability while maintaining the real-time capabilities required for WhatsApp communication.