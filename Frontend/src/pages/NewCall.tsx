import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function NewCall() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const makeCall = () => {
    if (!name || !phone) return;

    const callId = Date.now().toString();

    localStorage.setItem(
      "currentCall",
      JSON.stringify({ name, phone, callId })
    );

    navigate(`/call/${callId}`);
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-80px)] px-4">
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 w-full max-w-md shadow-2xl relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/25">
              <span className="text-3xl">📞</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Start New Call
            </h2>
            <p className="text-slate-400 text-sm">
              Enter client details to begin analysis
            </p>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 ml-1">CLIENT NAME</label>
              <input
                placeholder="e.g. Aditi Sharma"
                className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 ml-1">PHONE NUMBER</label>
              <input
                placeholder="+91 98765 43210"
                className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <button
              onClick={makeCall}
              disabled={!name || !phone}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold py-3.5 rounded-xl transition shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
            >
              Initiate Call
            </button>

            <button
              onClick={() => navigate("/")}
              className="w-full text-sm text-slate-400 hover:text-white transition py-2"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
