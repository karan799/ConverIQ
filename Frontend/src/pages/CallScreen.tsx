import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import socketService from "../services/socketService";
import type { Message, PredictionUpdate, TranscriptionProgress } from "../services/socketService";
import LeadAnalysisCard from "../components/LeadAnalysisCard";

export default function CallScreen() {
  const navigate = useNavigate();
  const { callId } = useParams();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const callData = JSON.parse(localStorage.getItem("currentCall") || "{}");

  const [messages, setMessages] = useState<Message[]>([]);
  const [score, setScore] = useState(0);
  const [factors, setFactors] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>({});
  const [isConnected, setIsConnected] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [transcriptionStatus, setTranscriptionStatus] = useState<string>("");
  const [transcriptionProgress, setTranscriptionProgress] = useState<TranscriptionProgress | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasInitialized = useRef(false);

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

        socketService.startConversation(
          callId || '',
          'Agent',
          callData.name || 'Customer',
          callData.phone || ''
        );

        socketService.onNewMessage((data) => {
          setMessages((prev) => [...prev, data.message]);
        });

        socketService.onPredictionUpdate((data: PredictionUpdate) => {
          setScore(data.conversion_score);
          setFactors(data.factors);
          setMetrics(data.metrics || {});
        });

        socketService.onError((data) => {
          setUploadError(data.message);
        });

        socketService.onConversationStarted(() => {
          // Conversation started
        });

        socketService.onTranscriptionProgress((data) => {
          setTranscriptionProgress(data);
          setTranscriptionStatus(data.status);
          setIsTranscribing(true);
        });

        socketService.onTranscriptionComplete((data) => {
          setTranscriptionStatus(`Complete! ${data.messages_count} messages extracted.`);
          setIsTranscribing(false);
          setTranscriptionProgress(null);
          setTimeout(() => setTranscriptionStatus(''), 5000);
        });

        socketService.onTranscriptionError((data) => {
          setUploadError(data.error);
          setIsTranscribing(false);
          setTranscriptionProgress(null);
        });

        socketService.onTranscriptionStopped((data) => {
          setTranscriptionStatus(`Stopped. ${data.messages_count} messages extracted.`);
          setIsTranscribing(false);
          setTranscriptionProgress(null);
          setTimeout(() => setTranscriptionStatus(''), 5000);
        });

      } catch {
        setUploadError('Failed to connect to server. Please ensure the backend is running.');
      }
    };

    initSocket();

    return () => {
      if (socketService.isConnected()) {
        socketService.offAllListeners();
        socketService.disconnect();
      }
    };
  }, []);

  const handleAudioUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/x-m4a', 'audio/mp4'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|m4a|mp4)$/i)) {
      setUploadError('Please upload a valid audio file (MP3, WAV, M4A)');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setTranscriptionStatus('Uploading audio...');
    setIsTranscribing(true);
    setMessages([]);
    setScore(0);
    setFactors([]);
    setMetrics({});

    // Reset conversation on backend to ensure fresh analysis
    if (isConnected) {
      socketService.startConversation(
        callId || '',
        'Agent',
        callData.name || 'Customer',
        callData.phone || ''
      );
    }

    try {
      await socketService.uploadAudio(callId || '', file);
      setTranscriptionStatus('Transcribing... Messages will appear in real-time.');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      setUploadError(error.message || 'Failed to upload audio file');
      setTranscriptionStatus('');
      setIsTranscribing(false);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && fileInputRef.current) {
      const dt = new DataTransfer();
      dt.items.add(file);
      fileInputRef.current.files = dt.files;
      fileInputRef.current.dispatchEvent(new Event('change', { bubbles: true }));
    }
  };

  const stopTranscription = () => {
    socketService.stopTranscription(callId || '');
    setIsTranscribing(false);
    setTranscriptionProgress(null);
    setTranscriptionStatus('Transcription stopped');
    setTimeout(() => setTranscriptionStatus(''), 3000);
  };

  const endCall = () => {
    if (callId) {
      socketService.endConversation(callId);
    }
    socketService.disconnect();
    navigate("/call-summary");
  };

  const progressPercent = transcriptionProgress && transcriptionProgress.total > 0
    ? (transcriptionProgress.chunk / transcriptionProgress.total) * 100
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <nav className="bg-black/30 backdrop-blur-sm border-b border-white/10">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
              CI
            </div>
            <div>
              <div className="text-white font-semibold">ConverIQ</div>
              <div className="text-xs text-purple-300">Real-Time Transcription</div>
            </div>
          </div>
          <button
            onClick={endCall}
            className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-sm font-medium hover:bg-red-500/30 transition"
          >
            End Session
          </button>
        </div>
      </nav>

      <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-72px)] overflow-hidden">
        {/* Left Sidebar - Analytics */}
        <div className="lg:col-span-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
          {/* Upload Card */}
          <div
            className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            <h2 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Upload Audio
            </h2>

            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,.mp3,.wav,.m4a"
              onChange={handleAudioUpload}
              disabled={isUploading || isTranscribing}
              className="hidden"
              id="audio-upload"
            />

            <label
              htmlFor="audio-upload"
              className={`block w-full p-4 border-2 border-dashed rounded-lg text-center cursor-pointer transition-all ${isUploading || isTranscribing
                ? 'border-purple-500/30 bg-purple-500/5 cursor-not-allowed'
                : 'border-white/20 hover:border-purple-500/50 hover:bg-purple-500/10'
                }`}
            >
              {isUploading ? (
                <div className="space-y-2">
                  <svg className="animate-spin h-8 w-8 mx-auto text-purple-400" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <p className="text-purple-300 font-medium text-sm">Uploading...</p>
                </div>
              ) : isTranscribing ? (
                <div className="space-y-2">
                  <svg className="animate-pulse h-8 w-8 mx-auto text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                  <p className="text-green-300 font-medium text-sm">Transcribing...</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <svg className="h-8 w-8 mx-auto text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-white/60 text-sm">Drop audio or click to browse</p>
                </div>
              )}
            </label>

            {/* Progress */}
            {(isTranscribing || transcriptionStatus) && (
              <div className="mt-3 space-y-2">
                <p className="text-xs text-purple-300">{transcriptionStatus}</p>
                {isTranscribing && transcriptionProgress && transcriptionProgress.total > 0 && (
                  <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-pink-500 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                )}
                {isTranscribing && (
                  <button
                    onClick={stopTranscription}
                    className="w-full px-3 py-1.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-xs font-medium hover:bg-red-500/30 transition flex items-center justify-center gap-1"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Stop
                  </button>
                )}
              </div>
            )}

            {uploadError && (
              <p className="mt-2 text-red-400 text-xs">{uploadError}</p>
            )}
          </div>

          {/* New AI Analysis Section */}
          <LeadAnalysisCard
            score={score}
            metrics={metrics}
            factors={factors}
            messages={messages}
          />

        </div>

        {/* Transcript Section */}
        <div className="lg:col-span-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/10">
            <h2 className="text-white font-semibold text-sm flex items-center gap-2">
              <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                <svg className="w-12 h-12 mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                <p className="font-medium mb-1">No transcript yet</p>
                <p className="text-sm text-white/30">Upload an audio file to begin</p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={msg.id || `${msg.speaker}-${idx}`}
                  className={`max-w-[80%] animate-fadeIn ${msg.speaker === "Agent" ? "" : "ml-auto"
                    }`}
                >
                  <div className={`px-3 py-2 rounded-xl ${msg.speaker === "Agent"
                    ? "bg-slate-700/50 rounded-tl-sm"
                    : "bg-gradient-to-r from-purple-600/70 to-pink-600/70 rounded-tr-sm"
                    }`}>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-[10px] font-semibold uppercase tracking-wide ${msg.speaker === "Agent" ? "text-slate-400" : "text-white/70"
                        }`}>
                        {msg.speaker}
                      </span>
                      {msg.sentiment_label && msg.speaker === 'Client' && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${msg.sentiment_label === 'POSITIVE'
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
        /* Custom scrollbar */
        .scrollbar-thin::-webkit-scrollbar {
          width: 4px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: rgba(139, 92, 246, 0.3);
          border-radius: 10px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: rgba(139, 92, 246, 0.5);
        }
        /* Line clamp */
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
