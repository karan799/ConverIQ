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
                ConverIQ
              </div>
              <div className="text-xs text-[#6B7280]">
                Lead Intelligence
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

      {/* FORM */}
      <div className="flex items-center justify-center h-[calc(100vh-80px)]">
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-8 w-full max-w-md">
          <h2 className="text-lg font-semibold text-center mb-6">
            Client Details
          </h2>

          <div className="space-y-4">
            <input
              placeholder="Name"
              className="w-full px-4 py-2 border border-[#E5E7EB] rounded focus:outline-none"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <input
              placeholder="Phone Number"
              className="w-full px-4 py-2 border border-[#E5E7EB] rounded focus:outline-none"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />

            <button
              onClick={makeCall}
              className="w-full bg-[#0F6CB6] text-white py-2 rounded hover:bg-[#0B4F8A]"
            >
              Make Call
            </button>

            <button
              onClick={() => navigate("/")}
              className="w-full text-sm text-[#6B7280]"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
