import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    SQLALCHEMY_DATABASE_URI = os.getenv(
        'DATABASE_URL',
        'postgresql://postgres:postgres@localhost:5432/converiq'
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # WebSocket configuration
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', '*')
    
    # ML Model settings
    WHISPER_MODEL_SIZE = os.getenv('WHISPER_MODEL_SIZE', 'base')  # tiny, base, small, medium, large
    SENTIMENT_MODEL = 'distilbert-base-uncased-finetuned-sst-2-english'
    
    # Audio settings
    SAMPLE_RATE = 16000
    CHUNK_DURATION = 5  # seconds
