import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function CallSummary() {
  const navigate = useNavigate();

  const [converted, setConverted] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [rating, setRating] = useState(0);

  const submitSummary = () => {
    const summary = {
      converted,
      followUp,
      rating,
      timestamp: new Date().toISOString(),
    };

    const prev = JSON.parse(localStorage.getItem("callSummaries") || "[]");
    localStorage.setItem("callSummaries", JSON.stringify([...prev, summary]));

    localStorage.removeItem("currentCall");
    navigate("/");
  };

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-80px)] px-4">
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 w-full max-w-md shadow-2xl relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute top-0 left-0 -mt-10 -ml-10 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 -mb-10 -mr-10 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/25">
              <span className="text-3xl">📋</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Call Summary
            </h2>
            <p className="text-slate-400 text-sm">
              Wrap up the conversation details
            </p>
          </div>

          <div className="space-y-6">
            {/* Converted */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Was Prospect Converted?</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setConverted("yes")}
                  className={`py-3 rounded-xl border transition text-sm font-medium ${converted === "yes"
                      ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
                      : "bg-slate-900/50 border-white/10 text-slate-400 hover:bg-white/5"
                    }`}
                >
                  ✅ Yes
                </button>
                <button
                  onClick={() => setConverted("no")}
                  className={`py-3 rounded-xl border transition text-sm font-medium ${converted === "no"
                      ? "bg-red-500/20 border-red-500/50 text-red-300"
                      : "bg-slate-900/50 border-white/10 text-slate-400 hover:bg-white/5"
                    }`}
                >
                  ❌ No
                </button>
              </div>
            </div>

            {/* Follow Up */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Follow up Required?</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setFollowUp("yes")}
                  className={`py-3 rounded-xl border transition text-sm font-medium ${followUp === "yes"
                      ? "bg-blue-500/20 border-blue-500/50 text-blue-300"
                      : "bg-slate-900/50 border-white/10 text-slate-400 hover:bg-white/5"
                    }`}
                >
                  📅 Yes
                </button>
                <button
                  onClick={() => setFollowUp("no")}
                  className={`py-3 rounded-xl border transition text-sm font-medium ${followUp === "no"
                      ? "bg-slate-500/20 border-slate-500/50 text-slate-300"
                      : "bg-slate-900/50 border-white/10 text-slate-400 hover:bg-white/5"
                    }`}
                >
                  No
                </button>
              </div>
            </div>

            {/* Rating */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Rate the Call</label>
              <div className="flex justify-between bg-slate-900/50 border border-white/10 rounded-xl p-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className={`text-2xl transition hover:scale-110 active:scale-95 ${star <= rating
                        ? "text-amber-400 drop-shadow-lg"
                        : "text-slate-700"
                      }`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={submitSummary}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold py-3.5 rounded-xl transition shadow-lg shadow-indigo-500/20 mt-2"
            >
              Submit Summary
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
