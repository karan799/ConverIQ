"""
Test script for streaming audio transcription
"""

from audio_processor import AudioProcessor
import time

def test_streaming():
    print("Initializing Audio Processor...")
    processor = AudioProcessor()
    
    # Define a callback function to handle streamed messages
    message_count = 0
    
    def on_message(msg_data):
        nonlocal message_count
        message_count += 1
        print(f"\n[Message {message_count}] Received:")
        print(f"  Speaker: {msg_data['speaker']}")
        print(f"  Text: {msg_data['text'][:100]}...")
        print(f"  Time: {msg_data['start_time']:.2f}s - {msg_data['end_time']:.2f}s")
    
    # Test with a sample audio file
    # Replace with your test audio file path
    audio_file = input("Enter path to test audio file (or press Enter to skip): ").strip()
    
    if not audio_file:
        print("No audio file provided. Test skipped.")
        return
    
    print("\nStarting streaming transcription...")
    start_time = time.time()
    
    try:
        processor.process_audio_file_streaming(audio_file, on_message)
        
        elapsed = time.time() - start_time
        print(f"\n✓ Streaming complete!")
        print(f"  Total messages: {message_count}")
        print(f"  Time elapsed: {elapsed:.2f}s")
        
    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_streaming()
