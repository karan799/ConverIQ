# ConverIQ - Real-Time Lead Scoring System Setup Guide

This guide will help you set up and run the ConverIQ real-time conversation analysis system with live ML predictions.

## System Overview

The system consists of:
- **Backend**: Flask + SocketIO server with ML scoring engine
- **Frontend**: React + TypeScript dashboard with WebSocket client
- **Database**: PostgreSQL for conversation storage
- **ML Engine**: Sentiment analysis + lead scoring using transformers

## Prerequisites

1. **Python 3.9+** installed
2. **Node.js 18+** and npm installed
3. **PostgreSQL** installed and running
4. **Git** (for version control)

## Step 1: Database Setup

### Install PostgreSQL (if not already installed)

**Windows:**
```powershell
# Download from https://www.postgresql.org/download/windows/
# Or use chocolatey:
choco install postgresql
```

### Create Database

```powershell
# Open PostgreSQL command line (psql)
psql -U postgres

# In psql, create the database:
CREATE DATABASE converiq;

# Exit psql
\q
```

## Step 2: Backend Setup

### Navigate to Backend Directory
```powershell
cd Backend
```

### Create Virtual Environment
```powershell
python -m venv venv

# Activate virtual environment
.\venv\Scripts\Activate.ps1
```

### Install Dependencies
```powershell
pip install -r requirements.txt
```

**Note:** This may take 5-10 minutes as it downloads ML models (torch, transformers, whisper).

### Configure Environment
```powershell
# Copy example env file
Copy-Item .env.example .env

# Edit .env file if needed (default settings should work)
```

### Initialize Database
```powershell
python -c "from models import init_db; from config import Config; init_db(Config.SQLALCHEMY_DATABASE_URI)"
```

### Run Backend Server
```powershell
python app.py
```

The backend will start on `http://localhost:5000`. You should see:
```
Starting ConverIQ Server on port 5000...
Initializing ML models...
Loading sentiment analysis model...
ML Engine initialized successfully!
Server ready!
```

**Keep this terminal running!**

## Step 3: Frontend Setup

### Open New Terminal and Navigate to Frontend
```powershell
cd Frontend
```

### Install Dependencies
```powershell
npm install
```

### Run Frontend Development Server
```powershell
npm run dev
```

The frontend will start on `http://localhost:5173` (or similar port shown in terminal).

**Keep this terminal running!**

## Step 4: Using the Application

### Access the Dashboard
1. Open browser and go to `http://localhost:5173`
2. You'll see the ConverIQ dashboard with sample leads

### Start a Real-Time Conversation
1. Click **"+ New Call"** button
2. Enter customer details (Name and Phone)
3. Click **"Make Call"**

### Simulate Conversation
The call screen will show:
- **Two input boxes**: One for Agent messages, one for Client messages
- **Live chat display**: Messages appear in real-time with sentiment labels
- **Live Conversion Score**: Updates after each message
- **AI Insights**: Shows factors contributing to the score

#### Example Conversation Flow:

**Agent:** "Hello, this is Care Lead Insurance. Am I speaking with Rahul?"
*Type in Agent input box and press Enter or click "Send as Agent"*

**Client:** "Yes, this is Rahul."
*Type in Client input box and press Enter or click "Send as Client"*

**Agent:** "I'm calling to discuss a health insurance plan suitable for you."

**Client:** "That sounds interesting. Tell me more about the coverage."

**Agent:** "It covers hospitalization, critical illness, and annual health checkups."

**Client:** "Great! I'm definitely interested. When can I sign up?"

Watch as the **conversion score increases** and AI insights update in real-time!

### End Conversation
Click **"End Call"** button when done. The conversation is saved to the database.

## Features Demonstrated

### Real-Time Processing
- Messages are sent via WebSocket
- ML model analyzes sentiment instantly
- Lead score updates after each message

### ML Scoring Components
1. **Sentiment Analysis** (30% weight)
   - Analyzes positive/negative tone
   - Shows sentiment label on each message

2. **Buying Signals** (35% weight)
   - Detects keywords like "interested", "sign up", "budget"
   - Identifies urgency indicators

3. **Engagement Level** (20% weight)
   - Tracks message count and participation

4. **Response Quality** (15% weight)
   - Evaluates message length and detail

### AI Insights
The system shows factors like:
- "Positive sentiment (0.87)"
- "3 buying signals detected"
- "Urgency indicators present"
- "High engagement level"

## Troubleshooting

### Backend Issues

**Problem:** `ModuleNotFoundError: No module named 'flask'`
```powershell
# Make sure virtual environment is activated
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

**Problem:** `Database connection error`
```powershell
# Check PostgreSQL is running
# Verify credentials in .env file match your PostgreSQL setup
```

**Problem:** ML models downloading slowly
- This is normal on first run (downloading ~500MB of models)
- Subsequent runs will be much faster

### Frontend Issues

**Problem:** `Cannot connect to server`
- Ensure backend is running on port 5000
- Check VITE_SOCKET_URL in Frontend/.env

**Problem:** `Module not found: socket.io-client`
```powershell
npm install
```

### WebSocket Connection Issues

**Problem:** "Failed to connect to server"
1. Verify backend is running: `http://localhost:5000/health`
2. Check browser console for errors
3. Ensure no firewall blocking port 5000

## Database Schema

The system creates three tables:

### conversations
- Stores call metadata (call_id, agent, customer, scores)

### messages
- Individual messages with sentiment analysis

### predictions
- Score history for each conversation

## API Endpoints

### REST Endpoints
- `GET /health` - Health check
- `GET /api/conversations` - List all conversations
- `GET /api/conversation/<call_id>` - Get conversation details

### WebSocket Events

**Client to Server:**
- `start_conversation` - Start new conversation
- `send_message` - Send message (Agent or Client)
- `end_conversation` - End conversation
- `join_conversation` - Join existing conversation

**Server to Client:**
- `connected` - Connection established
- `conversation_started` - Conversation created
- `new_message` - New message received
- `prediction_update` - Score updated
- `conversation_ended` - Conversation ended
- `error` - Error occurred

## Performance Notes

- First message may take 2-3 seconds (ML model initialization)
- Subsequent messages process in <1 second
- System can handle multiple concurrent conversations
- Sentiment analysis runs on CPU (GPU support available with CUDA)

## Next Steps

### For Demo/Presentation
1. Prepare 2-3 sample conversations (high/medium/low intent)
2. Show live score changes
3. Demonstrate sentiment detection
4. Highlight AI insights

### For Production
1. Add audio recording/transcription (Whisper integration)
2. Set up proper PostgreSQL database (not localhost)
3. Deploy backend to cloud (AWS/GCP/Azure)
4. Add authentication and user management
5. Train custom ML model on your data

## Support

For issues or questions:
- Check backend terminal for error messages
- Check browser console for frontend errors
- Verify all services are running (database, backend, frontend)

## Technology Stack

**Backend:**
- Flask 3.0 (Web framework)
- Flask-SocketIO (WebSocket support)
- SQLAlchemy (Database ORM)
- Transformers (HuggingFace - Sentiment analysis)
- PyTorch (Deep learning framework)

**Frontend:**
- React 19 (UI framework)
- TypeScript (Type safety)
- Socket.IO Client (WebSocket)
- Tailwind CSS (Styling)
- Vite (Build tool)

**Database:**
- PostgreSQL 14+ (Data storage)

Happy analyzing! 🚀
