import { useRef, useEffect, useState } from 'react';
import { Phone, Mic, MicOff, Settings, Circle, Square } from 'lucide-react';
import {  useWebRTC} from '../hooks/useWebRTC';
import {useAudioRecorder} from '../hooks/useAudioRecorder';

export default function AudioFunction() {
  const { localStream, remoteStream, status, isConnected, startCall, endCall } = useWebRTC();
  const { isRecording, startRecording, stopRecording } = useAudioRecorder();
  
  const [isMuted, setIsMuted] = useState(false);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (remoteStream && remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.play().catch(e => console.error("Error playing audio:", e));
    }
  }, [remoteStream]);

  const handleStartCall = () => {
    startCall();
  };

  const handleEndCall = () => {
    endCall();
    stopRecording();
  };

  const handleToggleRecord = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording(localStream, remoteStream);
    }
  };

  const toggleMute = () => {
    if (localStream) {
       localStream.getAudioTracks().forEach(track => {
           track.enabled = !track.enabled;
       });
       setIsMuted(!isMuted);
    }
  };

  return (
    <div className="container">
      <audio ref={remoteAudioRef} autoPlay />
      
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, background: 'linear-gradient(to right, #3b82f6, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          VoiceConnect
        </h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.875rem', opacity: 0.7 }}>{status}</span>
          <button className="btn-icon">
            <Settings size={20} />
          </button>
        </div>
      </header>
      
      <main style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
        
        {/* Call Interface */}
        <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '3rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem', textAlign: 'center' }}>
          
          <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: 'linear-gradient(135deg, #1e293b, #0f172a)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <div style={{ position: 'absolute', inset: -4, borderRadius: '50%', background: isConnected ? 'var(--primary-color)' : 'transparent', opacity: 0.5, zIndex: -1 }} className={isConnected ? 'animate-pulse' : ''}></div>
            <span style={{ fontSize: '3rem' }}>👤</span>
          </div>

          <div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{isConnected ? 'Connected' : 'Start Call'}</h2>
            <p style={{ opacity: 0.6 }}>{isConnected ? 'High quality voice active' : 'Ready to start a secure voice session with recording.'}</p>
          </div>

          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem' }}>
            {isConnected || status !== 'Idle' ? (
              <>
                 <button className="btn-icon" onClick={toggleMute} style={{ background: isMuted ? '#ef4444' : undefined }} title="Mute/Unmute">
                  {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                </button>
                
                <button className="btn-icon" onClick={handleToggleRecord} style={{ background: isRecording ? 'rgba(239, 68, 68, 0.2)' : undefined, borderColor: isRecording ? '#ef4444' : undefined }} title="Record Call">
                  {isRecording ? <Square size={24} fill="#ef4444" color="#ef4444" /> : <Circle size={24} fill="red" color="red" />}
                </button>

                <button className="btn-danger" onClick={handleEndCall} title="End Call">
                  <Phone size={24} style={{ transform: 'rotate(135deg)' }} />
                </button>
              </>
            ) : (
                <button className="btn-primary" onClick={handleStartCall} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem 2rem', fontSize: '1.1rem' }}>
                  <Phone size={20} /> Start Call
                </button>
            )}
          </div>
          
           {isRecording && <div style={{color: '#ef4444', fontSize: '0.8rem', marginTop: '-1rem'}}>Recording...</div>}

        </div>

        {/* Visualizer Placeholder */}
        {isConnected && (
          <div style={{ position: 'absolute', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '4px', height: '30px', alignItems: 'end' }}>
             {[...Array(10)].map((_, i) => (
               <div key={i} style={{ width: '4px', height: `${Math.random() * 100}%`, background: 'var(--primary-color)', borderRadius: '2px', opacity: 0.7 }}></div>
             ))}
          </div>
        )}

      </main>
    </div>
  );
}


