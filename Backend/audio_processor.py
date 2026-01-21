"""
Audio Processing Module for ConverIQ
Handles audio transcription using Whisper and speaker diarization
"""

import whisper
import tempfile
import os
import subprocess
import numpy as np
from typing import List, Dict, Callable, Optional
import warnings
warnings.filterwarnings('ignore')

try:
    from sklearn.cluster import KMeans
    from sklearn.preprocessing import StandardScaler
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False

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
        self._ensure_ffmpeg_in_path()
        # Use 'tiny' model for fastest transcription (39MB) - prioritize speed over accuracy
        self.whisper_model = whisper.load_model("base")  # base is more accurate, fewer hallucinations
    
    def _ensure_ffmpeg_in_path(self):
        """Ensure FFmpeg is in the system PATH"""
        # Check if ffmpeg is already available
        import shutil
        if shutil.which("ffmpeg"):
            return

        # Common locations for Winget installs
        possible_paths = [
            os.path.join(os.environ.get("LOCALAPPDATA", ""), r"Microsoft\WinGet\Packages"),
            os.path.join(os.environ.get("ProgramFiles", ""), r"Microsoft\WinGet\Packages")
        ]
        
        found_bin = None
        
        # Search for ffmpeg.exe
        for base_path in possible_paths:
            if not os.path.exists(base_path):
                continue
                
            for root, dirs, files in os.walk(base_path):
                if "ffmpeg.exe" in files:
                    found_bin = root
                    break
            if found_bin:
                break
        
        if found_bin:
            print(f"DEBUG: Found FFmpeg at {found_bin}, adding to PATH")
            os.environ["PATH"] += os.pathsep + found_bin
        else:
            print("WARNING: FFmpeg not found in PATH or common locations. Audio processing may fail.")
    
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
        except Exception:
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
        except Exception:
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
        except Exception:
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
                # language="en",
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
    
    
    def _extract_segment_embedding(self, audio_path: str, start: float, end: float):
        """Extract MFCC features for a specific audio segment"""
        try:
            duration = end - start
            if duration < 0.1:  # Too short
                return None
                
            y, sr = librosa.load(audio_path, sr=16000, offset=start, duration=duration)
            
            # Extract MFCCs
            mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
            # Use mean and std of MFCCs as features
            return np.concatenate([np.mean(mfcc, axis=1), np.std(mfcc, axis=1)])
        except Exception:
            return None

    def _cluster_speakers(self, segments: List[Dict], audio_path: str) -> List[Dict]:
        """
        Cluster segments into 2 speakers using K-Means on MFCC features.
        Enforces that the FIRST segment is always assigned to 'Client'.
        """
        if not segments:
            return []
            
        if not SKLEARN_AVAILABLE or not AUDIO_LIBS_AVAILABLE:
            return self._simple_speaker_diarization(segments)
            
        try:
            # Extract features for all segments
            features = []
            valid_indices = []
            
            for i, seg in enumerate(segments):
                # We need to access the original audio to extract features.
                # Since we might be in a streaming context where chunks are gone,
                # this method works best when we have the full file or can access chunks.
                # For this implementation, we assume audio_path is accessible.
                
                feat = self._extract_segment_embedding(audio_path, seg['start'], seg['end'])
                if feat is not None:
                    features.append(feat)
                    valid_indices.append(i)
            
            if len(features) < 2:
                return self._simple_speaker_diarization(segments)
                
            # Normalize features
            scaler = StandardScaler()
            X_scaled = scaler.fit_transform(features)
            
            # Cluster into 2 speakers
            kmeans = KMeans(n_clusters=2, random_state=42, n_init=10)
            labels = kmeans.fit_predict(X_scaled)
            
            # map cluster IDs to speaker names
            # Logic: The first valid segment MUST be 'Agent' (as requested)
            first_label = labels[0]
            
            # If first_label is 0, then 0->Agent, 1->Client
            # If first_label is 1, then 1->Agent, 0->Client
            speaker_map = {
                first_label: "Agent",
                1 - first_label: "Client"
            }
            
            messages = []
            label_idx = 0
            
            for i, seg in enumerate(segments):
                speaker = "Agent" # Default fallback
                if i in valid_indices:
                    cluster_label = labels[label_idx]
                    speaker = speaker_map[cluster_label]
                    label_idx += 1
                elif i > 0 and messages:
                    # Inherit from previous if feature extraction failed
                    speaker = messages[-1]['speaker']
                
                messages.append({
                    'speaker': speaker,
                    'text': seg['text'].strip(),
                    'start_time': seg['start'],
                    'end_time': seg['end'],
                    'duration': seg['end'] - seg['start']
                })
                
            return messages
            
        except Exception as e:
            print(f"Clustering failed: {e}, falling back to simple")
            return self._simple_speaker_diarization(segments)

    def process_audio_file_streaming(self, audio_path: str, callback, progress_callback=None, stop_check=None) -> None:
        """
        Process audio file with streaming output using Incremental Clustering.
        """
        chunk_files = []
        
        try:
            # Get audio duration
            duration = self._ffmpeg_get_duration(audio_path)
            chunk_duration = 15  # Process in 15s chunks for balance of latency and context
            
            if duration > 0:
                total_chunks = int(np.ceil(duration / chunk_duration))
            else:
                total_chunks = 1
                duration = 0
            
            if progress_callback:
                progress_callback(0, total_chunks, "Starting real-time transcription...")
            
            # Global state for incremental clustering
            global_features = []
            global_segments_count = 0
            initial_speaker_env = os.environ.get("INITIAL_SPEAKER", "Agent")
            temp_dir = tempfile.gettempdir()
            
            # Process chunks
            for chunk_idx in range(total_chunks):
                if stop_check and stop_check():
                    break
                
                if progress_callback:
                    progress_callback(chunk_idx, total_chunks, f"Processing segment {chunk_idx + 1}/{total_chunks}...")
                
                # 1. Extract/Define Chunk
                if duration > 0:
                    start_time = chunk_idx * chunk_duration
                    end_time = min((chunk_idx + 1) * chunk_duration, duration)
                    chunk_duration_actual = end_time - start_time
                    
                    chunk_filename = f"chunk_{os.getpid()}_{chunk_idx}.wav"
                    chunk_path = os.path.join(temp_dir, chunk_filename)
                    
                    if self._ffmpeg_extract_chunk(audio_path, start_time, chunk_duration_actual, chunk_path):
                        chunk_files.append(chunk_path)
                    else:
                        chunk_path = audio_path
                else:
                    chunk_path = audio_path

                # 2. Transcribe Chunk
                result = self.whisper_model.transcribe(
                    chunk_path,
                    task="transcribe",
                    verbose=False,
                    word_timestamps=False
                )
                segments = result.get('segments', [])
                
                # 3. Process Segments and Cluster
                new_features = []
                valid_segment_indices = [] # Indices of segments in this chunk that produced features
                
                # Extract features for new segments
                for i, seg in enumerate(segments):
                    # Adjust times to global time
                    seg['start'] += (chunk_idx * chunk_duration)
                    seg['end'] += (chunk_idx * chunk_duration)
                    
                    # For feature extraction, we need to access the Audio from the specific time.
                    # We can use the chunk_path or the original file.
                    # Ideally use original file with global timestamps, but chunk_path is faster for IO?
                    # Actually _extract_segment_embedding uses librosa.load with offset.
                    # It's better to use audio_path with global offset to be consistent.
                    
                    feat = self._extract_segment_embedding(audio_path, seg['start'], seg['end'])
                    if feat is not None:
                        new_features.append(feat)
                        valid_segment_indices.append(i)
                
                # Update global features
                start_feature_idx = len(global_features)
                global_features.extend(new_features)
                
                # Perform Clustering (if we have enough data)
                labels = []
                if SKLEARN_AVAILABLE and len(global_features) >= 2:
                    try:
                        scaler = StandardScaler()
                        X_scaled = scaler.fit_transform(global_features)
                        kmeans = KMeans(n_clusters=2, random_state=42, n_init=10)
                        labels = kmeans.fit_predict(X_scaled)
                    except Exception as e:
                        print(f"Incremental clustering failed: {e}")
                        labels = []
                
                # Assign Speakers
                feature_idx_in_chunk = 0
                
                for i, seg in enumerate(segments):
                    speaker = initial_speaker_env # Default
                    
                    if i in valid_segment_indices:
                        if len(labels) == len(global_features):
                            # We have valid clustering
                            current_label = labels[start_feature_idx + feature_idx_in_chunk]
                            first_label = labels[0] # Anchor to first segment ever
                            
                            # Logic: First segment (index 0) is ALWAYS "Agent" (or configured env)
                            # If current_label == first_label -> Agent
                            # else -> Client
                            
                            if current_label == first_label:
                                speaker = initial_speaker_env
                            else:
                                speaker = "Client" if initial_speaker_env == "Agent" else "Agent"
                            
                        feature_idx_in_chunk += 1
                    
                    # Fallback logic for very first segment if clustering not ready
                    elif len(global_features) < 2 and global_segments_count == 0 and i == 0:
                        speaker = initial_speaker_env
                    
                    msg = {
                        'speaker': speaker,
                        'text': seg['text'].strip(),
                        'start_time': seg['start'],
                        'end_time': seg['end'],
                        'duration': seg['end'] - seg['start']
                    }
                    callback(msg)
                    global_segments_count += 1
                
                # Clean up chunk
                if chunk_path != audio_path and os.path.exists(chunk_path):
                    try:
                        os.remove(chunk_path)
                    except:
                        pass
                        
            if progress_callback:
                progress_callback(total_chunks, total_chunks, "Transcription complete!")
            
        except Exception as e:
            raise e
        finally:
            for f in chunk_files:
                try:
                    if os.path.exists(f): 
                        os.remove(f)
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
        current_speaker = os.environ.get("INITIAL_SPEAKER", "Agent")  # Get initial speaker from env, default to Agent
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
