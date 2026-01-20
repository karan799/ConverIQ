import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import socketService from "../services/socketService";
import type { Message, PredictionUpdate } from "../services/socketService";

export default function LiveCallScreen() {
  const navigate = useNavigate();
  const [callId] = useState(() => `live-${Date.now()}`);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [score, setScore] = useState(0);
  const [factors, setFactors] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>({});
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const chunkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasInitialized = useRef(false);
  const isRecordingRef = useRef(false);
  const audioChunksRef = useRef<Blob[]>([]);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize WebSocket connection
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const initSocket = async () => {
      try {
        await socketService.connect();
        setIsConnected(true);

        socketService.startConversation(callId, 'Agent', 'Live Client', '');

        socketService.onNewMessage((data) => {
          setMessages((prev) => [...prev, data.message]);
        });

        socketService.onPredictionUpdate((data: PredictionUpdate) => {
          setScore(data.conversion_score);
          setFactors(data.factors);
          setMetrics(data.metrics || {});
        });

        socketService.onError((data) => {
          console.error('Socket error:', data.message);
        });

      } catch (error) {
        console.error('Failed to connect:', error);
      }
    };

    initSocket();

    return () => {
      stopRecording();
      if (socketService.isConnected()) {
        socketService.offAllListeners();
        socketService.disconnect();
      }
    };
  }, []);

  // Update recording time
  useEffect(() => {
    if (isRecording) {
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, [isRecording]);

  // Audio level visualization
  const updateAudioLevel = useCallback(() => {
    if (analyserRef.current) {
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      setAudioLevel(average / 255);
    }
    if (isRecording) {
      requestAnimationFrame(updateAudioLevel);
    }
  }, [isRecording]);

  const startRecording = async () => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        } 
      });
      streamRef.current = stream;

      // Setup audio analysis for visualization
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;

      // Check supported mimeTypes
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/mp4';
        }
      }
      console.log('Using mimeType:', mimeType);

      // Setup MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      // Clear audio chunks
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        console.log('Audio data available:', event.data.size, 'bytes');
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Set recording state
      isRecordingRef.current = true;
      setIsRecording(true);
      setRecordingTime(0);

      // Send audio chunks every 5 seconds
      const sendChunks = () => {
        console.log('Interval check - chunks:', audioChunksRef.current.length, 'recording:', isRecordingRef.current);
        if (audioChunksRef.current.length > 0 && isRecordingRef.current) {
          const chunks = [...audioChunksRef.current]; // Copy array
          audioChunksRef.current = []; // Clear the array
          
          const audioBlob = new Blob(chunks, { type: 'audio/webm' });
          console.log('Sending audio chunk:', audioBlob.size, 'bytes');
          
          // Send to backend (non-blocking)
          sendAudioChunk(audioBlob).catch(err => {
            console.error('Failed to send chunk:', err);
          });
        }
      };
      
      chunkIntervalRef.current = setInterval(sendChunks, 5000);

      mediaRecorder.start(1000); // Collect data every second
      console.log('MediaRecorder started');
      updateAudioLevel();

    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('Could not access microphone. Please allow microphone permissions.');
    }
  };

  const stopRecording = () => {
    console.log('Stopping recording...');
    isRecordingRef.current = false;
    
    if (chunkIntervalRef.current) {
      clearInterval(chunkIntervalRef.current);
      chunkIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsRecording(false);
    setAudioLevel(0);
  };

  const sendAudioChunk = async (audioBlob: Blob) => {
    try {
      console.log('Preparing to send chunk, size:', audioBlob.size);
      const formData = new FormData();
      formData.append('audio', audioBlob, 'chunk.webm');
      formData.append('call_id', callId);
      formData.append('is_live', 'true');

      const response = await fetch('http://localhost:5000/api/upload_live_audio', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      console.log('Server response:', result);

      if (!response.ok) {
        console.error('Failed to send audio chunk:', result);
      }
    } catch (error) {
      console.error('Error sending audio chunk:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const endCall = () => {
    stopRecording();
    if (callId) {
      socketService.endConversation(callId);
    }
    socketService.disconnect();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900">
      {/* Header */}
      <nav className="bg-black/30 backdrop-blur-sm border-b border-white/10">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white font-bold">
              🎙️
            </div>
            <div>
              <div className="text-white font-semibold">ConverIQ Live</div>
              <div className="text-xs text-orange-300">Real-Time Recording</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {isRecording && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 rounded-full border border-red-500/30">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                <span className="text-red-400 text-sm font-mono">{formatTime(recordingTime)}</span>
              </div>
            )}
            <button
              onClick={endCall}
              className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-sm font-medium hover:bg-red-500/30 transition"
            >
              End Session
            </button>
          </div>
        </div>
      </nav>

      <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-72px)] overflow-hidden">
        {/* Left Sidebar - Analytics */}
        <div className="lg:col-span-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
          
          {/* Recording Control */}
          <div className="bg-gradient-to-br from-red-900/50 to-orange-900/50 backdrop-blur-sm border border-red-500/20 rounded-xl p-4">
            <h2 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
              🎙️ Live Recording
            </h2>
            
            {/* Audio Level Visualization */}
            <div className="mb-4">
              <div className="flex items-center gap-1 h-12 justify-center">
                {[...Array(20)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-1.5 rounded-full transition-all duration-75 ${
                      isRecording && audioLevel * 20 > i 
                        ? 'bg-gradient-to-t from-green-500 to-yellow-400' 
                        : 'bg-white/10'
                    }`}
                    style={{ 
                      height: `${Math.max(8, (isRecording ? (audioLevel * 100 * (1 + Math.sin(i * 0.5))) : 20))}%` 
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Record Button */}
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`w-full py-4 rounded-xl font-semibold text-lg transition-all flex items-center justify-center gap-3 ${
                isRecording
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white'
              }`}
            >
              {isRecording ? (
                <>
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                  Stop Recording
                </>
              ) : (
                <>
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="6" />
                  </svg>
                  Start Recording
                </>
              )}
            </button>

            <p className="text-white/40 text-xs text-center mt-3">
              {isRecording 
                ? 'Recording... Speak clearly into your microphone'
                : 'Click to start recording the conversation'}
            </p>
          </div>

          {/* Lead Score Card */}
          <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 backdrop-blur-sm border border-purple-500/20 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                📊 Lead Score
              </h3>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                score >= 70 ? 'bg-green-500/30 text-green-300' :
                score >= 40 ? 'bg-yellow-500/30 text-yellow-300' :
                'bg-red-500/30 text-red-300'
              }`}>
                {score >= 70 ? '🔥 Hot' : score >= 40 ? '🌡️ Warm' : '❄️ Cold'}
              </span>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-5xl font-bold text-white">{score}</span>
              <span className="text-white/40 text-lg mb-1">/100</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2 mt-2">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${
                  score >= 70 ? 'bg-gradient-to-r from-green-500 to-emerald-400' :
                  score >= 40 ? 'bg-gradient-to-r from-yellow-500 to-orange-400' :
                  'bg-gradient-to-r from-red-500 to-pink-400'
                }`}
                style={{ width: `${Math.min(score, 100)}%` }}
              />
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-2">
            {/* Sentiment */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3">
              <div className="flex items-center gap-1 text-pink-400 text-xs mb-1">
                😊 Sentiment
              </div>
              <div className="flex items-end gap-1">
                <span className={`text-2xl font-bold ${
                  (metrics.sentiment_score || 0) >= 20 ? 'text-green-400' :
                  (metrics.sentiment_score || 0) >= 10 ? 'text-yellow-400' : 'text-white/50'
                }`}>
                  {metrics.sentiment_score?.toFixed(0) || '0'}
                </span>
                <span className="text-white/30 text-xs mb-0.5">/30</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-1 mt-1">
                <div 
                  className={`h-1 rounded-full transition-all ${
                    (metrics.sentiment_score || 0) >= 20 ? 'bg-green-500' :
                    (metrics.sentiment_score || 0) >= 10 ? 'bg-yellow-500' : 'bg-white/20'
                  }`}
                  style={{ width: `${((metrics.sentiment_score || 0) / 30) * 100}%` }}
                />
              </div>
            </div>

            {/* Buying Intent */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3">
              <div className="flex items-center gap-1 text-green-400 text-xs mb-1">
                🛒 Intent
              </div>
              <div className="flex items-end gap-1">
                <span className="text-2xl font-bold text-green-400">
                  {metrics.buying_signal_score?.toFixed(0) || '0'}
                </span>
                <span className="text-white/30 text-xs mb-0.5">/35</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-1 mt-1">
                <div 
                  className="h-1 rounded-full bg-green-500 transition-all"
                  style={{ width: `${Math.min(((metrics.buying_signal_score || 0) / 35) * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* Engagement */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3">
              <div className="flex items-center gap-1 text-blue-400 text-xs mb-1">
                💬 Engage
              </div>
              <div className="flex items-end gap-1">
                <span className="text-2xl font-bold text-blue-400">
                  {metrics.engagement_score?.toFixed(0) || '0'}
                </span>
                <span className="text-white/30 text-xs mb-0.5">/20</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-1 mt-1">
                <div 
                  className="h-1 rounded-full bg-blue-500 transition-all"
                  style={{ width: `${((metrics.engagement_score || 0) / 20) * 100}%` }}
                />
              </div>
            </div>

            {/* Quality */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3">
              <div className="flex items-center gap-1 text-purple-400 text-xs mb-1">
                ✨ Quality
              </div>
              <div className="flex items-end gap-1">
                <span className="text-2xl font-bold text-purple-400">
                  {metrics.response_quality?.toFixed(0) || '0'}
                </span>
                <span className="text-white/30 text-xs mb-0.5">/15</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-1 mt-1">
                <div 
                  className="h-1 rounded-full bg-purple-500 transition-all"
                  style={{ width: `${((metrics.response_quality || 0) / 15) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Special Badges */}
          {((metrics.high_value_score || 0) > 0 || (metrics.decision_maker_score || 0) > 0) && (
            <div className="flex flex-wrap gap-2">
              {(metrics.high_value_score || 0) > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-full border border-yellow-500/30">
                  <span>💎</span>
                  <span className="text-yellow-300 text-xs font-medium">High-Value</span>
                </div>
              )}
              {(metrics.decision_maker_score || 0) > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-full border border-blue-500/30">
                  <span>👤</span>
                  <span className="text-blue-300 text-xs font-medium">Decision Maker</span>
                </div>
              )}
            </div>
          )}

          {/* AI Insights */}
          {factors.length > 0 && (
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
              <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
                💡 AI Insights
              </h3>
              <div className="space-y-2">
                {factors.slice(0, 4).map((factor, idx) => (
                  <div key={idx} className={`p-2 rounded-lg text-xs ${
                    factor.type === 'buying_signals' ? 'bg-green-500/10 text-green-300' :
                    factor.type === 'urgency' ? 'bg-orange-500/10 text-orange-300' :
                    factor.type === 'high_value' ? 'bg-yellow-500/10 text-yellow-300' :
                    factor.type === 'decision_maker' ? 'bg-blue-500/10 text-blue-300' :
                    factor.type === 'objections' ? 'bg-red-500/10 text-red-300' :
                    'bg-white/5 text-white/70'
                  }`}>
                    <div className="flex items-start gap-2">
                      <span>
                        {factor.type === 'buying_signals' ? '✅' :
                         factor.type === 'urgency' ? '⏰' :
                         factor.type === 'high_value' ? '💎' :
                         factor.type === 'decision_maker' ? '👤' :
                         factor.type === 'objections' ? '⚠️' :
                         factor.type === 'sentiment' ? '😊' : '💡'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{factor.label}</p>
                        {factor.evidence && (
                          <p className="text-white/40 text-[10px] mt-0.5 line-clamp-2">{factor.evidence}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Sentiment Trail */}
          {messages.filter(m => m.speaker === 'Client').length > 0 && (
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3">
              <div className="text-white/50 text-xs mb-2">Recent Client Sentiment</div>
              <div className="flex gap-1 flex-wrap">
                {messages.filter(m => m.speaker === 'Client').slice(-8).map((msg, i) => (
                  <span key={i} className={`w-6 h-6 flex items-center justify-center rounded text-xs ${
                    msg.sentiment_label === 'POSITIVE' ? 'bg-green-500/30' :
                    msg.sentiment_label === 'NEGATIVE' ? 'bg-red-500/30' :
                    'bg-white/10'
                  }`}>
                    {msg.sentiment_label === 'POSITIVE' ? '😊' : msg.sentiment_label === 'NEGATIVE' ? '😟' : '😐'}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Transcript Section */}
        <div className="lg:col-span-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/10">
            <h2 className="text-white font-semibold text-sm flex items-center gap-2">
              <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              Live Transcript
              {messages.length > 0 && (
                <span className="text-white/40 font-normal">({messages.length})</span>
              )}
            </h2>
            <div className="flex items-center gap-3">
              {isConnected && (
                <span className="flex items-center gap-1.5 text-xs text-green-400">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                  Live
                </span>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-2 min-h-0 scrollbar-thin">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-white/40">
                <svg className="w-16 h-16 mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                <p className="font-medium mb-1">Ready to record</p>
                <p className="text-sm text-white/30">Click "Start Recording" to begin live transcription</p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={msg.id || `${msg.speaker}-${idx}`}
                  className={`max-w-[80%] animate-fadeIn ${
                    msg.speaker === "Agent" ? "" : "ml-auto"
                  }`}
                >
                  <div className={`px-3 py-2 rounded-xl ${
                    msg.speaker === "Agent"
                      ? "bg-slate-700/50 rounded-tl-sm"
                      : "bg-gradient-to-r from-orange-600/70 to-red-600/70 rounded-tr-sm"
                  }`}>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-[10px] font-semibold uppercase tracking-wide ${
                        msg.speaker === "Agent" ? "text-slate-400" : "text-white/70"
                      }`}>
                        {msg.speaker}
                      </span>
                      {msg.sentiment_label && msg.speaker === 'Client' && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                          msg.sentiment_label === 'POSITIVE' 
                            ? 'bg-green-500/40 text-green-200' 
                            : msg.sentiment_label === 'NEGATIVE'
                            ? 'bg-red-500/40 text-red-200'
                            : 'bg-white/20 text-white/50'
                        }`}>
                          {msg.sentiment_label === 'POSITIVE' ? '😊 Positive' : 
                           msg.sentiment_label === 'NEGATIVE' ? '😟 Negative' : '😐 Neutral'}
                        </span>
                      )}
                    </div>
                    <p className="text-white text-sm leading-relaxed">{msg.text}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .scrollbar-thin::-webkit-scrollbar {
          width: 4px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: rgba(249, 115, 22, 0.3);
          border-radius: 10px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: rgba(249, 115, 22, 0.5);
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}
