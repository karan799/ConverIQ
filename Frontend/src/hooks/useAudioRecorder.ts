import { useRef, useState, useCallback } from 'react';

export const useAudioRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Function to mix streams: Local + Remote
  const startRecording = useCallback((localStream: MediaStream | null, remoteStream: MediaStream | null) => {
    if (!localStream && !remoteStream) {
        console.error("No streams to record");
        return;
    }

    try {
      const audioContext = new AudioContext();
      const destination = audioContext.createMediaStreamDestination();

      if (localStream) {
        const source = audioContext.createMediaStreamSource(localStream);
        source.connect(destination);
      }

      if (remoteStream) {
        const source = audioContext.createMediaStreamSource(remoteStream);
        source.connect(destination);
      }

      const mixedStream = destination.stream;
      const mediaRecorder = new MediaRecorder(mixedStream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        
        // Auto-download or return URL? Let's auto-download for MVP convenience
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `voice-call-recording-${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error starting recording:', err);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, []);

  return {
    isRecording,
    startRecording,
    stopRecording
  };
};
