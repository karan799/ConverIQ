import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import socketService from "../services/socketService";
import type { Message, PredictionUpdate } from "../services/socketService";

export default function CallScreen() {
  const navigate = useNavigate();
  const { callId } = useParams();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const callData = JSON.parse(localStorage.getItem("currentCall") || "{}");

  const [messages, setMessages] = useState<Message[]>([]);
  const [score, setScore] = useState(0);
  const [factors, setFactors] = useState<any[]>([]);
  const [expandedFactors, setExpandedFactors] = useState<Set<number>>(new Set());
  const [isConnected, setIsConnected] = useState(false);
  const [agentInput, setAgentInput] = useState("");
  const [clientInput, setClientInput] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [transcriptionStatus, setTranscriptionStatus] = useState<string>("");
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
    // Prevent multiple initializations
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const initSocket = async () => {
      try {
        await socketService.connect();
        setIsConnected(true);

        // Start conversation
        socketService.startConversation(
          callId || '',
          'Agent',
          callData.name || 'Customer',
          callData.phone || ''
        );

        // Listen for new messages
        socketService.onNewMessage((data) => {
          setMessages((prev) => [...prev, data.message]);
        });

        // Listen for prediction updates
        socketService.onPredictionUpdate((data: PredictionUpdate) => {
          setScore(data.conversion_score);
          setFactors(data.factors);
        });

        // Listen for errors
        socketService.onError((data) => {
          console.error('Socket error:', data.message);
          alert(data.message);
        });

        socketService.onConversationStarted((data) => {
          console.log('Conversation started:', data);
        });

      } catch (error) {
        console.error('Failed to connect:', error);
        alert('Failed to connect to server. Please ensure the backend is running.');
      }
    };

    initSocket();

    // Cleanup on unmount - only disconnect if component is actually unmounting
    return () => {
      // Only cleanup if the connection was actually established
      if (socketService.isConnected()) {
        socketService.offAllListeners();
        socketService.disconnect();
      }
    };
  }, []);

  const sendAgentMessage = () => {
    if (!agentInput.trim()) return;
    socketService.sendMessage(callId || '', 'Agent', agentInput);
    setAgentInput("");
  };

  const sendClientMessage = () => {
    if (!clientInput.trim()) return;
    socketService.sendMessage(callId || '', 'Client', clientInput);
    setClientInput("");
  };

  const handleAudioUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/x-m4a', 'audio/mp4'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|m4a|mp4)$/i)) {
      setUploadError('Please upload a valid audio file (MP3, WAV, M4A)');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setTranscriptionStatus('Uploading and processing audio...');

    try {
      const result = await socketService.uploadAudio(callId || '', file);
      console.log(`Audio processed: ${result.messages_processed} messages extracted`);
      setTranscriptionStatus(`✓ Transcribed ${result.messages_processed} messages`);
      
      // Clear status after 3 seconds
      setTimeout(() => setTranscriptionStatus(''), 3000);
      
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error('Audio upload failed:', error);
      setUploadError(error.message || 'Failed to process audio file');
      setTranscriptionStatus('');
    } finally {
      setIsUploading(false);
    }
  };

