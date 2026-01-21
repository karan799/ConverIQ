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
    <div className="p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* LEFT PANEL */}
      <div className="lg:col-span-8 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 flex flex-col h-[calc(100vh-120px)] overflow-hidden">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-300 font-bold">
                {name?.charAt(0) || 'P'}
              </div>
              <h2 className="text-xl font-bold text-white truncate">
                {name ?? "Prospect Details"}
              </h2>
            </div>
            <p className="text-sm text-slate-400 ml-10">
              {phone ?? "Phone not available"}
            </p>
          </div>

          <button
            onClick={makeNewCall}
            className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition shadow-lg shadow-indigo-500/20 flex items-center gap-2"
          >
            <span>📞</span> Make Call
          </button>
        </div>

        {/* CALL CAROUSEL */}
        <Tab.Group>
          <Tab.List className="flex gap-2 mb-4 overflow-x-auto p-1 bg-slate-900/50 rounded-xl border border-white/5">
            {calls.map((_, idx) => (
              <Tab
                key={idx}
                className={({ selected }) =>
                  `px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap outline-none ${selected
                    ? "bg-indigo-500 text-white shadow-md"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`
                }
              >
                Call {idx + 1}
              </Tab>
            ))}
          </Tab.List>

          <Tab.Panels className="flex-1 overflow-hidden relative">
            {calls.map((call, idx) => (
              <Tab.Panel key={idx} className="h-full flex flex-col gap-4 overflow-y-auto pr-2 scrollbar-thin">
                {/* TRANSCRIPT */}
                <div className="flex-1">
                  <div className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">
                    Conversation History
                  </div>
                  <div className="bg-slate-900/30 border border-white/10 rounded-xl p-4 space-y-3">
                    {call.transcript.map((msg, i) => (
                      <div
                        key={i}
                        className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${msg.speaker === "Agent"
                            ? "bg-slate-800/80 text-slate-200 rounded-tl-sm"
                            : "bg-indigo-600/80 text-white ml-auto rounded-tr-sm"
                          }`}
                      >
                        <div className={`text-[10px] uppercase font-bold mb-1 opacity-70 ${msg.speaker === "Agent" ? "text-slate-400" : "text-indigo-200"}`}>
                          {msg.speaker}
                        </div>
                        {msg.text}
                      </div>
                    ))}
                  </div>
                </div>

                {/* SUMMARY */}
                <div className="mt-2">
                  <div className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">
                    Executive Summary
                  </div>
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-sm text-amber-200/90 leading-relaxed">
                    {call.summary}
                  </div>
                </div>
              </Tab.Panel>
            ))}
          </Tab.Panels>
        </Tab.Group>
      </div>

      {/* RIGHT PANEL */}
      <div className="lg:col-span-4 space-y-6">
        {/* SENTIMENT */}
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-white/10 rounded-2xl p-5">
          <h3 className="font-semibold text-sm mb-4 text-white flex items-center gap-2">
            <span>😊</span> Sentiment Analysis
          </h3>

          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-slate-400">
              Overall Sentiment
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Positive
            </span>
          </div>

          <div className="h-32 bg-slate-900/50 rounded-xl border border-white/5 flex items-center justify-center text-xs text-slate-500">
            [Sentiment Timeline Chart Placeholder]
          </div>
        </div>

        {/* CONVERSION */}
        <div className="bg-gradient-to-br from-indigo-900/30 to-purple-900/30 backdrop-blur-sm border border-indigo-500/20 rounded-2xl p-5">
          <h3 className="font-semibold text-sm mb-4 text-white flex items-center gap-2">
            <span>🚀</span> Conversion Probability
          </h3>

          <div className="flex items-end justify-between mb-2">
            <span className="text-sm text-slate-400">
              Likelihood
            </span>
            <span className="text-3xl font-bold text-white">
              {calls[0].conversionProb}%
            </span>
          </div>

          <div className="w-full bg-slate-800 rounded-full h-2 mb-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full"
              style={{ width: `${calls[0].conversionProb}%` }}
            />
          </div>

          <div className="text-xs text-indigo-300/80 bg-indigo-500/10 p-2 rounded-lg">
            High probability based on engagement and intent signals detected in the conversation.
          </div>
        </div>
      </div>
    </div>
  );
}
