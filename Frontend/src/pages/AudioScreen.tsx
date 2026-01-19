import { useEffect, useRef, useState } from "react";

interface TranscriptMessage {
  speaker: string;
  text: string;
}

export default function AudioCallAnalyzer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [messages, setMessages] = useState<TranscriptMessage[]>([]);
  const [score, setScore] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  /* ---------- Auto Scroll ---------- */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ---------- Audio Upload ---------- */
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAudioFile(file);
    setMessages([]);
    setScore(0);

    audioRef.current = new Audio(URL.createObjectURL(file));
  };

  const startAudio = () => {
    audioRef.current?.play();
    setIsPlaying(true);
  };

  const pauseAudio = () => {
    audioRef.current?.pause();
    setIsPlaying(false);
  };

  /* ---------- Simulated Backend Push ---------- */
  useEffect(() => {
    if (!isPlaying) return;

    const fakeStream = setInterval(() => {
      setMessages((prev) => [
        ...prev,
        {
          speaker: Math.random() > 0.5 ? "Agent" : "Client",
          text: "Live transcript coming from backend...",
        },
      ]);
      setScore((s) => Math.min(s + 5, 92));
    }, 2000);

    return () => clearInterval(fakeStream);
  }, [isPlaying]);


  return (
    <div className="min-h-screen bg-[#EAF4FB] p-6 text-[#1A1A1A]">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#0F6CB6]">
          Audio Call Analysis
        </h1>
        <p className="text-sm text-[#6B7280]">
          Upload recorded call & analyze customer intent
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: Upload & Controls */}
        <div className="lg:col-span-4 bg-white rounded-xl border p-5 space-y-4">
          <h2 className="font-semibold">Upload Call Recording</h2>

          <div
            onClick={() => fileInputRef.current?.click()}
            className="relative border-2 border-dashed border-[#0F6CB6] rounded-lg p-8 cursor-pointer transition-colors hover:bg-[#EAF4FB] hover:border-[#0D5BA0]"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleUpload}
              className="hidden"
            />
            <div className="flex flex-col items-center justify-center gap-2">
              <svg
                className="w-8 h-8 text-[#0F6CB6]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <span className="font-medium text-[#0F6CB6]">
                {audioFile ? audioFile.name : "Click to upload audio"}
              </span>
              <span className="text-xs text-[#6B7280]">
                {audioFile
                  ? `${(audioFile.size / 1024 / 1024).toFixed(2)} MB`
                  : "MP3, WAV, M4A, etc."}
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={startAudio}
              disabled={!audioFile || isPlaying}
              className="flex-1 bg-[#0F6CB6] text-white py-2 rounded-lg disabled:opacity-50"
            >
              ▶ Start
            </button>

            <button
              onClick={pauseAudio}
              disabled={!isPlaying}
              className="flex-1 bg-[#FFD400] py-2 rounded-lg disabled:opacity-50"
            >
              ⏸ Pause
            </button>
          </div>

          {/* Score */}
          <div>
            <div className="text-sm font-medium mb-1">
              Conversion Score
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-[#0F6CB6] h-3 rounded-full"
                style={{ width: `${score}%` }}
              />
            </div>
            <p className="text-xs text-[#6B7280] mt-1">
              {score}% likelihood to convert
            </p>
          </div>
        </div>

        {/* RIGHT: Transcript */}
        <div className="lg:col-span-8 bg-white rounded-xl border p-5 flex flex-col">
          <h2 className="font-semibold mb-4">Live Transcript</h2>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`max-w-[75%] px-4 py-2 rounded-lg text-sm ${
                  msg.speaker === "Agent"
                    ? "bg-[#EAF4FB]"
                    : "bg-[#0F6CB6] text-white ml-auto"
                }`}
              >
                <div className="text-xs opacity-70 mb-1">
                  {msg.speaker}
                </div>
                {msg.text}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
