"""
ConverIQ - Real-Time AI-Powered Sales Call Analysis Server
Provides WebSocket-based real-time transcription and lead scoring.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
from datetime import datetime
import os
import re
import threading
import logging
from werkzeug.utils import secure_filename

from ml_engine import MLScoringEngine
from audio_processor import AudioProcessor

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)
logging.getLogger('werkzeug').setLevel(logging.WARNING)
logging.getLogger('engineio').setLevel(logging.WARNING)
logging.getLogger('socketio').setLevel(logging.WARNING)

# Initialize Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'converiq-secret-key')

# CORS configuration
allowed_origins = [
    "http://localhost:5173", 
    "http://127.0.0.1:5173", 
    "http://localhost:5174", 
    "http://127.0.0.1:5174"
]
CORS(app, resources={r"/*": {"origins": allowed_origins}})
socketio = SocketIO(app, cors_allowed_origins=allowed_origins, async_mode='threading')

# Singleton instances
ml_engine = None
audio_processor = None

def get_ml_engine():
    """Get or initialize ML scoring engine"""
    global ml_engine
    if ml_engine is None:
        ml_engine = MLScoringEngine()
    return ml_engine

def get_audio_processor():
    """Get or initialize audio processor"""
    global audio_processor
    if audio_processor is None:
        audio_processor = AudioProcessor()
    return audio_processor

# In-memory storage
conversations_db = {}
active_conversations = {}
stop_transcription_flags = {}


# REST API Endpoints
@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'timestamp': datetime.utcnow().isoformat()})

@app.route('/api/conversations', methods=['GET'])
def get_conversations():
    """Get all conversations"""
    return jsonify({'conversations': list(conversations_db.values())})

@app.route('/api/conversation/<call_id>', methods=['GET'])
def get_conversation(call_id):
    """Get specific conversation with all messages"""
    if call_id not in conversations_db:
        return jsonify({'error': 'Conversation not found'}), 404
    return jsonify(conversations_db[call_id])


def process_audio_async(call_id, temp_path, processor, ml_engine_instance):
    """Process audio in background thread and stream results via WebSocket"""
    stop_transcription_flags[call_id] = False
    
    try:
        logger.info(f"Starting audio transcription for call: {call_id}")
        
        def on_segment_transcribed(msg_data):
            if stop_transcription_flags.get(call_id, False):
                return
            if call_id not in active_conversations:
                return
                
            speaker = msg_data['speaker']
            text = msg_data['text']
            conversation_history = active_conversations[call_id]['messages']
            result = ml_engine_instance.process_message(text, speaker, conversation_history)
            
            message = {
                'id': len(conversations_db[call_id]['messages']) + 1,
                'speaker': speaker,
                'text': text,
                'sentiment_score': result['message']['sentiment_score'],
                'sentiment_label': result['message']['sentiment_label'],
                'timestamp': datetime.utcnow().isoformat()
            }
            
            prediction = {
                'id': len(conversations_db[call_id]['predictions']) + 1,
                'conversion_score': result['conversation_score'],
                'factors': result['factors'],
                'timestamp': datetime.utcnow().isoformat()
            }
            
            conversations_db[call_id]['messages'].append(message)
            conversations_db[call_id]['predictions'].append(prediction)
            conversations_db[call_id]['final_score'] = result['conversation_score']
            active_conversations[call_id]['messages'].append(result['message'])
            
            socketio.emit('new_message', {'message': message}, room=call_id)
            socketio.emit('prediction_update', {
                'conversion_score': result['conversation_score'],
                'factors': result['factors'],
                'metrics': result['metrics'],
                'timestamp': datetime.utcnow().isoformat()
            }, room=call_id)
        
        def on_progress(chunk_num, total_chunks, status):
            socketio.emit('transcription_progress', {
                'call_id': call_id,
                'chunk': chunk_num,
                'total': total_chunks,
                'status': status
            }, room=call_id)
        
        def should_stop():
            return stop_transcription_flags.get(call_id, False)
        
        processor.process_audio_file_streaming(temp_path, on_segment_transcribed, on_progress, should_stop)
        
        msg_count = len(conversations_db.get(call_id, {}).get('messages', []))
        
        if stop_transcription_flags.get(call_id, False):
            socketio.emit('transcription_stopped', {'call_id': call_id, 'messages_count': msg_count}, room=call_id)
            logger.info(f"Transcription stopped. {msg_count} messages extracted.")
        else:
            socketio.emit('transcription_complete', {'call_id': call_id, 'messages_count': msg_count}, room=call_id)
            logger.info(f"Transcription complete. {msg_count} messages extracted.")
        
    except Exception as e:
        logger.error(f"Transcription error: {e}")
        socketio.emit('transcription_error', {'call_id': call_id, 'error': str(e)}, room=call_id)
    finally:
        stop_transcription_flags.pop(call_id, None)
        processor.cleanup_temp_file(temp_path)


@app.route('/api/upload_audio', methods=['POST'])
def upload_audio():
    """Handle audio file upload and start async processing"""
    try:
        call_id = request.form.get('call_id')
        if not call_id:
            return jsonify({'error': 'call_id is required'}), 400
        
        if call_id not in active_conversations:
            return jsonify({'error': 'Conversation not found. Start a conversation first.'}), 404
        
        if 'audio' not in request.files:
            return jsonify({'error': 'No audio file provided'}), 400
        
        audio_file = request.files['audio']
        if audio_file.filename == '':
            return jsonify({'error': 'No audio file selected'}), 400
        
        processor = get_audio_processor()
        filename = secure_filename(audio_file.filename)
        temp_path = processor.save_uploaded_file(audio_file.read(), filename)
        
        thread = threading.Thread(
            target=process_audio_async,
            args=(call_id, temp_path, processor, get_ml_engine())
        )
        thread.daemon = True
        thread.start()
        
        return jsonify({
            'success': True,
            'status': 'processing',
            'message': 'Audio upload started. Transcription will stream in real-time.',
            'call_id': call_id
        })
            
    except Exception as e:
        logger.error(f'Audio upload error: {e}')
        return jsonify({'error': f'Failed to process audio: {str(e)}'}), 500


@app.route('/api/upload_live_audio', methods=['POST'])
def upload_live_audio():
    """Handle live audio chunk upload from microphone"""
    try:
        call_id = request.form.get('call_id')
        if not call_id:
            return jsonify({'error': 'call_id is required'}), 400
        
        # Auto-create conversation for live calls
        if call_id not in active_conversations:
            active_conversations[call_id] = True
            conversations_db[call_id] = {
                'messages': [],
                'started_at': datetime.utcnow().isoformat()
            }
        
        if 'audio' not in request.files:
            return jsonify({'error': 'No audio chunk provided'}), 400
        
        audio_file = request.files['audio']
        audio_data = audio_file.read()
        
        processor = get_audio_processor()
        temp_path = processor.save_uploaded_file(audio_data, 'live_chunk.webm')
        wav_path = processor.convert_to_wav(temp_path)
        
        if wav_path:
            # Check audio energy level to skip silent chunks
            try:
                import soundfile as sf
                audio_data_raw, _ = sf.read(wav_path)
                rms = float((audio_data_raw ** 2).mean() ** 0.5)
                
                if rms < 0.005:  # Skip silent audio
                    processor.cleanup_temp_file(wav_path)
                    processor.cleanup_temp_file(temp_path)
                    return jsonify({'status': 'skipped', 'reason': 'silent'})
            except Exception:
                pass
            
            ml_engine_instance = get_ml_engine()
            
            try:
                result = processor.whisper_model.transcribe(
                    wav_path,
                    task="transcribe",
                    verbose=False,
                    word_timestamps=False,
                    temperature=0.0,
                    beam_size=1,
                    best_of=1,
                    language="en",
                    initial_prompt="Namaste. Mera naam Himanshu hai. Transcribe Hindi words phonetically in English. Do not translate."
                )
                
                segments = result.get('segments', [])
                
                # Hallucination filter
                hallucinations = [
                    "thanks for watching", "thank you for watching", "subscribe",
                    "like and subscribe", "see you next time", "bye bye",
                    "thank you", "thanks", "you", "the end", "...",
                    "music", "[music]", "(music)", "applause", "[applause]",
                ]
                
                hallucination_patterns = [
                    r'^[\d\.\s]+$', r'^\d+\.?\d*\s*(cm|mm|m|km|kg|g|lb)$',
                    r'^[\.]+$', r'^\s*$',
                ]
                
                for segment in segments:
                    text = segment.get('text', '').strip()
                    
                    if not text or len(text) < 3:
                        continue
                    if text.lower() in hallucinations:
                        continue
                    
                    # Arabic/Non-Latin filter
                    ascii_chars = sum(1 for c in text if ord(c) < 128)
                    if len(text) > 0 and (ascii_chars / len(text)) < 0.5:
                        continue
                    
                    is_hallucination = False
                    for pattern in hallucination_patterns:
                        if re.match(pattern, text.lower()):
                            is_hallucination = True
                            break
                    if is_hallucination:
                        continue
                     
                    # If valid...
                    
                    speaker = "Client"
                    conversation_history = conversations_db.get(call_id, {}).get('messages', [])
                    ml_result = ml_engine_instance.process_message(text, speaker, conversation_history)
                    
                    message = {
                        'id': len(conversation_history) + 1,
                        'speaker': speaker,
                        'text': text,
                        'sentiment_score': ml_result['message']['sentiment_score'],
                        'sentiment_label': ml_result['message']['sentiment_label'],
                        'timestamp': datetime.utcnow().isoformat()
                    }
                    
                    if call_id not in conversations_db:
                        conversations_db[call_id] = {'messages': []}
                    conversations_db[call_id]['messages'].append(message)
                    
                    socketio.emit('new_message', {'message': message}, room=call_id)
                    socketio.emit('prediction_update', {
                        'conversion_score': ml_result['conversation_score'],
                        'factors': ml_result['factors'],
                        'metrics': ml_result['metrics'],
                        'timestamp': datetime.utcnow().isoformat()
                    }, room=call_id)
                        
            except Exception as e:
                logger.error(f"Live transcription error: {e}")
            finally:
                processor.cleanup_temp_file(temp_path)
                processor.cleanup_temp_file(wav_path)
        else:
            processor.cleanup_temp_file(temp_path)
        
        return jsonify({'success': True})
        
    except Exception as e:
        logger.error(f'Live audio error: {e}')
        return jsonify({'error': str(e)}), 500


# WebSocket Events
@socketio.on('connect')
def handle_connect():
    """Handle client connection"""
    emit('connected', {'message': 'Connected to ConverIQ server'})

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection"""
    pass

