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
import re
import time
import threading
import logging
import subprocess
from werkzeug.utils import secure_filename

from ml_engine import MLScoringEngine
from audio_processor import AudioProcessor

# Configure logging - suppress verbose logs
logging.getLogger('werkzeug').setLevel(logging.ERROR)
logging.getLogger('engineio').setLevel(logging.ERROR)
logging.getLogger('socketio').setLevel(logging.ERROR)

# Initialize Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = 'dev-secret-key'
CORS(app, resources={r"/*": {"origins": ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174"]}})

# Initialize SocketIO with CORS (logging disabled for cleaner output)
socketio = SocketIO(app, cors_allowed_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174"], async_mode='threading', logger=False, engineio_logger=False)

# Initialize ML Engine (singleton)
ml_engine = None
audio_processor = None

def get_ml_engine():
    global ml_engine
    if ml_engine is None:
        ml_engine = MLScoringEngine()
    return ml_engine

def get_audio_processor():
    global audio_processor
    if audio_processor is None:
        audio_processor = AudioProcessor()
    return audio_processor

# In-memory storage for conversations
conversations_db = {}
active_conversations = {}
stop_transcription_flags = {}  # Track which transcriptions should be stopped

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

def log(msg):
    """Simple timestamped logging"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] {msg}")

def process_audio_async(call_id, temp_path, processor, ml_engine):
    """Process audio in background thread and stream results via WebSocket"""
    # Clear any previous stop flag
    stop_transcription_flags[call_id] = False
    
    try:
        log(f"Starting audio transcription...")
        
        # Define callback for streaming transcription
        def on_segment_transcribed(msg_data):
            # Check if stop was requested
            if stop_transcription_flags.get(call_id, False):
                return
            
            if call_id not in active_conversations:
                return
                
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
            print(f"[WS] Sent message to room {call_id}")
            
            # Emit updated prediction
            socketio.emit('prediction_update', {
                'conversion_score': result['conversation_score'],
                'factors': result['factors'],
                'metrics': result['metrics'],
                'timestamp': datetime.utcnow().isoformat()
            }, room=call_id)
            
            # Clean log of transcribed text (truncate if too long)
            text_preview = text[:60] + "..." if len(text) > 60 else text
            try:
                log(f"[{speaker}] {text_preview}")
            except UnicodeEncodeError:
                log(f"[{speaker}] [transcribed {len(text)} chars]")
        
        # Define callback for progress updates
        def on_progress(chunk_num, total_chunks, status):
            socketio.emit('transcription_progress', {
                'call_id': call_id,
                'chunk': chunk_num,
                'total': total_chunks,
                'status': status
            }, room=call_id)
        
        # Define stop check function
        def should_stop():
            return stop_transcription_flags.get(call_id, False)
        
        # Process audio file with streaming
        processor.process_audio_file_streaming(temp_path, on_segment_transcribed, on_progress, should_stop)
        
        msg_count = len(conversations_db.get(call_id, {}).get('messages', []))
        
        # Check if stopped or completed
        if stop_transcription_flags.get(call_id, False):
            socketio.emit('transcription_stopped', {
                'call_id': call_id,
                'messages_count': msg_count
            }, room=call_id)
            log(f"Transcription stopped by user. {msg_count} messages extracted.")
        else:
            # Signal completion
            socketio.emit('transcription_complete', {
                'call_id': call_id,
                'messages_count': msg_count
            }, room=call_id)
            log(f"Transcription complete! {msg_count} messages extracted.")
        
    except Exception as e:
        import traceback
        log(f"ERROR: {e}")
        traceback.print_exc()
        socketio.emit('transcription_error', {
            'call_id': call_id,
            'error': str(e)
        }, room=call_id)
    finally:
        # Clean up stop flag and temporary file
        stop_transcription_flags.pop(call_id, None)
        processor.cleanup_temp_file(temp_path)

@app.route('/api/upload_audio', methods=['POST'])
def upload_audio():
    """Handle audio file upload and start async processing"""
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
        
        # Get ML engine
        ml_engine = get_ml_engine()
        
        # Start processing in background thread
        thread = threading.Thread(
            target=process_audio_async,
            args=(call_id, temp_path, processor, ml_engine)
        )
        thread.daemon = True
        thread.start()
        
        # Return immediately - processing will happen in background
        return jsonify({
            'success': True,
            'status': 'processing',
            'message': 'Audio upload started. Transcription will stream in real-time.',
            'call_id': call_id
        })
            
    except Exception as e:
        log(f'Error: {e}')
        return jsonify({'error': f'Failed to process audio: {str(e)}'}), 500

@app.route('/api/upload_live_audio', methods=['POST'])
def upload_live_audio():
    """Handle live audio chunk upload from microphone"""
    try:
        call_id = request.form.get('call_id')
        log(f"[LIVE] Received audio chunk for call_id: {call_id}")
        
        if not call_id:
            return jsonify({'error': 'call_id is required'}), 400
        
        # Auto-create conversation for live calls
        if call_id not in active_conversations:
            log(f"[LIVE] Creating new conversation: {call_id}")
            active_conversations[call_id] = True
            conversations_db[call_id] = {
                'messages': [],
                'started_at': datetime.utcnow().isoformat()
            }
        
        # Get uploaded chunk
        if 'audio' not in request.files:
            log("[LIVE] No audio file in request")
            return jsonify({'error': 'No audio chunk provided'}), 400
        
        audio_file = request.files['audio']
        audio_data = audio_file.read()
        log(f"[LIVE] Audio chunk size: {len(audio_data)} bytes")
        
        # Save chunk temporarily
        processor = get_audio_processor()
        temp_path = processor.save_uploaded_file(audio_data, 'live_chunk.webm')
        
        # Convert webm to wav for Whisper
        log(f"[LIVE] Converting to WAV...")
        wav_path = processor.convert_to_wav(temp_path)
        log(f"[LIVE] WAV path: {wav_path}")
        
        if wav_path:
            # Check audio energy level to skip silent chunks
            try:
                import soundfile as sf
                audio_data_raw, sample_rate = sf.read(wav_path)
                rms = float((audio_data_raw ** 2).mean() ** 0.5)
                log(f"[LIVE] Audio RMS energy: {rms:.6f}")
                
                # Skip if audio is too quiet (likely silence or noise)
                if rms < 0.005:  # Threshold for meaningful audio
                    log(f"[LIVE] Skipping silent/quiet audio (RMS: {rms:.6f})")
                    processor.cleanup_temp_file(wav_path)
                    processor.cleanup_temp_file(temp_path)
                    return jsonify({'status': 'skipped', 'reason': 'silent'})
            except Exception as e:
                log(f"[LIVE] Could not check audio energy: {e}")
            
            # Transcribe directly (no chunking needed for live 5-sec chunks)
            ml_engine = get_ml_engine()
            
            try:
                log("[LIVE] Starting transcription...")
                result = processor.whisper_model.transcribe(
                    wav_path,
                    task="transcribe",
                    verbose=False,
                    word_timestamps=False,
                    temperature=0.0,
                    beam_size=1,
                    best_of=1,
                )
                
                segments = result.get('segments', [])
                log(f"[LIVE] Found {len(segments)} segments")
                
                # Filter out Whisper hallucinations (common fake outputs)
                hallucinations = [
                    "thanks for watching", "thank you for watching", "subscribe",
                    "like and subscribe", "see you next time", "bye bye",
                    "thank you", "thanks", "you", "the end", "...",
                    "music", "[music]", "(music)", "applause", "[applause]",
                    "1.5 cm", "1.5cm", "cm", "mm", "m", ".", "..", "...",
                    "uh", "um", "hmm", "hm", "ah", "oh", "eh",
                    "i don't know", "okay", "ok", "yeah", "yes", "no",
                    "the", "a", "an", "is", "it", "this", "that",
                ]
                
                # Hallucination patterns (regex-like checks)
                hallucination_patterns = [
                    r'^[\d\.\s]+$',           # Only numbers and dots (like "1.5")
                    r'^\d+\.?\d*\s*(cm|mm|m|km|kg|g|lb)$',  # Measurements
                    r'^[\.]+$',               # Only dots
                    r'^\s*$',                 # Only whitespace
                ]
                
                for segment in segments:
                    text = segment.get('text', '').strip()
                    log(f"[LIVE] Raw segment: '{text}'")
                    
                    # Skip empty or too short (need at least 5 chars for meaningful speech)
                    if not text or len(text) < 5:
                        log(f"[LIVE] Skipping too short: '{text}'")
                        continue
                    
                    # Skip exact hallucinations
                    if text.lower() in hallucinations:
                        log(f"[LIVE] Skipping hallucination: '{text}'")
                        continue
                    
                    # Skip pattern-based hallucinations
                    is_hallucination = False
                    for pattern in hallucination_patterns:
                        if re.match(pattern, text.lower()):
                            log(f"[LIVE] Skipping pattern hallucination: '{text}'")
                            is_hallucination = True
                            break
                    
                    if is_hallucination:
                        continue
                    
                    # For live audio, assume Client is speaking (single mic input)
                    speaker = "Client"
                    
                    # Process with ML
                    conversation_history = conversations_db.get(call_id, {}).get('messages', [])
                    ml_result = ml_engine.process_message(text, speaker, conversation_history)
                    
                    # Create message
                    message = {
                        'id': len(conversation_history) + 1,
                        'speaker': speaker,
                        'text': text,
                        'sentiment_score': ml_result['message']['sentiment_score'],
                        'sentiment_label': ml_result['message']['sentiment_label'],
                        'timestamp': datetime.utcnow().isoformat()
                    }
                    
                    # Store message
                    if call_id not in conversations_db:
                        conversations_db[call_id] = {'messages': []}
                    conversations_db[call_id]['messages'].append(message)
                    
                    # Emit to frontend - use room AND broadcast
                    log(f"[LIVE] Emitting message to room: {call_id}")
                    socketio.emit('new_message', {'message': message}, room=call_id)
                    
                    # Emit prediction update
                    socketio.emit('prediction_update', {
                        'conversion_score': ml_result['conversation_score'],
                        'factors': ml_result['factors'],
                        'metrics': ml_result['metrics'],
                        'timestamp': datetime.utcnow().isoformat()
                    }, room=call_id)
                    
                    # Log
                    text_preview = text[:50] + "..." if len(text) > 50 else text
                    try:
                        log(f"[LIVE] [{speaker}] {text_preview}")
                    except:
                        log(f"[LIVE] [{speaker}] [transcribed {len(text)} chars]")
                        
            except Exception as e:
                import traceback
                log(f"Live transcription error: {e}")
                traceback.print_exc()
            finally:
                # Cleanup
                processor.cleanup_temp_file(temp_path)
                processor.cleanup_temp_file(wav_path)
                log("[LIVE] Chunk processing complete")
        else:
            processor.cleanup_temp_file(temp_path)
        
        return jsonify({'success': True})
        
    except Exception as e:
        log(f'Live audio error: {e}')
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

@socketio.on('stop_transcription')
def handle_stop_transcription(data):
    """Stop an ongoing transcription"""
    call_id = data.get('call_id')
    if call_id:
        stop_transcription_flags[call_id] = True
        log(f"Stop requested for call_id: {call_id}")
        emit('transcription_stopped', {'call_id': call_id}, room=call_id)

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    print('')
    print('  ConverIQ - Real-Time Transcription Server')
    print('  ' + '=' * 40)
    print('')
    print('  Loading ML models...')
    get_ml_engine()  # Initialize ML engine on startup
    print('')
    print(f'  Server ready on http://localhost:{port}')
    print('  Waiting for audio uploads...')
    print('')
    socketio.run(app, host='0.0.0.0', port=port, debug=False)
