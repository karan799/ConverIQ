from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import json
import os

from config import Config
from models import Base, Conversation, Message, Prediction, init_db
from ml_engine import MLScoringEngine

# Initialize Flask app
app = Flask(__name__)
app.config.from_object(Config)
CORS(app, resources={r"/*": {"origins": "*"}})

# Initialize SocketIO with CORS
socketio = SocketIO(
    app, 
    cors_allowed_origins="*",
    async_mode='eventlet',
    engineio_logger=False,
    logger=False,
    ping_timeout=60,
    ping_interval=25
)

# Initialize database
engine = init_db(app.config['SQLALCHEMY_DATABASE_URI'])
SessionLocal = sessionmaker(bind=engine)

# Initialize ML Engine (singleton)
ml_engine = None

def get_ml_engine():
    global ml_engine
    if ml_engine is None:
        ml_engine = MLScoringEngine()
    return ml_engine

# In-memory storage for active conversations
active_conversations = {}

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'timestamp': datetime.utcnow().isoformat()})

@app.route('/api/conversations', methods=['GET'])
def get_conversations():
    """Get all conversations"""
    session = SessionLocal()
    try:
        conversations = session.query(Conversation).all()
        return jsonify({
            'conversations': [conv.to_dict() for conv in conversations]
        })
    finally:
        session.close()

@app.route('/api/conversation/<call_id>', methods=['GET'])
def get_conversation(call_id):
    """Get specific conversation with all messages"""
    session = SessionLocal()
    try:
        conversation = session.query(Conversation).filter_by(call_id=call_id).first()
        if not conversation:
            return jsonify({'error': 'Conversation not found'}), 404
        
        messages = [msg.to_dict() for msg in conversation.messages]
        predictions = [pred.to_dict() for pred in conversation.predictions]
        
        return jsonify({
            'conversation': conversation.to_dict(),
            'messages': messages,
            'predictions': predictions
        })
    finally:
        session.close()

# WebSocket Events
@socketio.on('connect')
def handle_connect():
    """Handle client connection"""
    print(f'Client connected: {request.sid}')
    emit('connected', {'message': 'Connected to ConverIQ server'})

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection"""
    print(f'Client disconnected: {request.sid}')

@socketio.on('start_conversation')
def handle_start_conversation(data):
    """Start a new conversation"""
    print(f'Starting conversation: {data}')
    
    call_id = data.get('call_id')
    agent_name = data.get('agent_name', 'Agent')
    customer_name = data.get('customer_name', 'Customer')
    customer_phone = data.get('customer_phone', '')
    
    if not call_id:
        emit('error', {'message': 'call_id is required'})
        return
    
    # Join room for this conversation
    join_room(call_id)
    
    # Create conversation in database
    session = SessionLocal()
    try:
        conversation = Conversation(
            call_id=call_id,
            agent_name=agent_name,
            customer_name=customer_name,
            customer_phone=customer_phone,
            is_active=True
        )
        session.add(conversation)
        session.commit()
        
        # Store in active conversations
        active_conversations[call_id] = {
            'conversation_id': conversation.id,
            'messages': [],
            'start_time': datetime.utcnow().isoformat()
        }
        
        emit('conversation_started', {
            'call_id': call_id,
            'conversation': conversation.to_dict()
        }, room=call_id)
        
    except Exception as e:
        session.rollback()
        print(f'Error starting conversation: {e}')
        emit('error', {'message': f'Failed to start conversation: {str(e)}'})
    finally:
        session.close()

@socketio.on('send_message')
def handle_message(data):
    """Handle incoming message from conversation"""
    print(f'Received message: {data}')
    
    call_id = data.get('call_id')
    speaker = data.get('speaker')  # 'Agent' or 'Client'
    text = data.get('text')
    
    if not all([call_id, speaker, text]):
        emit('error', {'message': 'call_id, speaker, and text are required'})
        return
    
    if call_id not in active_conversations:
        emit('error', {'message': 'Conversation not found. Start a conversation first.'})
        return
    
    session = SessionLocal()
    try:
        # Get conversation from database
        conversation = session.query(Conversation).filter_by(call_id=call_id).first()
        if not conversation:
            emit('error', {'message': 'Conversation not found in database'})
            return
        
        # Get conversation history
        conversation_history = active_conversations[call_id]['messages']
        
        # Process message with ML engine
        ml_engine = get_ml_engine()
        result = ml_engine.process_message(text, speaker, conversation_history)
        
        # Save message to database
        message = Message(
            conversation_id=conversation.id,
            speaker=speaker,
            text=text,
            sentiment_score=result['message']['sentiment_score'],
            sentiment_label=result['message']['sentiment_label']
        )
        session.add(message)
        
        # Save prediction to database
        prediction = Prediction(
            conversation_id=conversation.id,
            conversion_score=result['conversation_score'],
            factors=json.dumps(result['factors'])
        )
        session.add(prediction)
        
        # Update conversation score
        conversation.final_score = result['conversation_score']
        
        session.commit()
        
        # Update in-memory conversation history
        active_conversations[call_id]['messages'].append(result['message'])
        
        # Emit message to all clients in the room
        emit('new_message', {
            'message': {
                'id': message.id,
                'speaker': speaker,
                'text': text,
                'sentiment_score': result['message']['sentiment_score'],
                'sentiment_label': result['message']['sentiment_label'],
                'timestamp': datetime.utcnow().isoformat()
            }
        }, room=call_id)
        
        # Emit updated prediction
        emit('prediction_update', {
            'conversion_score': result['conversation_score'],
            'factors': result['factors'],
            'metrics': result['metrics'],
            'timestamp': datetime.utcnow().isoformat()
        }, room=call_id)
        
    except Exception as e:
        session.rollback()
        print(f'Error processing message: {e}')
        import traceback
        traceback.print_exc()
        emit('error', {'message': f'Failed to process message: {str(e)}'})
    finally:
        session.close()

@socketio.on('end_conversation')
def handle_end_conversation(data):
    """End a conversation"""
    call_id = data.get('call_id')
    
    if not call_id:
        emit('error', {'message': 'call_id is required'})
        return
    
    session = SessionLocal()
    try:
        conversation = session.query(Conversation).filter_by(call_id=call_id).first()
        if conversation:
            conversation.is_active = False
            conversation.end_time = datetime.utcnow()
            session.commit()
            
            # Remove from active conversations
            if call_id in active_conversations:
                del active_conversations[call_id]
            
            emit('conversation_ended', {
                'call_id': call_id,
                'final_score': conversation.final_score,
                'conversation': conversation.to_dict()
            }, room=call_id)
            
            leave_room(call_id)
    except Exception as e:
        session.rollback()
        print(f'Error ending conversation: {e}')
        emit('error', {'message': f'Failed to end conversation: {str(e)}'})
    finally:
        session.close()

@socketio.on('join_conversation')
def handle_join_conversation(data):
    """Join an existing conversation room"""
    call_id = data.get('call_id')
    if call_id:
        join_room(call_id)
        emit('joined_conversation', {'call_id': call_id})

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    print(f'Starting ConverIQ Server on port {port}...')
    print('Initializing ML models...')
    get_ml_engine()  # Initialize ML engine on startup
    print('Server ready!')
    socketio.run(app, host='0.0.0.0', port=port, debug=True)
