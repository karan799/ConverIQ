# ConverIQ - AI-Powered Real-Time Sales Call Analysis

<div align="center">

![ConverIQ Logo](https://img.shields.io/badge/ConverIQ-AI%20Sales%20Intelligence-blue?style=for-the-badge)

**Real-time conversation analysis platform that scores sales calls using Machine Learning**

[![Python](https://img.shields.io/badge/Python-3.9+-blue.svg)](https://python.org)
[![React](https://img.shields.io/badge/React-18+-61DAFB.svg)](https://reactjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-3178C6.svg)](https://typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

---

## Overview

ConverIQ is an intelligent conversation analysis platform designed for sales teams. It provides real-time lead scoring, sentiment analysis, and actionable insights during customer calls, helping agents identify high-intent prospects and improve conversion rates.

### Key Features

- **Real-Time Transcription**: Upload audio files or record live conversations with instant speech-to-text conversion
- **AI Lead Scoring**: Dynamic conversion probability scoring (0-100%) based on conversation analysis
- **Sentiment Detection**: Per-message sentiment analysis to track customer engagement
- **Buying Signal Detection**: Identifies interest indicators, urgency signals, and objections
- **Decision Maker Detection**: Recognizes authority signals in customer responses
- **Multilingual Support**: Optimized for English, Hindi, and Hinglish (code-mixed) conversations
- **Live Dashboard**: Beautiful, responsive UI with real-time updates via WebSocket

---

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 18, TypeScript, Tailwind CSS, Vite, Socket.IO Client |
| **Backend** | Flask, Flask-SocketIO, SQLAlchemy |
| **ML/AI** | OpenAI Whisper (Speech-to-Text), HuggingFace Transformers (Sentiment) |
| **Real-time** | WebSocket (Socket.IO) |

---

## Architecture

```
┌─────────────────┐     WebSocket      ┌─────────────────┐
│                 │◄──────────────────►│                 │
│  React Frontend │                    │  Flask Backend  │
│   (Dashboard)   │     REST API       │   (API Server)  │
│                 │◄──────────────────►│                 │
└─────────────────┘                    └────────┬────────┘
                                                │
                                       ┌────────┴────────┐
                                       │                 │
                                       │   ML Engine     │
                                       │  - Whisper ASR  │
                                       │  - Sentiment    │
                                       │  - Lead Scoring │
                                       │                 │
                                       └─────────────────┘
```

---

## Quick Start

### Prerequisites

- Python 3.9+
- Node.js 18+
- FFmpeg (for audio processing)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/converiq.git
   cd converiq/ConverIQ
   ```

2. **Backend Setup**
   ```bash
   cd Backend
   python -m venv venv
   
   # Windows
   venv\Scripts\activate
   # Linux/Mac
   source venv/bin/activate
   
   pip install -r requirements.txt
   ```

3. **Frontend Setup**
   ```bash
   cd Frontend
   npm install
   ```

### Running the Application

1. **Start the Backend Server**
   ```bash
   cd Backend
   python app.py
   ```
   Server runs on `http://localhost:5000`

2. **Start the Frontend**
   ```bash
   cd Frontend
   npm run dev
   ```
   App runs on `http://localhost:5173`

---

## Usage

### Audio File Analysis
1. Navigate to the dashboard and click "New Call"
2. Enter customer details and start the session
3. Upload an audio recording (MP3, WAV, M4A)
4. Watch real-time transcription and lead scoring

### Live Recording
1. Click "Live Record" from the dashboard
2. Allow microphone access
3. Start recording your conversation
4. View real-time transcription and insights

---

## How Lead Scoring Works

The ML engine calculates a conversion score (0-100) using weighted factors:

| Factor | Weight | Description |
|--------|--------|-------------|
| Sentiment Analysis | 30% | Customer tone and language positivity |
| Buying Signals | 35% | Interest keywords, product inquiries |
| Engagement Level | 20% | Message count and participation |
| Response Quality | 15% | Message length and depth |

**Bonus Factors:**
- Decision Maker Detection (+12 points)
- High-Value Indicators (+10 points)
- Urgency Signals (+12 points)

---

## Project Structure

```
ConverIQ/
├── Backend/
│   ├── app.py              # Flask server with WebSocket handlers
│   ├── ml_engine.py        # Sentiment analysis & lead scoring
│   ├── audio_processor.py  # Whisper transcription & diarization
│   ├── models.py           # Database models
│   ├── config.py           # Configuration
│   └── requirements.txt    # Python dependencies
│
├── Frontend/
│   ├── src/
│   │   ├── pages/          # React page components
│   │   │   ├── Home.tsx
│   │   │   ├── CallScreen.tsx
│   │   │   └── LiveCallScreen.tsx
│   │   └── services/
│   │       └── socketService.ts
│   ├── package.json
│   └── vite.config.ts
│
├── README.md
└── SETUP.md
```

---

## API Reference

### REST Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/conversations` | List all conversations |
| GET | `/api/conversation/:id` | Get conversation details |
| POST | `/api/upload_audio` | Upload audio for transcription |
| POST | `/api/upload_live_audio` | Upload live audio chunk |

### WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `start_conversation` | Client → Server | Initialize new conversation |
| `send_message` | Client → Server | Send text message |
| `new_message` | Server → Client | New transcribed message |
| `prediction_update` | Server → Client | Updated lead score |
| `transcription_progress` | Server → Client | Transcription progress |

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 5000 | Backend server port |
| `SECRET_KEY` | - | Flask secret key |
| `WHISPER_MODEL_SIZE` | base | Whisper model (tiny/base/small/medium) |

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- [OpenAI Whisper](https://github.com/openai/whisper) for speech recognition
- [HuggingFace Transformers](https://huggingface.co/transformers/) for sentiment analysis
- [Socket.IO](https://socket.io/) for real-time communication

---

<div align="center">
Built with passion for the Hackathon
</div>
