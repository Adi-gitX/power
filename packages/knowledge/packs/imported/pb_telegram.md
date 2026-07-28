Summary: **VERIFIED_PLAYBOOK**

**DISCLAIMER: This is a newly created playbook based on deep research. It has not been verified through testing and may require adjustments for your specific environment.**

# Telegram Bot API Integration Playbook

## Required API Keys/Tokens

- **Telegram Bot Token**: Obtain from @BotFather on Telegram
- **MongoDB Connection String**: Your MongoDB database credentials
- **Webhook Secret**: Generate a secure random string for webhook validation

## Installation

```bash
# Backend dependencies
pip install fastapi uvicorn python-multipart httpx motor pymongo python-telegram-bot

# Frontend dependencies (if using React)
npm install axios react-markdown

```

## Environment Setup

```python
# .env file
TELEGRAM_TOKEN="your_bot_token_from_botfather"
MONGODB_URI="mongodb://localhost:27017/telegram_bot_db"
WEBHOOK_SECRET="your_secure_random_string"

```

## FastAPI Backend Implementation

### 1. Basic Bot Setup

```python
from fastapi import FastAPI, HTTPException, Request
from telegram import Bot, Update
from telegram.constants import ParseMode
import httpx
import os
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio
from datetime import datetime

app = FastAPI()

# Initialize Telegram Bot
bot = Bot(token=os.getenv("TELEGRAM_TOKEN"))

# MongoDB setup
@app.on_event("startup")
async def startup_db_client():
    app.mongodb_client = AsyncIOMotorClient(os.getenv("MONGODB_URI"))
    app.mongodb = app.mongodb_client.telegram_bot_db

@app.on_event("shutdown")
async def shutdown_db_client():
    app.mongodb_client.close()

```

### 2. Message Sending with Markdown Support

```python
@app.post("/send-message")
async def send_telegram_message(chat_id: int, message: str, parse_mode: str = "MarkdownV2"):
    try:
        # Escape special characters for MarkdownV2
        if parse_mode == "MarkdownV2":
            message = escape_markdown_v2(message)

        await bot.send_message(
            chat_id=chat_id,
            text=message,
            parse_mode=parse_mode
        )

        # Log message to MongoDB
        await app.mongodb.messages.insert_one({
            "chat_id": chat_id,
            "message": message,
            "timestamp": datetime.utcnow(),
            "status": "sent"
        })

        return {"status": "success", "message": "Message sent successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send message: {str(e)}")

def escape_markdown_v2(text: str) -> str:
    """Escape special characters for MarkdownV2"""
    special_chars = ['_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!']
    for char in special_chars:
        text = text.replace(char, f'\\\\{char}')
    return text

```

### 3. Webhook Handler for Bot Commands

```python
@app.post("/webhook/{secret}")
async def telegram_webhook(secret: str, request: Request):
    if secret != os.getenv("WEBHOOK_SECRET"):
        raise HTTPException(status_code=403, detail="Invalid webhook secret")

    try:
        update_data = await request.json()
        update = Update.de_json(update_data, bot)

        if update.message:
            await handle_message(update.message)

        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Webhook processing failed: {str(e)}")

async def handle_message(message):
    """Handle incoming messages and commands"""
    chat_id = message.chat_id
    text = message.text

    # Log incoming message
    await app.mongodb.messages.insert_one({
        "chat_id": chat_id,
        "message": text,
        "timestamp": datetime.utcnow(),
        "direction": "incoming"
    })

    # Handle commands
    if text.startswith('/report'):
        await send_weekly_report(chat_id)
    elif text.startswith('/help'):
        help_text = """
*Available Commands:*
/report \\\\- Generate weekly report
/help \\\\- Show this help message
        """
        await bot.send_message(chat_id=chat_id, text=help_text, parse_mode="MarkdownV2")

async def send_weekly_report(chat_id: int):
    """Send formatted weekly report"""
    # Fetch data from your system (Google Forms/Sheets integration would go here)
    report_data = await get_report_data()

    # Format report with Markdown
    report_text = f"""
*📊 Weekly Report*

*Summary:*
• Total submissions: {report_data.get('total_submissions', 0)}
• Completed tasks: {report_data.get('completed_tasks', 0)}
• Pending items: {report_data.get('pending_items', 0)}

*Key Metrics:*
• Success rate: {report_data.get('success_rate', 0)}%
• Average response time: {report_data.get('avg_response_time', 0)} hours

_Generated on {datetime.now().strftime('%Y\\\\-%-m\\\\-%-d')}_
    """

    await bot.send_message(
        chat_id=chat_id,
        text=report_text,
        parse_mode="MarkdownV2"
    )

async def get_report_data():
    """Fetch report data from your database"""
    # This would integrate with your Google Forms/Sheets data
    return {
        "total_submissions": 150,
        "completed_tasks": 120,
        "pending_items": 30,
        "success_rate": 80,
        "avg_response_time": 2.5
    }

```

### 4. Error Handling

