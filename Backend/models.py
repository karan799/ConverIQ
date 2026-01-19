from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker

Base = declarative_base()

class Conversation(Base):
    __tablename__ = 'conversations'
    
    id = Column(Integer, primary_key=True)
    call_id = Column(String(100), unique=True, nullable=False, index=True)
    agent_name = Column(String(100))
    customer_name = Column(String(100))
    customer_phone = Column(String(20))
    start_time = Column(DateTime, default=datetime.utcnow)
    end_time = Column(DateTime)
    final_score = Column(Float, default=0.0)
    is_active = Column(Boolean, default=True)
    
    # Relationships
    messages = relationship('Message', back_populates='conversation', cascade='all, delete-orphan')
    predictions = relationship('Prediction', back_populates='conversation', cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'call_id': self.call_id,
            'agent_name': self.agent_name,
            'customer_name': self.customer_name,
            'customer_phone': self.customer_phone,
            'start_time': self.start_time.isoformat() if self.start_time else None,
            'end_time': self.end_time.isoformat() if self.end_time else None,
            'final_score': self.final_score,
            'is_active': self.is_active
        }


class Message(Base):
    __tablename__ = 'messages'
    
    id = Column(Integer, primary_key=True)
    conversation_id = Column(Integer, ForeignKey('conversations.id'), nullable=False)
    speaker = Column(String(20), nullable=False)  # 'Agent' or 'Client'
    text = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    sentiment_score = Column(Float)
    sentiment_label = Column(String(20))
    
    # Relationship
    conversation = relationship('Conversation', back_populates='messages')
    
    def to_dict(self):
        return {
            'id': self.id,
            'speaker': self.speaker,
            'text': self.text,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'sentiment_score': self.sentiment_score,
            'sentiment_label': self.sentiment_label
        }


class Prediction(Base):
    __tablename__ = 'predictions'
    
    id = Column(Integer, primary_key=True)
    conversation_id = Column(Integer, ForeignKey('conversations.id'), nullable=False)
    conversion_score = Column(Float, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    factors = Column(Text)  # JSON string of contributing factors
    
    # Relationship
    conversation = relationship('Conversation', back_populates='predictions')
    
    def to_dict(self):
        return {
            'id': self.id,
            'conversion_score': self.conversion_score,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'factors': self.factors
        }


def init_db(database_url):
    """Initialize the database"""
    engine = create_engine(database_url)
    Base.metadata.create_all(engine)
    return engine
