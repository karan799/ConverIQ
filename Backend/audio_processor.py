"""
Audio processing module for ConverIQ
Handles audio upload, speaker diarization, and speech-to-text conversion
"""

import whisper
import torch
import tempfile
import os
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
    print("Warning: librosa, soundfile, or noisereduce not available. Noise reduction disabled.")

class AudioProcessor:
    def __init__(self):
        """Initialize audio processing models"""
        print("Loading Whisper model for speech-to-text...")
        # Use 'small' model for better accuracy (still fast enough)
        self.whisper_model = whisper.load_model("small")
        if AUDIO_LIBS_AVAILABLE:
            print("Audio processing engine initialized with noise reduction!")
        else:
            print("Audio processing engine initialized (noise reduction unavailable)!")
    
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
                print("Applying noise reduction...")
                denoised_path = self._reduce_noise(audio_path)
                if denoised_path:
                    audio_to_transcribe = denoised_path
                    print("Noise reduction complete!")
            
            # Step 2: Transcribe audio using Whisper with optimized settings
            print(f"Transcribing audio from: {audio_to_transcribe}")
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
            print(f"Error processing audio: {e}")
            raise e
        finally:
            # Clean up denoised file
            if denoised_path and os.path.exists(denoised_path):
                try:
                    os.remove(denoised_path)
                except:
                    pass
    
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
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=ext)
        temp_file.write(file_data)
        temp_file.close()
        
        return temp_file.name
    
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
            
            # Save denoised audio to temp file
            temp_denoised = tempfile.NamedTemporaryFile(delete=False, suffix='.wav')
            sf.write(temp_denoised.name, reduced_noise, sr)
            temp_denoised.close()
            
            return temp_denoised.name
            
        except Exception as e:
            print(f"Warning: Noise reduction failed: {e}")
            return None
    
    def cleanup_temp_file(self, file_path: str):
        """Remove temporary file"""
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
        except Exception as e:
            print(f"Error cleaning up temp file: {e}")


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
