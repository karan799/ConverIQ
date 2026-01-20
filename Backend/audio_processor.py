"""
Audio processing module for ConverIQ
Handles audio upload, speaker diarization, and speech-to-text conversion
"""

import whisper
import torch
import tempfile
import os
import subprocess
import numpy as np
from typing import List, Dict, Tuple
import warnings
warnings.filterwarnings('ignore')

try:
    import librosa
    import soundfile as sf
    import noisereduce as nr
    AUDIO_LIBS_AVAILABLE = True
except ImportError:
    AUDIO_LIBS_AVAILABLE = False

class AudioProcessor:
    def __init__(self):
        """Initialize audio processing models"""
        # Use 'tiny' model for fastest transcription (39MB) - prioritize speed over accuracy
        self.whisper_model = whisper.load_model("base")  # base is more accurate, fewer hallucinations
    
    def _ffmpeg_extract_chunk(self, audio_path: str, start_time: float, duration: float, output_path: str) -> bool:
        """Extract audio chunk using FFmpeg (much faster than librosa)"""
        try:
            cmd = [
                'ffmpeg', '-y', '-hide_banner', '-loglevel', 'error',
                '-ss', str(start_time),  # Seek position (before -i for fast seeking)
                '-i', audio_path,
                '-t', str(duration),
                '-ar', '16000',  # 16kHz sample rate for Whisper
                '-ac', '1',  # Mono
                '-f', 'wav',
                output_path
            ]
            subprocess.run(cmd, check=True, capture_output=True)
            return True
        except Exception as e:
            print(f"[DEBUG] FFmpeg error: {e}")
            return False
    
    def _ffmpeg_get_duration(self, audio_path: str) -> float:
        """Get audio duration using FFprobe (fast)"""
        try:
            cmd = [
                'ffprobe', '-v', 'error',
                '-show_entries', 'format=duration',
                '-of', 'default=noprint_wrappers=1:nokey=1',
                audio_path
            ]
            result = subprocess.run(cmd, check=True, capture_output=True, text=True)
            return float(result.stdout.strip())
        except Exception as e:
            print(f"[DEBUG] FFprobe error: {e}")
            return 0
    
    def convert_to_wav(self, input_path: str) -> str:
        """Convert any audio format (webm, mp3, etc.) to WAV for Whisper"""
        try:
            output_path = input_path.rsplit('.', 1)[0] + '_converted.wav'
            cmd = [
                'ffmpeg', '-y', '-hide_banner', '-loglevel', 'error',
                '-i', input_path,
                '-ar', '16000',  # 16kHz for Whisper
                '-ac', '1',      # Mono
                '-f', 'wav',
                output_path
            ]
            subprocess.run(cmd, check=True, capture_output=True)
            return output_path
        except Exception as e:
            print(f"[DEBUG] FFmpeg convert error: {e}")
            return None
    
    def process_audio_file(self, audio_path: str) -> List[Dict[str, any]]:
        """
        Process audio file: transcribe and perform speaker diarization
        
        Args:
            audio_path: Path to audio file
            
        Returns:
            List of messages with speaker, text, and timestamp
        """
        denoised_path = None
        try:
            # Step 1: Apply noise reduction if libraries available
            audio_to_transcribe = audio_path
            if AUDIO_LIBS_AVAILABLE:
                denoised_path = self._reduce_noise(audio_path)
                if denoised_path:
                    audio_to_transcribe = denoised_path
            
            # Step 2: Transcribe audio using Whisper with optimized settings
            result = self.whisper_model.transcribe(
                audio_to_transcribe,
                language="en",
                task="transcribe",
                verbose=False,
                word_timestamps=True,
                # Optimized settings for better accuracy
                temperature=0.0,  # More deterministic output
                best_of=5,  # Sample multiple times and pick best
                beam_size=5,  # Use beam search for better accuracy
                patience=1.0,  # Allows more exploration
                compression_ratio_threshold=2.4,  # Filter out poor quality segments
                logprob_threshold=-1.0,  # Filter low confidence segments
                no_speech_threshold=0.6,  # Better silence detection
                condition_on_previous_text=True  # Use context from previous segments
            )
            
            # Step 3: Extract segments with timestamps
            segments = result.get('segments', [])
            
            if not segments:
                return []
            
            # Step 4: Simple speaker diarization using heuristics
            messages = self._simple_speaker_diarization(segments)
            
            return messages
            
        except Exception as e:
            raise e
        finally:
            # Clean up denoised file
            if denoised_path and os.path.exists(denoised_path):
                try:
                    os.remove(denoised_path)
                except:
                    pass
    
    def process_audio_file_streaming(self, audio_path: str, callback, progress_callback=None, stop_check=None) -> None:
        """
        Process audio file with streaming output - transcribes in chunks and calls callback progressively
        
        Args:
            audio_path: Path to audio file
            callback: Function to call with each transcribed message dict
            progress_callback: Optional function to call with progress updates (chunk_num, total_chunks, status)
            stop_check: Optional function that returns True if processing should stop
        """
        denoised_path = None
        chunk_files = []
        
        try:
            # Get audio duration using FFprobe (very fast)
            duration = self._ffmpeg_get_duration(audio_path)
            chunk_duration = 5
            
            if duration > 0:
                total_chunks = int(np.ceil(duration / chunk_duration))
            else:
                # Fallback - process as single file
                total_chunks = 1
                duration = 0
            
            print(f"[DEBUG] Audio duration: {duration}s, chunks: {total_chunks}")
            
            if progress_callback:
                progress_callback(0, total_chunks, "Starting transcription...")
            
            # Track global state across chunks
            current_speaker = "Agent"  # First speaker is always agent
            last_speaker_change = 0
            global_segment_index = 0
            last_end_time = 0  # Track end time across chunks
            temp_dir = tempfile.gettempdir()
            
            # Process each chunk on-demand (no pre-processing delay!)
            for chunk_idx in range(total_chunks):
                # Check if we should stop
                if stop_check and stop_check():
                    print("[DEBUG] Stop requested, halting transcription")
                    break
                
                if progress_callback:
                    progress_callback(chunk_idx + 1, total_chunks, f"Transcribing segment {chunk_idx + 1}/{total_chunks}...")
                
                # Create chunk on-demand using FFmpeg (very fast!)
                if duration > 0:
                    start_time = chunk_idx * chunk_duration
                    end_time = min((chunk_idx + 1) * chunk_duration, duration)
                    chunk_duration_actual = end_time - start_time
                    
                    # Extract chunk using FFmpeg
                    chunk_filename = f"chunk_{os.getpid()}_{chunk_idx}.wav"
                    chunk_path = os.path.join(temp_dir, chunk_filename)
                    
                    if self._ffmpeg_extract_chunk(audio_path, start_time, chunk_duration_actual, chunk_path):
                        chunk_files.append(chunk_path)
                    else:
                        # Fallback to original file if FFmpeg fails
                        chunk_path = audio_path
                else:
                    chunk_path = audio_path
                
                # Transcribe this chunk immediately (optimized for speed)
                result = self.whisper_model.transcribe(
                    chunk_path,
                    task="transcribe",
                    verbose=False,
                    word_timestamps=False,
                    temperature=0.0,
                    best_of=1,
                    beam_size=1,  # Fastest beam search
                    patience=0.0,
                    compression_ratio_threshold=2.4,
                    logprob_threshold=-1.0,
                    no_speech_threshold=0.6,
                    condition_on_previous_text=False  # Faster without context
                )
                
                segments = result.get('segments', [])
                print(f"[DEBUG] Found {len(segments)} segments in chunk {chunk_idx + 1}")
                
                # Process segments from this chunk
                for i, segment in enumerate(segments):
                    text = segment.get('text', '').strip()
                    start = segment.get('start', 0) + (chunk_idx * chunk_duration)
                    end = segment.get('end', 0) + (chunk_idx * chunk_duration)
                    
                    if not text:
                        continue
                    
                    # Detect speaker changes based on pauses
                    pause_duration = 0
                    if global_segment_index > 0:
                        if i == 0:
                            pause_duration = start - last_end_time
                        else:
                            prev_segment = segments[i-1]
                            prev_end = prev_segment.get('end', 0) + (chunk_idx * chunk_duration)
                            pause_duration = start - prev_end
                        
                        # Use 0.8 second threshold for speaker change
                        if pause_duration > 0.8 and (global_segment_index - last_speaker_change) >= 1:
                            current_speaker = "Client" if current_speaker == "Agent" else "Agent"
                            last_speaker_change = global_segment_index
                    
                    last_end_time = end
                    
                    message = {
                        'speaker': current_speaker,
                        'text': text,
                        'start_time': start,
                        'end_time': end,
                        'duration': end - start
                    }
                    
                    callback(message)
                    global_segment_index += 1
                
                # Clean up this chunk immediately
                if AUDIO_LIBS_AVAILABLE and chunk_path != audio_path:
                    try:
                        os.remove(chunk_path)
                        chunk_files.remove(chunk_path)
                    except:
                        pass
            
            # Signal completion
            if progress_callback:
                progress_callback(total_chunks, total_chunks, "Transcription complete!")
            
        except Exception as e:
            raise e
        finally:
            # Clean up any remaining chunk files
            for chunk_file in chunk_files:
                try:
                    if os.path.exists(chunk_file):
                        os.remove(chunk_file)
                except:
                    pass
    
    def _split_audio_into_chunks(self, audio_path: str, chunk_duration: int = 30) -> List[str]:
        """
        Split audio file into smaller chunks for progressive processing
        
        Args:
            audio_path: Path to audio file
            chunk_duration: Duration of each chunk in seconds
            
        Returns:
            List of paths to chunk files
        """
        if not AUDIO_LIBS_AVAILABLE:
            # If libraries not available, return original file as single chunk
            return [audio_path]
        
        try:
            # Get audio duration first without loading entire file
            duration = librosa.get_duration(path=audio_path)
            num_chunks = int(np.ceil(duration / chunk_duration))
            
            chunk_files = []
            temp_dir = tempfile.gettempdir()
            sr = 16000  # Target sample rate
            
            # Stream-load and write chunks one at a time
            for i in range(num_chunks):
                start_time = i * chunk_duration
                end_time = min((i + 1) * chunk_duration, duration)
                chunk_duration_actual = end_time - start_time
                
                # Load only this chunk's audio segment
                chunk_audio, _ = librosa.load(
                    audio_path, 
                    sr=sr, 
                    offset=start_time, 
                    duration=chunk_duration_actual
                )
                
                # Save chunk
                chunk_filename = f"chunk_{os.getpid()}_{i}.wav"
                chunk_path = os.path.join(temp_dir, chunk_filename)
                sf.write(chunk_path, chunk_audio, sr)
                chunk_files.append(chunk_path)
            
            return chunk_files
            
        except Exception as e:
            # Return original file as fallback
            return [audio_path]
    
    def _simple_speaker_diarization(self, segments: List[Dict]) -> List[Dict[str, any]]:
        """
        Simple speaker diarization using pause detection and alternating pattern
        
        Improved heuristics:
        - First speaker is always Agent (calls typically start with agent greeting)
        - Use longer pauses (>1.5 sec) to detect speaker changes
        - Consider message length patterns (agents tend to have longer initial messages)
        
        Args:
            segments: List of transcribed segments from Whisper
            
        Returns:
            List of messages with assigned speakers
        """
        messages = []
        current_speaker = "Agent"  # First speaker is always agent (initiates call)
        last_speaker_change = 0
        
        for i, segment in enumerate(segments):
            text = segment.get('text', '').strip()
            start = segment.get('start', 0)
            end = segment.get('end', 0)
            
            if not text:
                continue
            
            # Detect speaker changes based on pauses
            if i > 0:
                prev_end = segments[i-1].get('end', 0)
                pause_duration = start - prev_end
                
                # Use 1.5 second threshold for speaker change
                # Also ensure we haven't just changed speakers (avoid rapid switching)
                if pause_duration > 1.5 and (i - last_speaker_change) >= 1:
                    current_speaker = "Client" if current_speaker == "Agent" else "Agent"
                    last_speaker_change = i
            
            messages.append({
                'speaker': current_speaker,
                'text': text,
                'start_time': start,
                'end_time': end,
                'duration': end - start
            })
        
        return messages
    
    def save_uploaded_file(self, file_data, filename: str) -> str:
        """
        Save uploaded file to temporary location
        
        Args:
            file_data: File data from upload
            filename: Original filename
            
        Returns:
            Path to saved file
        """
        # Create temp file with original extension
        _, ext = os.path.splitext(filename)
        # Use a different approach for Windows compatibility
        temp_dir = tempfile.gettempdir()
        temp_filename = f"audio_{os.getpid()}_{id(file_data)}{ext}"
        temp_path = os.path.join(temp_dir, temp_filename)
        
        # Write data to file
        with open(temp_path, 'wb') as f:
            f.write(file_data)
        
        return temp_path
    
    def _reduce_noise(self, audio_path: str) -> str:
        """
        Apply noise reduction to audio file
        
        Args:
            audio_path: Path to original audio file
            
        Returns:
            Path to denoised audio file, or None if failed
        """
        try:
            # Load audio file
            audio, sr = librosa.load(audio_path, sr=16000)  # 16kHz for Whisper
            
            # Apply noise reduction
            # Use the first 0.5 seconds as noise sample (usually silent/noisy)
            noise_sample = audio[:int(0.5 * sr)]
            reduced_noise = nr.reduce_noise(
                y=audio,
                sr=sr,
                stationary=True,
                prop_decrease=1.0,  # How much to reduce noise (0-1)
                freq_mask_smooth_hz=500,
                time_mask_smooth_ms=50
            )
            
            # Normalize audio to prevent clipping
            reduced_noise = librosa.util.normalize(reduced_noise)
            
            # Save denoised audio to temp file (Windows-compatible approach)
            temp_dir = tempfile.gettempdir()
            temp_filename = f"denoised_{os.getpid()}_{id(audio)}.wav"
            temp_path = os.path.join(temp_dir, temp_filename)
            
            sf.write(temp_path, reduced_noise, sr)
            
            return temp_path
            
        except Exception as e:
            return None
    
    def cleanup_temp_file(self, file_path: str):
        """Remove temporary file"""
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
        except:
            pass


# For better speaker diarization (requires additional setup):
"""
To use pyannote.audio for better speaker diarization:

1. Install: pip install pyannote.audio

2. Get Hugging Face token from https://huggingface.co/settings/tokens

3. Accept user agreement for pyannote models:
   - https://huggingface.co/pyannote/speaker-diarization
   - https://huggingface.co/pyannote/segmentation

4. Use this code:

from pyannote.audio import Pipeline

class AudioProcessorAdvanced:
    def __init__(self, hf_token: str):
        self.whisper_model = whisper.load_model("base")
        self.diarization = Pipeline.from_pretrained(
            "pyannote/speaker-diarization",
            use_auth_token=hf_token
        )
    
    def advanced_diarization(self, audio_path: str):
        # Run diarization
        diarization = self.diarization(audio_path)
        
        # Run transcription
        transcription = self.whisper_model.transcribe(audio_path)
        
        # Align transcription with diarization
        # ... alignment logic ...
"""
