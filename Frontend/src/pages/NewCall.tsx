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
        <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <div className="w-8 sm:w-10 h-8 sm:h-10 rounded-lg sm:rounded-xl bg-[#0F6CB6] flex items-center justify-center text-white font-bold text-xs sm:text-base flex-shrink-0">
              CI
            </div>
            <div className="hidden sm:block">
              <div className="text-sm sm:text-lg font-semibold text-[#0F6CB6]">
                ConverIQ
              </div>
              <div className="text-xs text-[#6B7280]">
                Lead Intelligence
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate("/")}
            className="text-xs sm:text-sm text-[#0F6CB6] hover:underline whitespace-nowrap"
          >
            ← Back
          </button>
        </div>
      </nav>

      {/* FORM */}
      <div className="flex items-center justify-center min-h-[calc(100vh-70px)] sm:min-h-[calc(100vh-80px)] px-3 sm:px-4 py-6">
        <div className="bg-white border border-[#E5E7EB] rounded-lg sm:rounded-xl p-4 sm:p-8 w-full max-w-sm">
          <h2 className="text-base sm:text-lg font-semibold text-center mb-4 sm:mb-6">
            Client Details
          </h2>

          <div className="space-y-3 sm:space-y-4">
            <input
              placeholder="Name"
              className="w-full px-3 sm:px-4 py-2 border border-[#E5E7EB] rounded text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#0F6CB6] focus:border-transparent"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <input
              placeholder="Phone Number"
              className="w-full px-3 sm:px-4 py-2 border border-[#E5E7EB] rounded text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#0F6CB6] focus:border-transparent"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />

            <button
              onClick={makeCall}
              className="w-full bg-[#0F6CB6] text-white py-2 rounded text-sm sm:text-base font-medium hover:bg-[#0B4F8A] transition"
            >
              Make Call
            </button>

            <button
              onClick={() => navigate("/")}
              className="w-full text-xs sm:text-sm text-[#6B7280] hover:text-[#1A1A1A] transition"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