@socketio.on('start_conversation')
def handle_start_conversation(data):
    """Start a new conversation"""
    call_id = data.get('call_id')
    agent_name = data.get('agent_name', 'Agent')
    customer_name = data.get('customer_name', 'Customer')
    customer_phone = data.get('customer_phone', '')
    
    if not call_id:
        emit('error', {'message': 'call_id is required'})
        return
    
    join_room(call_id)
    
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
    
    emit('conversation_started', {'call_id': call_id, 'conversation': conversation}, room=call_id)

@socketio.on('send_message')
def handle_message(data):
    """Handle incoming message from conversation"""
    call_id = data.get('call_id')
    speaker = data.get('speaker')
    text = data.get('text')
    
    if not all([call_id, speaker, text]):
        emit('error', {'message': 'call_id, speaker, and text are required'})
        return
    
    if call_id not in active_conversations:
        emit('error', {'message': 'Conversation not found. Start a conversation first.'})
        return
    
    try:
        conversation_history = active_conversations[call_id]['messages']
        ml_engine_instance = get_ml_engine()
        result = ml_engine_instance.process_message(text, speaker, conversation_history)
        
        message = {
            'id': len(conversations_db[call_id]['messages']) + 1,
            'speaker': speaker,
            'text': text,
            'sentiment_score': result['message']['sentiment_score'],
            'sentiment_label': result['message']['sentiment_label'],
            'timestamp': datetime.utcnow().isoformat()
        }
        
        prediction = {
            'id': len(conversations_db[call_id]['predictions']) + 1,
            'conversion_score': result['conversation_score'],
            'factors': result['factors'],
            'timestamp': datetime.utcnow().isoformat()
        }
        
        conversations_db[call_id]['messages'].append(message)
        conversations_db[call_id]['predictions'].append(prediction)
        conversations_db[call_id]['final_score'] = result['conversation_score']
        active_conversations[call_id]['messages'].append(result['message'])
        
        emit('new_message', {'message': message}, room=call_id)
        emit('prediction_update', {
            'conversion_score': result['conversation_score'],
            'factors': result['factors'],
            'metrics': result['metrics'],
            'timestamp': datetime.utcnow().isoformat()
        }, room=call_id)
        
    except Exception as e:
        logger.error(f'Error processing message: {e}')
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

@socketio.on('stop_transcription')
def handle_stop_transcription(data):
    """Stop an ongoing transcription"""
    call_id = data.get('call_id')
    if call_id:
        stop_transcription_flags[call_id] = True
        emit('transcription_stopped', {'call_id': call_id}, room=call_id)


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    print('\n' + '=' * 50)
    print('  ConverIQ - AI Sales Call Analysis Server')
    print('=' * 50)
    print('\n  Initializing ML models...')
    get_ml_engine()
    print('\n  Initializing Audio Processor...')
    get_audio_processor()
    print(f'\n  Server running on http://localhost:{port}')
    print('  Ready for connections.\n')
    socketio.run(app, host='0.0.0.0', port=port, debug=False)
