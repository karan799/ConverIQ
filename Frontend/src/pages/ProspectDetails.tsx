import { Tab } from "@headlessui/react";
import { useNavigate, useLocation } from "react-router-dom";

type Message = {
  speaker: "Agent" | "Client";
  text: string;
};

type Call = {
  id: string;
  transcript: Message[];
  summary: string;
  sentiment: "Positive" | "Neutral" | "Negative";
  conversionProb: number;
};

const calls: Call[] = [
  {
    id: "call-1",
    transcript: [
      { speaker: "Agent", text: "Hello, I’m calling from Care Lead Insurance." },
      { speaker: "Client", text: "Yes, I was expecting your call." },
      { speaker: "Agent", text: "We have a health plan that fits your needs." },
      { speaker: "Client", text: "Sounds good, tell me more." },
    ],
    summary:
      "Client showed strong interest in health insurance. Asked about coverage and benefits.",
    sentiment: "Positive",
    conversionProb: 78,
  },
  {
    id: "call-2",
    transcript: [
      { speaker: "Agent", text: "Following up on our last discussion." },
      { speaker: "Client", text: "I’m still comparing options." },
      { speaker: "Agent", text: "We offer flexible premium plans." },
    ],
    summary:
      "Client interested but hesitant. Needs follow-up after comparing alternatives.",
    sentiment: "Neutral",
    conversionProb: 62,
  },
];

export default function ProspectDetails() {
  const navigate = useNavigate();
  const location = useLocation();

  const { name, phone } = (location.state || {}) as {
    name?: string;
    phone?: string;
  };

  const makeNewCall = () => {
    if (!name || !phone) return;

    const callId = Date.now().toString();

    localStorage.setItem(
      "currentCall",
      JSON.stringify({ callId, name, phone })
    );

    navigate(`/call/${callId}`);
  };

  return (
    <div className="min-h-screen bg-[#EAF4FB] text-[#1A1A1A]">
      {/* NAVBAR */}
      <nav className="sticky top-0 z-10 bg-white border-b border-[#E5E7EB]">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#0F6CB6] flex items-center justify-center text-white font-bold">
              CI
            </div>
            <div>
              <div className="text-lg font-semibold text-[#0F6CB6]">
                Care Lead
              </div>
              <div className="text-xs text-[#6B7280]">
                Prospect Intelligence
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate("/")}
            className="text-sm text-[#0F6CB6] hover:underline"
          >
            ← Back to Dashboard
          </button>
        </div>
      </nav>

      {/* CONTENT */}
      <div className="p-6 grid grid-cols-12 gap-6">
        {/* LEFT PANEL */}
        <div className="col-span-8 bg-white border border-[#E5E7EB] rounded-xl p-5">
          {/* HEADER */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold">
                {name ?? "Prospect"}
              </h2>
              <p className="text-sm text-[#6B7280]">
                {phone ?? "Phone not available"}
              </p>
            </div>

            <button
              onClick={makeNewCall}
              className="bg-[#0F6CB6] text-white px-4 py-2 rounded-lg hover:bg-[#0B4F8A]"
            >
              + Make Call
            </button>
          </div>

          {/* CALL CAROUSEL */}
          <Tab.Group>
            <Tab.List className="flex gap-2 mb-4">
              {calls.map((_, idx) => (
                <Tab
                  key={idx}
                  className={({ selected }) =>
                    `px-4 py-2 rounded text-sm font-medium transition ${
                      selected
                        ? "bg-[#0F6CB6] text-white"
                        : "bg-[#EAF4FB] hover:bg-[#FFD400]/30"
                    }`
                  }
                >
                  Call {idx + 1}
                </Tab>
              ))}
            </Tab.List>

            <Tab.Panels>
              {calls.map((call, idx) => (
                <Tab.Panel key={idx} className="space-y-6">
                  {/* TRANSCRIPT */}
                  <div>
                    <div className="text-sm text-[#6B7280] mb-2">
                      Dialogues
                    </div>
                    <div className="border border-[#E5E7EB] rounded-lg p-4 space-y-3 max-h-64 overflow-y-auto">
                      {call.transcript.map((msg, i) => (
                        <div
                          key={i}
                          className={`max-w-[75%] px-3 py-2 rounded text-sm ${
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
                    </div>
                  </div>

                  {/* SUMMARY */}
                  <div>
                    <div className="text-sm text-[#6B7280] mb-2">
                      Call Summary
                    </div>
                    <div className="border border-[#E5E7EB] rounded-lg p-4 text-sm bg-[#FFD400]/10">
                      {call.summary}
                    </div>
                  </div>

                  <div className="text-center text-sm text-[#6B7280]">
                    {idx + 1} of {calls.length}
                  </div>
                </Tab.Panel>
              ))}
            </Tab.Panels>
          </Tab.Group>
        </div>

        {/* RIGHT PANEL */}
        <div className="col-span-4 space-y-6">
          {/* SENTIMENT */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
            <h3 className="font-semibold mb-3">Sentiment Analysis</h3>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#6B7280]">
                Overall Sentiment
              </span>
              <span className="px-3 py-1 rounded-full text-xs bg-green-100 text-green-700">
                Positive
              </span>
            </div>
            <div className="h-32 bg-[#EAF4FB] rounded flex items-center justify-center text-[#6B7280]">
              Sentiment Timeline
            </div>
          </div>

          {/* CONVERSION */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
            <h3 className="font-semibold mb-3">
              Conversion Probability
            </h3>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#6B7280]">
                Likelihood to convert
              </span>
              <span className="text-sm font-semibold text-[#0F6CB6]">
                {calls[0].conversionProb}%
              </span>
            </div>
            <div className="w-full bg-[#E5E7EB] rounded-full h-3 mb-3">
              <div
                className="bg-gradient-to-r from-[#FFD400] to-[#0F6CB6] h-3 rounded-full"
                style={{ width: `${calls[0].conversionProb}%` }}
              />
            </div>
            <div className="text-xs text-[#6B7280]">
              High probability based on engagement and intent signals
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