const endCall = () => {
  if (callId) {
    socketService.endConversation(callId);
  }
  socketService.disconnect();
  navigate("/call-summary");
};


  return (
    <div className="min-h-screen bg-[#EAF4FB] text-[#1A1A1A]">
      {/* NAVBAR */}
      <nav className="sticky top-0 z-10 bg-white border-b border-[#E5E7EB]">
        <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 sm:w-10 h-8 sm:h-10 rounded-lg sm:rounded-xl bg-[#0F6CB6] flex items-center justify-center text-white font-bold text-xs sm:text-base flex-shrink-0">
              CI
            </div>
            <div className="hidden sm:block">
              <div className="text-sm sm:text-base font-semibold text-[#0F6CB6]">Care Lead</div>
              <div className="text-xs text-[#6B7280]">Live Call Analysis</div>
            </div>
          </div>

          <div className="text-xs sm:text-sm text-[#6B7280] truncate">
            Call ID: {callId}
          </div>
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <div className="p-3 sm:p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 h-[calc(100vh-70px)] sm:h-[calc(100vh-80px)]">
        {/* TRANSCRIPT */}
        <div className="lg:col-span-8 bg-white border border-[#E5E7EB] rounded-lg sm:rounded-xl p-3 sm:p-5 flex flex-col overflow-hidden">
          <h2 className="text-sm sm:text-lg font-semibold mb-4 flex-shrink-0">
            Client: {callData.name || "Client"}
          </h2>

          <div className="flex-1 overflow-y-auto space-y-3 sm:space-y-4 pr-2 min-h-0">
            {!isConnected && (
              <div className="text-center text-sm text-gray-500 py-4">
                Connecting to server...
              </div>
            )}
            {messages.map((msg, idx) => (
              <div
                key={msg.id || `${msg.speaker}-${msg.timestamp || Date.now()}-${idx}`}
                className={`max-w-[90%] sm:max-w-[75%] px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm ${
                  msg.speaker === "Agent"
                    ? "bg-[#EAF4FB]"
                    : "bg-[#0F6CB6] text-white ml-auto"
                }`}
              >
                <div className="text-xs opacity-70 mb-1">
                  {msg.speaker}
                  {msg.sentiment_label && (
                    <span className={`ml-2 px-1 rounded ${
                      msg.sentiment_label === 'POSITIVE' ? 'bg-green-200' : 'bg-red-200'
                    }`}>
                      {msg.sentiment_label}
                    </span>
                  )}
                </div>
                {msg.text}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Message Input Area */}
          <div className="mt-4 space-y-2 flex-shrink-0">
            {/* Audio Upload Section */}
            <div className="border-t pt-3 pb-2">
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*,.mp3,.wav,.m4a"
                  onChange={handleAudioUpload}
                  disabled={isUploading}
                  className="hidden"
                  id="audio-upload"
                />
                <label
                  htmlFor="audio-upload"
                  className={`flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded text-sm font-medium text-center cursor-pointer hover:from-purple-600 hover:to-purple-700 transition ${
                    isUploading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isUploading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Processing Audio...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      Upload Audio Recording
                    </span>
                  )}
                </label>
              </div>
              {uploadError && (
                <p className="text-red-500 text-xs mt-1">{uploadError}</p>
              )}
              {transcriptionStatus && (
                <p className="text-blue-600 text-xs mt-1 font-medium">{transcriptionStatus}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">Upload an audio file to automatically transcribe and analyze the conversation. Messages will appear as they're transcribed.</p>
            </div>

            <div className="border-t pt-2">
              <p className="text-xs text-gray-500 mb-2">Or type messages manually:</p>
            </div>
            
            <div className="flex gap-2">
              <input
                type="text"
                value={agentInput}
                onChange={(e) => setAgentInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendAgentMessage()}
                placeholder="Agent message..."
                className="flex-1 px-3 py-2 border rounded text-sm"
              />
              <button
                onClick={sendAgentMessage}
                className="px-4 py-2 bg-[#EAF4FB] text-[#0F6CB6] rounded text-sm font-medium hover:bg-[#0F6CB6] hover:text-white transition"
              >
                Send as Agent
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={clientInput}
                onChange={(e) => setClientInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendClientMessage()}
                placeholder="Client message..."
                className="flex-1 px-3 py-2 border rounded text-sm"
              />
              <button
                onClick={sendClientMessage}
                className="px-4 py-2 bg-[#0F6CB6] text-white rounded text-sm font-medium hover:bg-[#0B4F8A] transition"
              >
                Send as Client
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT ANALYTICS */}
        <div className="lg:col-span-4 space-y-3 sm:space-y-6">
          {/* Live Score */}
          <div className="bg-white border border-[#E5E7EB] rounded-lg sm:rounded-xl p-3 sm:p-5">
            <h3 className="font-semibold text-sm sm:text-base mb-3">Live Conversion Score</h3>
            <div className="w-full bg-[#E5E7EB] rounded-full h-3 mb-2">
              <div
                className="bg-[#0F6CB6] h-3 rounded-full transition-all"
                style={{ width: `${score}%` }}
              />
            </div>
            <div className="text-xs sm:text-sm text-[#6B7280]">
              {score}% likelihood to convert
            </div>
          </div>

          {/* Detected Signals */}
          <div className="bg-white border border-[#E5E7EB] rounded-lg sm:rounded-xl p-3 sm:p-5">
            <h3 className="font-semibold text-sm sm:text-base mb-3">AI Insights</h3>
            {factors.length > 0 ? (
              <div className="space-y-2">
                {factors.map((factor, idx) => {
                  const isExpanded = expandedFactors.has(idx);
                  const factorLabel = typeof factor === 'string' ? factor : factor.label;
                  const hasEvidence = typeof factor === 'object' && factor.evidence;
                  
                  return (
                    <div key={idx} className="border border-[#E5E7EB] rounded-lg overflow-hidden">
                      <button
                        onClick={() => {
                          const newExpanded = new Set(expandedFactors);
                          if (isExpanded) {
                            newExpanded.delete(idx);
                          } else {
                            newExpanded.add(idx);
                          }
                          setExpandedFactors(newExpanded);
                        }}
                        className="w-full px-3 py-2 text-left flex items-center justify-between hover:bg-gray-50 transition"
                      >
                        <span className="text-xs sm:text-sm text-blue-700 flex items-center gap-2">
                          <span className="text-blue-500">•</span>
                          {factorLabel}
                        </span>
                        {hasEvidence && (
                          <svg
                            className={`w-4 h-4 text-gray-500 transition-transform ${
                              isExpanded ? 'rotate-180' : ''
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        )}
                      </button>
                      {isExpanded && hasEvidence && (
                        <div className="px-3 py-2 bg-gray-50 border-t border-[#E5E7EB]">
                          <p className="text-xs text-gray-700 mb-2">
                            <span className="font-semibold">Evidence:</span> {factor.evidence}
                          </p>
                          {factor.keywords && factor.keywords.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {factor.keywords.map((keyword: string, kidx: number) => (
                                <span
                                  key={kidx}
                                  className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs"
                                >
                                  {keyword}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs sm:text-sm text-gray-500">Analyzing conversation...</p>
            )}
          </div>

          {/* Call Controls */}
          <div className="bg-white border border-[#E5E7EB] rounded-lg sm:rounded-xl p-3 sm:p-5">
            <button
              onClick={endCall}
              className="w-full bg-red-500 text-white py-2 rounded text-sm font-medium hover:bg-red-600 transition"
            >
              End Call
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
