import { Menu } from "@headlessui/react";
import { useNavigate } from "react-router-dom";

type Lead = {
  name: string;
  conversion: number;
  contact: string;
  intent: "High" | "Medium" | "Low";
};

const leads: Lead[] = [
  {
    name: "Rahul Sharma",
    conversion: 82,
    contact: "9876543210",
    intent: "High",
  },
  {
    name: "Anita Verma",
    conversion: 76,
    contact: "9123456780",
    intent: "High",
  },
  {
    name: "Kunal Mehta",
    conversion: 71,
    contact: "9988776655",
    intent: "Medium",
  },
  {
    name: "Pooja Singh",
    conversion: 68,
    contact: "9090909090",
    intent: "Medium",
  },
  {
    name: "Aman Gupta",
    conversion: 64,
    contact: "9812345678",
    intent: "Medium",
  },
  { name: "Neha Kapoor", conversion: 61, contact: "9823456789", intent: "Low" },
  {
    name: "Rohit Malhotra",
    conversion: 59,
    contact: "9898989898",
    intent: "Low",
  },
  { name: "Sneha Iyer", conversion: 73, contact: "9001122334", intent: "High" },
  {
    name: "Vikas Jain",
    conversion: 66,
    contact: "9112233445",
    intent: "Medium",
  },
  {
    name: "Shreya Nair",
    conversion: 78,
    contact: "9334455667",
    intent: "High",
  },
  { name: "Arjun Patel", conversion: 55, contact: "9445566778", intent: "Low" },
  {
    name: "Kriti Saxena",
    conversion: 69,
    contact: "9556677889",
    intent: "Medium",
  },
];

