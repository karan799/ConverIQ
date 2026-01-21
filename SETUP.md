# ConverIQ - Setup Guide

Complete setup instructions for running the ConverIQ real-time sales call analysis system.

## Prerequisites

- **Python 3.9+** - [Download](https://www.python.org/downloads/)
- **Node.js 18+** - [Download](https://nodejs.org/)
- **FFmpeg** - Required for audio processing
  - Windows: `winget install FFmpeg` or download from [ffmpeg.org](https://ffmpeg.org/download.html)
  - Mac: `brew install ffmpeg`
  - Linux: `sudo apt install ffmpeg`

## Installation

### 1. Backend Setup

```bash
# Navigate to backend directory
cd ConverIQ/Backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# Windows (CMD):
.\venv\Scripts\activate.bat
# Linux/Mac:
source venv/bin/activate

# Install dependencies (may take 5-10 minutes for ML models)
pip install -r requirements.txt
```

### 2. Frontend Setup

```bash
# Navigate to frontend directory
cd ConverIQ/Frontend

# Install dependencies
npm install
```

## Running the Application

### Start Backend Server

```bash
cd ConverIQ/Backend

# Activate virtual environment if not active
.\venv\Scripts\Activate.ps1  # Windows
source venv/bin/activate      # Linux/Mac

# Run server
python app.py
```

You should see:
```
==================================================
  ConverIQ - AI Sales Call Analysis Server
==================================================

  Initializing ML models...

  Server running on http://localhost:5000
  Ready for connections.
```

**Keep this terminal running!**

### Start Frontend

```bash
# Open new terminal
cd ConverIQ/Frontend

# Start development server
npm run dev
```

Frontend runs on `http://localhost:5173`

## Usage

### Option 1: Upload Audio Recording

1. Open `http://localhost:5173` in your browser
2. Click **"+ New Call"**
3. Enter customer details and click **"Make Call"**
4. Upload an audio file (MP3, WAV, M4A)
5. Watch real-time transcription and lead scoring

### Option 2: Live Recording

1. Click **"Live Record"** from the dashboard
2. Allow microphone access when prompted
3. Click **"Start Recording"**
4. Speak into your microphone
5. View real-time transcription and insights

## Understanding the Scores

### Lead Score (0-100)

| Range | Label | Meaning |
|-------|-------|---------|
| 70-100 | Hot | High conversion probability |
| 40-69 | Warm | Moderate interest |
| 0-39 | Cold | Low interest |

### Score Components

- **Sentiment** (30%): Customer's emotional tone
- **Buying Intent** (35%): Interest and purchase signals
- **Engagement** (20%): Participation level
- **Quality** (15%): Response depth

### Bonus Indicators

- **Decision Maker**: Customer has purchasing authority
- **High-Value**: Premium product interest
- **Urgency**: Time-sensitive buying signals

## Troubleshooting

### Backend won't start

```bash
# Ensure virtual environment is activated
# Windows:
.\venv\Scripts\Activate.ps1

# Reinstall dependencies
pip install -r requirements.txt
```

### FFmpeg not found

- Ensure FFmpeg is installed and in your system PATH
- Restart terminal after installation

### WebSocket connection failed

- Verify backend is running on port 5000
- Check `http://localhost:5000/health` returns `{"status": "healthy"}`

### First run is slow

- ML models download on first run (~500MB)
- Subsequent runs are much faster

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 5000 | Backend server port |
| `WHISPER_MODEL_SIZE` | base | Whisper model size (tiny/base/small/medium) |

### Whisper Model Options

| Model | Speed | Accuracy | Memory |
|-------|-------|----------|--------|
| tiny | Fastest | Lower | ~1GB |
| base | Fast | Good | ~1GB |
| small | Medium | Better | ~2GB |
| medium | Slow | Best | ~5GB |

## Demo Tips

1. **Prepare sample conversations** with varying intent levels
2. **Use clear audio** for best transcription results
3. **Show live score changes** as conversation progresses
4. **Highlight AI insights** panel for detected signals

## Tech Stack

| Component | Technology |
|-----------|------------|
| Backend | Flask, Flask-SocketIO |
| ML Engine | OpenAI Whisper, HuggingFace Transformers |
| Frontend | React 18, TypeScript, Tailwind CSS |
| Real-time | Socket.IO |
