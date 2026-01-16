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
    <div className="min-h-screen bg-[#EAF4FB] text-[#1A1A1A]">
      {/* NAVBAR */}
      <nav className="sticky top-0 z-10 bg-white border-b border-[#E5E7EB]">
        <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <div className="w-8 sm:w-10 h-8 sm:h-10 rounded-lg sm:rounded-xl bg-[#0F6CB6] flex items-center justify-center text-white font-bold text-xs sm:text-base flex-shrink-0">
              CI
            </div>
            <div className="hidden sm:block">
              <div className="text-sm sm:text-lg font-semibold text-[#0F6CB6]">
                ConverIQ
              </div>
              <div className="text-xs text-[#6B7280]">
                Call Wrap-up
              </div>
            </div>
          </div>

          <div className="w-6 sm:w-10" />
        </div>
      </nav>

      {/* SUMMARY CARD */}
      <div className="flex justify-center items-center min-h-[calc(100vh-70px)] sm:min-h-[calc(100vh-80px)] px-3 sm:px-4 py-6">
        <div className="bg-white border border-[#E5E7EB] rounded-lg sm:rounded-xl p-4 sm:p-8 w-full max-w-sm">
          <h2 className="text-base sm:text-lg font-semibold text-center mb-4 sm:mb-6">
            Call Summary
          </h2>

          <div className="space-y-3 sm:space-y-5">
            {/* Converted */}
            <select
              className="w-full px-3 sm:px-4 py-2 border border-[#E5E7EB] rounded text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#0F6CB6] focus:border-transparent"
              value={converted}
              onChange={(e) => setConverted(e.target.value)}
            >
              <option value="">Was Prospect Converted?</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>

            {/* Follow Up */}
            <select
              className="w-full px-3 sm:px-4 py-2 border border-[#E5E7EB] rounded text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#0F6CB6] focus:border-transparent"
              value={followUp}
              onChange={(e) => setFollowUp(e.target.value)}
            >
              <option value="">Follow up with Client?</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>

            {/* Rating */}
            <div>
              <div className="text-xs sm:text-sm text-[#6B7280] mb-2">
                Rate the call
              </div>
              <div className="flex gap-1 sm:gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className={`text-xl sm:text-2xl transition ${
                      star <= rating
                        ? "text-[#FFD400]"
                        : "text-[#E5E7EB]"
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
              className="w-full bg-[#0F6CB6] text-white py-2 rounded text-sm sm:text-base font-medium hover:bg-[#0B4F8A] transition"
            >
              Submit Summary
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
