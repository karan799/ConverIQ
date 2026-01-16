import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

type Message = {
  speaker: "Agent" | "Client";
  text: string;
};

const dummyTranscript: Message[] = [
  { speaker: "Agent", text: "Hello, this is Care Lead Insurance. Am I speaking with Rahul?" },
  { speaker: "Client", text: "Yes, this is Rahul." },
  { speaker: "Agent", text: "I’m calling to discuss a health insurance plan suitable for you." },
  { speaker: "Client", text: "Okay, what kind of coverage does it include?" },
  { speaker: "Agent", text: "It covers hospitalization, critical illness, and annual health checkups." },
  { speaker: "Client", text: "That sounds interesting." },
];

export default function CallScreen() {
  const navigate = useNavigate();
  const { callId } = useParams();

  const callData = JSON.parse(localStorage.getItem("currentCall") || "{}");

  const [messages, setMessages] = useState<Message[]>([]);
  const [score, setScore] = useState(0);
  const [step, setStep] = useState(0);

  // Simulate live transcript + score
  useEffect(() => {
    if (step >= dummyTranscript.length) return;

    const timer = setTimeout(() => {
      setMessages((prev) => [...prev, dummyTranscript[step]]);
      setScore((prev) => Math.min(prev + Math.floor(Math.random() * 15 + 10), 92));
      setStep(step + 1);
    }, 1500);

    return () => clearTimeout(timer);
  }, [step]);

const endCall = () => {
  navigate("/call-summary");
};


  return (
    <div className="min-h-screen bg-[#EAF4FB] text-[#1A1A1A]">
      {/* NAVBAR */}
      <nav className="sticky top-0 z-10 bg-white border-b border-[#E5E7EB]">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0F6CB6] flex items-center justify-center text-white font-bold">
              CI
            </div>
            <div>
              <div className="font-semibold text-[#0F6CB6]">Care Lead</div>
              <div className="text-xs text-[#6B7280]">Live Call Analysis</div>
            </div>
          </div>

          <div className="text-sm text-[#6B7280]">
            Call ID: {callId}
          </div>
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <div className="p-6 grid grid-cols-12 gap-6">
        {/* TRANSCRIPT */}
        <div className="col-span-8 bg-white border border-[#E5E7EB] rounded-xl p-5 flex flex-col">
          <h2 className="text-lg font-semibold mb-4">
            Client: {callData.name || "Client"}
          </h2>

          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`max-w-[75%] px-4 py-2 rounded-lg text-sm ${
                  msg.speaker === "Agent"
                    ? "bg-[#EAF4FB] self-start"
                    : "bg-[#0F6CB6] text-white self-end"
                }`}
              >
                <div className="text-xs opacity-70 mb-1">
                  {msg.speaker}
                </div>
                {msg.text}
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT ANALYTICS */}
        <div className="col-span-4 space-y-6">
          {/* Live Score */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
            <h3 className="font-semibold mb-3">Live Conversion Score</h3>
            <div className="w-full bg-[#E5E7EB] rounded-full h-3 mb-2">
              <div
                className="bg-[#0F6CB6] h-3 rounded-full transition-all"
                style={{ width: `${score}%` }}
              />
            </div>
            <div className="text-sm text-[#6B7280]">
              {score}% likelihood to convert
            </div>
          </div>

          {/* Detected Signals */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
            <h3 className="font-semibold mb-3">Detected Signals</h3>
            <ul className="space-y-2 text-sm">
              <li className="text-green-700">• Positive interest detected</li>
              <li className="text-yellow-700">• Price discussion ongoing</li>
              <li className="text-blue-700">• Coverage clarification requested</li>
            </ul>
          </div>

          {/* Call Controls */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
            <button
              onClick={endCall}
              className="w-full bg-red-500 text-white py-2 rounded hover:bg-red-600"
            >
              End Call
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
