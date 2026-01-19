"""
Simplified Flask app without database - for quick testing
Stores conversations in memory only
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
from datetime import datetime
import json
import os
import time
from werkzeug.utils import secure_filename

from ml_engine import MLScoringEngine
from audio_processor import AudioProcessor

# Initialize Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = 'dev-secret-key'
CORS(app, resources={r"/*": {"origins": ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174"]}})

# Initialize SocketIO with CORS
socketio = SocketIO(app, cors_allowed_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174"], async_mode='threading', logger=True, engineio_logger=True)

# Initialize ML Engine (singleton)
ml_engine = None
audio_processor = None

def get_ml_engine():
    global ml_engine
    if ml_engine is None:
        print("Initializing ML Engine...")
        ml_engine = MLScoringEngine()
        print("ML Engine ready!")
    return ml_engine

def get_audio_processor():
    global audio_processor
    if audio_processor is None:
        print("Initializing Audio Processor...")
        audio_processor = AudioProcessor()
        print("Audio Processor ready!")
    return audio_processor

# In-memory storage for conversations
conversations_db = {}
active_conversations = {}

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'timestamp': datetime.utcnow().isoformat()})

@app.route('/api/conversations', methods=['GET'])
def get_conversations():
    """Get all conversations"""
    return jsonify({
        'conversations': list(conversations_db.values())
    })

@app.route('/api/conversation/<call_id>', methods=['GET'])
def get_conversation(call_id):
    """Get specific conversation with all messages"""
    if call_id not in conversations_db:
        return jsonify({'error': 'Conversation not found'}), 404
    
    return jsonify(conversations_db[call_id])

@app.route('/api/upload_audio', methods=['POST'])
def upload_audio():
    """Handle audio file upload and process it"""
    try:
        # Get call_id from form data
        call_id = request.form.get('call_id')
        if not call_id:
            return jsonify({'error': 'call_id is required'}), 400
        
        # Check if conversation exists
        if call_id not in active_conversations:
            return jsonify({'error': 'Conversation not found. Start a conversation first.'}), 404
        
        # Get uploaded file
        if 'audio' not in request.files:
            return jsonify({'error': 'No audio file provided'}), 400
        
        audio_file = request.files['audio']
        if audio_file.filename == '':
            return jsonify({'error': 'No audio file selected'}), 400
        
        # Save file temporarily
        processor = get_audio_processor()
        filename = secure_filename(audio_file.filename)
        temp_path = processor.save_uploaded_file(audio_file.read(), filename)
        
        try:
            # Process audio file with streaming callback
            print(f"Processing audio file for call_id: {call_id}")
            
            # Get ML engine
            ml_engine = get_ml_engine()
            processed_count = 0
            
            # Define callback for streaming transcription
            def on_segment_transcribed(msg_data):
                nonlocal processed_count
                
                speaker = msg_data['speaker']
                text = msg_data['text']
                
                # Get conversation history
                conversation_history = active_conversations[call_id]['messages']
                
                # Process message with ML engine
                result = ml_engine.process_message(text, speaker, conversation_history)
                
                # Create message object
                message = {
                    'id': len(conversations_db[call_id]['messages']) + 1,
                    'speaker': speaker,
                    'text': text,
                    'sentiment_score': result['message']['sentiment_score'],
                    'sentiment_label': result['message']['sentiment_label'],
                    'timestamp': datetime.utcnow().isoformat()
                }
                
                # Create prediction object
                prediction = {
                    'id': len(conversations_db[call_id]['predictions']) + 1,
                    'conversion_score': result['conversation_score'],
                    'factors': result['factors'],
                    'timestamp': datetime.utcnow().isoformat()
                }
                
                # Update in-memory storage
                conversations_db[call_id]['messages'].append(message)
                conversations_db[call_id]['predictions'].append(prediction)
                conversations_db[call_id]['final_score'] = result['conversation_score']
                active_conversations[call_id]['messages'].append(result['message'])
                
                # Emit message to all clients in the room via SocketIO
                socketio.emit('new_message', {'message': message}, room=call_id)
                
                # Emit updated prediction
                socketio.emit('prediction_update', {
                    'conversion_score': result['conversation_score'],
                    'factors': result['factors'],
                    'metrics': result['metrics'],
                    'timestamp': datetime.utcnow().isoformat()
                }, room=call_id)
                
                processed_count += 1
            
            # Process audio file with streaming
            processor.process_audio_file_streaming(temp_path, on_segment_transcribed)
            
            return jsonify({
                'success': True,
                'messages_processed': processed_count,
                'call_id': call_id
            })
            
        finally:
            # Clean up temporary file
            processor.cleanup_temp_file(temp_path)
            
    except Exception as e:
        print(f'Error processing audio upload: {e}')
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Failed to process audio: {str(e)}'}), 500

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
    
    # Create conversation in memory
    conversation = {
        'call_id': call_id,
        'agent_name': agent_name,
        'customer_name': customer_name,
        'customer_phone': customer_phone,
        'start_time': datetime.utcnow().isoformat(),
        'end_time': None,
        'final_score': 0.0,
        'is_active': True,
        'messages': [],
        'predictions': []
    }
    
    conversations_db[call_id] = conversation
    active_conversations[call_id] = {
        'messages': [],
        'start_time': datetime.utcnow().isoformat()
    }
    
    emit('conversation_started', {
        'call_id': call_id,
        'conversation': conversation
    }, room=call_id)

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
    
    try:
        # Get conversation history
        conversation_history = active_conversations[call_id]['messages']
        
        # Process message with ML engine
        ml_engine = get_ml_engine()
        result = ml_engine.process_message(text, speaker, conversation_history)
        
        # Create message object
        message = {
            'id': len(conversations_db[call_id]['messages']) + 1,
            'speaker': speaker,
            'text': text,
            'sentiment_score': result['message']['sentiment_score'],
            'sentiment_label': result['message']['sentiment_label'],
            'timestamp': datetime.utcnow().isoformat()
        }
        
        # Create prediction object
        prediction = {
            'id': len(conversations_db[call_id]['predictions']) + 1,
            'conversion_score': result['conversation_score'],
            'factors': result['factors'],
            'timestamp': datetime.utcnow().isoformat()
        }
        
        # Update in-memory storage
        conversations_db[call_id]['messages'].append(message)
        conversations_db[call_id]['predictions'].append(prediction)
        conversations_db[call_id]['final_score'] = result['conversation_score']
        active_conversations[call_id]['messages'].append(result['message'])
        
        # Emit message to all clients in the room
        emit('new_message', {'message': message}, room=call_id)
        
        # Emit updated prediction
        emit('prediction_update', {
            'conversion_score': result['conversation_score'],
            'factors': result['factors'],
            'metrics': result['metrics'],
            'timestamp': datetime.utcnow().isoformat()
        }, room=call_id)
        
    except Exception as e:
        print(f'Error processing message: {e}')
        import traceback
        traceback.print_exc()
        emit('error', {'message': f'Failed to process message: {str(e)}'})

@socketio.on('end_conversation')
def handle_end_conversation(data):
    """End a conversation"""
    call_id = data.get('call_id')
    
    if not call_id:
        emit('error', {'message': 'call_id is required'})
        return
    
    if call_id in conversations_db:
        conversations_db[call_id]['is_active'] = False
        conversations_db[call_id]['end_time'] = datetime.utcnow().isoformat()
        
        # Remove from active conversations
        if call_id in active_conversations:
            del active_conversations[call_id]
        
        emit('conversation_ended', {
            'call_id': call_id,
            'final_score': conversations_db[call_id]['final_score'],
            'conversation': conversations_db[call_id]
        }, room=call_id)
        
        leave_room(call_id)

@socketio.on('join_conversation')
def handle_join_conversation(data):
    """Join an existing conversation room"""
    call_id = data.get('call_id')
    if call_id:
        join_room(call_id)
        emit('joined_conversation', {'call_id': call_id})

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    print('=' * 60)
    print(f'Starting ConverIQ Server on port {port}...')
    print('Note: Running in MEMORY-ONLY mode (no database)')
    print('=' * 60)
    print('Initializing ML models (this may take a minute)...')
    get_ml_engine()  # Initialize ML engine on startup
    print('=' * 60)
    print('✓ Server ready!')
    print(f'✓ Open http://localhost:{port}/health to verify')
    print('=' * 60)
    socketio.run(app, host='0.0.0.0', port=port, debug=False)
