import json
import numpy as np
from transformers import pipeline
from datetime import datetime
import re

class MLScoringEngine:
    def __init__(self):
        """Initialize ML models for sentiment analysis and scoring"""
        print("Loading sentiment analysis model...")
        self.sentiment_analyzer = pipeline(
            "sentiment-analysis",
            model="distilbert-base-uncased-finetuned-sst-2-english"
        )
        
        # Buying signal keywords
        self.positive_signals = [
            'interested', 'yes', 'sounds good', 'tell me more', 'how much',
            'when can', 'sign up', 'enroll', 'proceed', 'agree', 'perfect',
            'excellent', 'great', 'definitely', 'absolutely', 'looking for',
            'need', 'want', 'budget', 'approved', 'ready', 'timeline'
        ]
        
        self.negative_signals = [
            'not interested', 'no thanks', 'maybe later', 'thinking',
            'expensive', 'too much', 'cant afford', 'busy', 'not now',
            'call back', 'not sure', 'hesitant', 'doubt', 'concern'
        ]
        
        self.urgency_signals = [
            'asap', 'urgent', 'soon', 'immediately', 'today', 'right now',
            'quickly', 'fast', 'emergency', 'need it now'
        ]
        
        print("ML Engine initialized successfully!")
    
    def analyze_sentiment(self, text):
        """Analyze sentiment of a text message"""
        if not text or len(text.strip()) < 3:
            return {'label': 'NEUTRAL', 'score': 0.5}
        
        try:
            result = self.sentiment_analyzer(text[:512])[0]  # Limit to 512 chars
            return result
        except Exception as e:
            print(f"Sentiment analysis error: {e}")
            return {'label': 'NEUTRAL', 'score': 0.5}
    
    def extract_buying_signals(self, text):
        """Extract buying signals from text"""
        text_lower = text.lower()
        
        positive_count = sum(1 for signal in self.positive_signals if signal in text_lower)
        negative_count = sum(1 for signal in self.negative_signals if signal in text_lower)
        urgency_count = sum(1 for signal in self.urgency_signals if signal in text_lower)
        
        return {
            'positive_signals': positive_count,
            'negative_signals': negative_count,
            'urgency_signals': urgency_count
        }
    
    def calculate_conversation_score(self, messages, conversation_metadata=None):
        """
        Calculate real-time conversion score based on conversation
        
        Args:
            messages: List of message dicts with 'speaker', 'text', 'sentiment_score'
            conversation_metadata: Optional metadata about the conversation
        
        Returns:
            dict with score and contributing factors
        """
        if not messages:
            return {'score': 0, 'factors': []}
        
        # Initialize metrics
        customer_messages = [m for m in messages if m.get('speaker') == 'Client']
        agent_messages = [m for m in messages if m.get('speaker') == 'Agent']
        
        if not customer_messages:
            return {'score': 30, 'factors': ['Waiting for customer response']}
        
        # 1. Sentiment Analysis (30% weight)
        customer_sentiments = []
        for msg in customer_messages:
            if 'sentiment_score' in msg:
                sentiment = msg['sentiment_score']
                # Convert to 0-1 scale (assuming sentiment is already 0-1)
                customer_sentiments.append(sentiment)
        
        avg_sentiment = np.mean(customer_sentiments) if customer_sentiments else 0.5
        sentiment_score = avg_sentiment * 30
        
        # 2. Buying Signals (35% weight)
        all_customer_text = ' '.join([m.get('text', '') for m in customer_messages])
        signals = self.extract_buying_signals(all_customer_text)
        
        positive_score = min(signals['positive_signals'] * 5, 20)
        urgency_score = min(signals['urgency_signals'] * 10, 10)
        negative_penalty = min(signals['negative_signals'] * 3, 10)
        
        buying_signal_score = max(0, positive_score + urgency_score - negative_penalty)
        
        # 3. Engagement Level (20% weight)
        message_count_score = min(len(customer_messages) * 2, 20)
        
        # 4. Response Quality (15% weight)
        avg_customer_msg_length = np.mean([len(m.get('text', '')) for m in customer_messages])
        response_quality = min((avg_customer_msg_length / 20) * 15, 15)
        
        # Calculate total score (0-100)
        total_score = sentiment_score + buying_signal_score + message_count_score + response_quality
        total_score = max(0, min(100, total_score))  # Clamp between 0-100
        
        # Determine contributing factors
        factors = []
        if avg_sentiment > 0.6:
            factors.append(f"Positive sentiment ({avg_sentiment:.2f})")
        elif avg_sentiment < 0.4:
            factors.append(f"Negative sentiment ({avg_sentiment:.2f})")
        
        if signals['positive_signals'] > 0:
            factors.append(f"{signals['positive_signals']} buying signals detected")
        
        if signals['urgency_signals'] > 0:
            factors.append(f"Urgency indicators present")
        
        if signals['negative_signals'] > 2:
            factors.append(f"Multiple objections detected")
        
        if len(customer_messages) > 5:
            factors.append("High engagement level")
        
        if not factors:
            factors.append("Conversation in early stage")
        
        return {
            'score': round(total_score, 2),
            'factors': factors,
            'metrics': {
                'sentiment_score': round(sentiment_score, 2),
                'buying_signal_score': round(buying_signal_score, 2),
                'engagement_score': round(message_count_score, 2),
                'response_quality': round(response_quality, 2)
            }
        }
    
    def process_message(self, text, speaker, conversation_history):
        """
        Process a single message and return sentiment + updated score
        
        Args:
            text: Message text
            speaker: 'Agent' or 'Client'
            conversation_history: List of previous messages
        
        Returns:
            dict with sentiment and updated conversation score
        """
        # Analyze sentiment
        sentiment_result = self.analyze_sentiment(text)
        
        # Convert sentiment label to score (0-1 scale)
        if sentiment_result['label'] == 'POSITIVE':
            sentiment_score = sentiment_result['score']
        else:  # NEGATIVE
            sentiment_score = 1 - sentiment_result['score']
        
        # Create message object
        message_obj = {
            'speaker': speaker,
            'text': text,
            'sentiment_score': sentiment_score,
            'sentiment_label': sentiment_result['label']
        }
        
        # Add to conversation history
        updated_history = conversation_history + [message_obj]
        
        # Calculate updated conversation score
        score_result = self.calculate_conversation_score(updated_history)
        
        return {
            'message': message_obj,
            'conversation_score': score_result['score'],
            'factors': score_result['factors'],
            'metrics': score_result.get('metrics', {})
        }
