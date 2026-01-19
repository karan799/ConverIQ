import { useRef, useState } from "react";

interface TranscriptMessage {
  speaker: string;
  text: string;
}

export default function AudioCallAnalyzer() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [score, setScore] = useState(78);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAudioFile(file);
  };

  return (
    <div className="min-h-screen bg-[#EEF6FC] text-[#1A1A1A] flex flex-col">
      {/* NAVBAR */}
      <nav className="bg-white border-b">
        <div className="px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#0F6CB6] rounded-lg text-white flex items-center justify-center font-bold">
              CI
            </div>
            <div>
              <div className="font-semibold text-[#0F6CB6]">
                Care Lead
              </div>
              <div className="text-xs text-gray-500">
                Prospect Intelligence
              </div>
            </div>
          </div>
          <button className="text-sm text-[#0F6CB6]">← Back</button>
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <div className="flex-1 p-6 grid grid-cols-12 gap-6">
        {/* LEFT: TRANSCRIPTION */}
        <div className="col-span-8 bg-white border rounded-xl p-6 flex flex-col">
          <h2 className="font-semibold text-lg mb-4">
            Call Transcription
          </h2>

          <div className="flex-1 bg-[#F8FAFC] border rounded-lg p-4 overflow-y-auto text-sm text-gray-700 leading-relaxed">
            <p className="mb-3">
              Hello, I’m calling from Care Lead Insurance regarding
              health insurance plans suitable for you.
            </p>
            <p className="mb-3">
              The client asked about hospitalization coverage,
              premium ranges, and critical illness benefits.
            </p>
            <p>
              Overall, the client showed positive intent and was
              receptive to further discussion.
            </p>
          </div>

          <div className="mt-4 text-xs text-gray-500">
            Transcription generated using speech-to-text analysis
          </div>
        </div>

        {/* RIGHT: CONTROLS + ANALYTICS */}
        <div className="col-span-4 flex flex-col gap-6">
          {/* Upload */}
          <div className="bg-white border rounded-xl p-5">
            <h3 className="font-semibold mb-3">Audio File</h3>

            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleUpload}
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full bg-[#0F6CB6] text-white py-2 rounded-lg text-sm"
            >
              Upload Audio
            </button>

            {audioFile && (
              <div className="mt-2 text-xs text-gray-500 truncate">
                {audioFile.name}
              </div>
            )}
          </div>

          {/* Playback */}
          <div className="bg-white border rounded-xl p-5">
            <h3 className="font-semibold mb-3">Playback Controls</h3>
            <div className="flex gap-3">
              <button className="flex-1 bg-[#0F6CB6] text-white py-2 rounded-lg text-sm">
                Start
              </button>
              <button className="flex-1 bg-[#FFD400] py-2 rounded-lg text-sm">
                Pause
              </button>
            </div>
          </div>

          {/* Sentiment */}
          <div className="bg-white border rounded-xl p-5">
            <h3 className="font-semibold mb-3">Sentiment Analysis</h3>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">
                Overall Sentiment
              </span>
              <span className="px-3 py-1 text-xs rounded-full bg-green-100 text-green-700">
                Positive
              </span>
            </div>
            <div className="mt-4 h-24 bg-[#EAF4FB] rounded-lg flex items-center justify-center text-xs text-gray-500">
              Sentiment Timeline
            </div>
          </div>

          {/* Conversion */}
          <div className="bg-white border rounded-xl p-5">
            <h3 className="font-semibold mb-2">
              Conversion Probability
            </h3>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-500">
                Likelihood to convert
              </span>
              <span className="font-medium text-[#0F6CB6]">
                {score}%
              </span>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-[#0F6CB6] h-3 rounded-full"
                style={{ width: `${score}%` }}
              />
            </div>

            <p className="text-xs text-gray-500 mt-2">
              High probability based on intent and engagement
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
