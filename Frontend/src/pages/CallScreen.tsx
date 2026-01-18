import { useEffect, useState, useRef } from "react";
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const callData = JSON.parse(localStorage.getItem("currentCall") || "{}");

  const [messages, setMessages] = useState<Message[]>([]);
  const [score, setScore] = useState(0);
  const [step, setStep] = useState(0);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
          <h2 className="text-sm sm:text-lg font-semibold mb-4 shrink-0">
            Client: {callData.name || "Client"}
          </h2>

          <div className="flex-1 overflow-y-auto space-y-3 sm:space-y-4 pr-2 min-h-0">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`max-w-[90%] sm:max-w-[75%] px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm ${
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
            <h3 className="font-semibold text-sm sm:text-base mb-3">Detected Signals</h3>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li className="text-green-700">• Positive interest detected</li>
              <li className="text-yellow-700">• Price discussion ongoing</li>
              <li className="text-blue-700">• Coverage clarification requested</li>
            </ul>
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