export default function Home() {
  const navigate = useNavigate();

  const startCallFromTable = (lead: Lead) => {
    const callId = Date.now().toString();

    localStorage.setItem(
      "currentCall",
      JSON.stringify({
        callId,
        name: lead.name,
        phone: lead.contact,
      })
    );

    navigate(`/call/${callId}`);
  };

  const goToProspectDetails = (lead: Lead) => {
    navigate(`/prospect/${encodeURIComponent(lead.name)}`, {
      state: {
        name: lead.name,
        phone: lead.contact,
      },
    });
  };

  return (
    <div className="min-h-screen bg-[#EAF4FB] text-[#1A1A1A]">
      {/* NAVBAR */}
      <nav className="sticky top-0 z-10 bg-white border-b border-[#E5E7EB]">
        <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <div className="w-8 sm:w-10 h-8 sm:h-10 rounded-lg sm:rounded-xl bg-[#0F6CB6] flex items-center justify-center text-white font-bold text-xs sm:text-base flex-shrink-0">
              CI
            </div>
            <div>
              <div className="text-sm sm:text-lg font-semibold text-[#0F6CB6]">
                ConverIQ
              </div>
              <div className="text-xs text-[#6B7280] hidden sm:block">
                Lead Intelligence Dashboard
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <input
              className="px-2 sm:px-4 py-2 border border-[#E5E7EB] rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#0F6CB6] w-full sm:w-auto"
              placeholder="Search leads..."
            />

            <Menu as="div" className="relative w-full sm:w-auto">
              <Menu.Button className="flex items-center gap-2 px-2 sm:px-4 py-2 border border-[#E5E7EB] rounded-lg text-xs sm:text-sm w-full sm:w-auto justify-center sm:justify-start">
                <div className="w-6 sm:w-8 h-6 sm:h-8 bg-[#E5E7EB] rounded-full" />
                <span className="hidden sm:inline">Agent</span>
              </Menu.Button>

              <Menu.Items className="absolute right-0 mt-2 w-40 bg-white border border-[#E5E7EB] rounded-lg shadow z-50">
                <Menu.Item>
                  {({ active }) => (
                    <button
                      className={`w-full text-left px-4 py-2 text-sm ${
                        active ? "bg-[#EAF4FB]" : ""
                      }`}
                    >
                      Profile
                    </button>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <button
                      className={`w-full text-left px-4 py-2 text-sm ${
                        active ? "bg-[#EAF4FB]" : ""
                      }`}
                    >
                      Logout
                    </button>
                  )}
                </Menu.Item>
              </Menu.Items>
            </Menu>
          </div>
        </div>
      </nav>

      {/* DASHBOARD */}
      <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
        {/* TOP ANALYTICS */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-6">
          <StatCard title="Total Leads" value="32" />
          <StatCard title="High Intent Leads" value="14" />
          <StatCard title="Avg Conversion %" value="56%" />
          <StatCard title="Calls Analyzed Today" value="9" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
          {/* LEADS TABLE */}
          <div className="lg:col-span-8 bg-white border border-[#E5E7EB] rounded-lg sm:rounded-xl p-3 sm:p-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4 mb-4">
              <h2 className="text-base sm:text-lg font-semibold">
                Top Prospects
              </h2>
              <button
                onClick={() => navigate("/new-call")}
                className="bg-[#0F6CB6] text-white px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-base hover:bg-[#0B4F8A] transition whitespace-nowrap w-full sm:w-auto"
              >
                + New Call
              </button>
            </div>

            {/* Table Header - Hidden on mobile */}
            <div className="hidden md:grid md:grid-cols-5 text-xs sm:text-sm text-[#6B7280] border-b border-[#E5E7EB] pb-2">
              <span>Name</span>
              <span>Conversion</span>
              <span>Intent</span>
              <span>Contact</span>
              <span></span>
            </div>

            {/* Table Rows */}
            <div className="space-y-2 md:space-y-0">
              {leads.map((lead, i) => (
                <div
                  key={i}
                  onClick={() => goToProspectDetails(lead)}
                  className="block md:grid md:grid-cols-5 md:items-center py-3 md:py-3 px-3 md:px-0 border-b border-[#E5E7EB] last:border-none cursor-pointer hover:bg-[#EAF4FB] transition rounded md:rounded-none bg-gray-50 md:bg-white"
                >
                  {/* Mobile Layout - Two Balanced Sections */}
                  <div className="md:hidden flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-4">
                      {/* LEFT SECTION - Name & Contact */}
                      <div className="space-y-2.5">
                        <div>
                          <div className="text-xs font-bold text-[#0F6CB6] mb-0.5">
                            Name
                          </div>
                          <span className="text-sm font-semibold text-[#1A1A1A] block truncate">
                            {lead.name}
                          </span>
                        </div>

                        <div>
                          <div className="text-xs font-bold text-[#0F6CB6] mb-0.5">
                            Phone
                          </div>
                          <span className="text-xs text-[#6B7280]">{lead.contact}</span>
                        </div>
                      </div>

                      {/* RIGHT SECTION - Conversion & Intent */}
                      <div className="space-y-2.5">
                        <div>
                          <div className="text-xs font-bold text-[#0F6CB6] mb-0.5">
                            Conv %
                          </div>
                          <span className="text-sm font-bold text-[#0F6CB6]">
                            {lead.conversion}%
                          </span>
                        </div>

                        <div>
                          <div className="text-xs font-bold text-[#0F6CB6] mb-0.5">
                            Intent
                          </div>
                          <IntentBadge intent={lead.intent} />
                        </div>
                      </div>
                    </div>

                    {/* BUTTON - Full Width Below */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startCallFromTable(lead);
                      }}
                      className="bg-[#FFD400] hover:bg-[#FFC700] px-3 py-2 rounded text-xs font-semibold transition shadow-sm hover:shadow-md w-full"
                    >
                      Call
                    </button>
                  </div>

                  {/* Desktop Layout - Table Cells */}
                  <span className="hidden md:block text-sm font-medium">{lead.name}</span>
                  <span className="hidden md:block font-medium text-[#0F6CB6] text-sm">
                    {lead.conversion}%
                  </span>
                  <span className="hidden md:block">
                    <IntentBadge intent={lead.intent} />
                  </span>
                  <span className="hidden md:block text-xs">{lead.contact}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startCallFromTable(lead);
                    }}
                    className="hidden md:block bg-[#FFD400] px-2 sm:px-3 py-1 rounded text-2xl sm:text-sm hover:opacity-90 transition md:justify-self-end"
                  >
                    Call
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT ANALYTICS */}
          <div className="lg:col-span-4 space-y-4 sm:space-y-6">
            <ProgressCard />
            <RecentInsights />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Components ---------------- */

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-lg sm:rounded-xl p-3 sm:p-4">
      <div className="text-xs sm:text-sm text-[#6B7280]">{title}</div>
      <div className="text-xl sm:text-2xl font-semibold text-[#0F6CB6]">
        {value}
      </div>
    </div>
  );
}

function IntentBadge({ intent }: { intent: Lead["intent"] }) {
  const color =
    intent === "High"
      ? "bg-green-100 text-green-700"
      : intent === "Medium"
      ? "bg-yellow-100 text-yellow-700"
      : "bg-red-100 text-red-700";

  return (
    <span className={`px-2 py-1 text-xs rounded-full w-fit ${color}`}>
      {intent}
    </span>
  );
}

function ProgressCard() {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-lg sm:rounded-xl p-4 sm:p-5">
      <h3 className="font-semibold text-sm sm:text-base mb-4">
        Agent Conversion Score
      </h3>
      <div className="w-full bg-[#E5E7EB] rounded-full h-3 mb-2">
        <div className="bg-[#0F6CB6] h-3 rounded-full w-[56%]" />
      </div>
      <div className="text-xs sm:text-sm text-[#6B7280]">
        56% likelihood across recent calls
      </div>
    </div>
  );
}

function RecentInsights() {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-lg sm:rounded-xl p-4 sm:p-5">
      <h3 className="font-semibold text-sm sm:text-base mb-3">
        Recent Insights
      </h3>
      <ul className="space-y-2 text-xs sm:text-sm">
        <li>• Customer asked about premium flexibility</li>
        <li>• Strong intent detected after benefits explanation</li>
        <li>• Objection: policy tenure duration</li>
      </ul>
    </div>
  );
}