```python
from fastapi import HTTPException
from fastapi.responses import JSONResponse

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    # Log error to MongoDB
    await app.mongodb.errors.insert_one({
        "error": str(exc),
        "timestamp": datetime.utcnow(),
        "endpoint": str(request.url)
    })

    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error occurred"}
    )

```

## React Frontend Integration

### 1. Message Sender Component

```jsx
import React, { useState } from 'react';
import axios from 'axios';

const TelegramMessageSender = () => {
    const [chatId, setChatId] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');

    const sendMessage = async () => {
        setLoading(true);
        try {
            const response = await axios.post('/api/send-message', {
                chat_id: parseInt(chatId),
                message: message,
                parse_mode: 'MarkdownV2'
            });
            setStatus('Message sent successfully!');
        } catch (error) {
            setStatus(`Error: ${error.response?.data?.detail || error.message}`);
        }
        setLoading(false);
    };

    return (
        <div className="telegram-sender">
            <h3>Send Telegram Message</h3>
            <input
                type="text"
                placeholder="Chat ID"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
            />
            <textarea
                placeholder="Message (supports Markdown)"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
            />
            <button onClick={sendMessage} disabled={loading}>
                {loading ? 'Sending...' : 'Send Message'}
            </button>
            {status && <p className={status.includes('Error') ? 'error' : 'success'}>{status}</p>}
        </div>
    );
};

export default TelegramMessageSender;

```

### 2. Report Generator Component

```jsx
import React, { useState } from 'react';
import axios from 'axios';

const ReportGenerator = () => {
    const [chatId, setChatId] = useState('');
    const [loading, setLoading] = useState(false);

    const generateReport = async () => {
        setLoading(true);
        try {
            await axios.post('/api/generate-report', {
                chat_id: parseInt(chatId)
            });
            alert('Report sent successfully!');
        } catch (error) {
            alert(`Error: ${error.response?.data?.detail || error.message}`);
        }
        setLoading(false);
    };

    return (
        <div className="report-generator">
            <h3>Generate Weekly Report</h3>
            <input
                type="text"
                placeholder="Chat ID"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
            />
            <button onClick={generateReport} disabled={loading}>
                {loading ? 'Generating...' : 'Send Report'}
            </button>
        </div>
    );
};

export default ReportGenerator;

```

## MongoDB Schema

```python
# Message schema
{
    "_id": ObjectId,
    "chat_id": int,
    "message": str,
    "timestamp": datetime,
    "direction": str,  # "incoming" or "outgoing"
    "status": str,     # "sent", "failed", "pending"
    "parse_mode": str  # "MarkdownV2", "HTML", etc.
}

# Error log schema
{
    "_id": ObjectId,
    "error": str,
    "timestamp": datetime,
    "endpoint": str,
    "chat_id": int  # optional
}

```

## Setup Instructions

### 1. Create Telegram Bot

1. Message @BotFather on Telegram
2. Use `/newbot` command
3. Follow instructions to get your bot token
4. Save token in your `.env` file

### 2. Set Webhook (for production)

```python
# Set webhook URL
webhook_url = "<https://yourdomain.com/webhook/your_secret>"
await bot.set_webhook(url=webhook_url)

```

### 3. Get Chat ID

Users can get their chat ID by messaging your bot and checking the MongoDB logs, or use this endpoint:

```python
@app.get("/get-chat-id/{user_id}")
async def get_chat_id(user_id: str):
    # This would require the user to have messaged your bot first
    message = await app.mongodb.messages.find_one({"user_id": user_id})
    if message:
        return {"chat_id": message["chat_id"]}
    raise HTTPException(status_code=404, detail="User not found")

```

## Testing

### 1. Test Message Sending

```python
import pytest
from fastapi.testclient import TestClient

client = TestClient(app)

def test_send_message():
    response = client.post("/send-message", json={
        "chat_id": 123456789,
        "message": "Test message",
        "parse_mode": "MarkdownV2"
    })
    assert response.status_code == 200

```

### 2. Test Webhook

```python
def test_webhook():
    test_update = {
        "update_id": 1,
        "message": {
            "message_id": 1,
            "chat": {"id": 123456789},
            "text": "/help"
        }
    }
    response = client.post("/webhook/test_secret", json=test_update)
    assert response.status_code == 200

```

## Common Issues and Solutions

1. **MarkdownV2 Formatting Errors**: Always escape special characters
2. **Chat ID Issues**: Users must message your bot first to get their chat ID
3. **Webhook SSL**: Telegram requires HTTPS for webhooks in production
4. **Rate Limiting**: Implement delays between messages to avoid hitting Telegram's limits
5. **Bangla/English Mixed Content**: Use UTF-8 encoding and test with actual content

## Security Considerations

1. Keep your bot token secure and never expose it in client-side code
2. Use webhook secrets to validate incoming requests
3. Implement rate limiting to prevent abuse
4. Validate and sanitize all user inputs
5. Use HTTPS for all webhook endpoints

This playbook provides a complete foundation for integrating Telegram Bot API with your FastAPI/React/MongoDB stack, with specific focus on sending formatted reports and handling mixed language content.