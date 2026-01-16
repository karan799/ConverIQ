import { Menu } from "@headlessui/react";

type Lead = {
  name: string;
  conversion: number;
  contact: string;
  intent: "High" | "Medium" | "Low";
};

const leads: Lead[] = [
  { name: "Rahul Sharma", conversion: 82, contact: "9876543210", intent: "High" },
  { name: "Anita Verma", conversion: 76, contact: "9123456780", intent: "High" },
  { name: "Kunal Mehta", conversion: 71, contact: "9988776655", intent: "Medium" },
  { name: "Pooja Singh", conversion: 68, contact: "9090909090", intent: "Medium" },
  { name: "Aman Gupta", conversion: 64, contact: "9812345678", intent: "Medium" },
  { name: "Neha Kapoor", conversion: 61, contact: "9823456789", intent: "Low" },
  { name: "Rohit Malhotra", conversion: 59, contact: "9898989898", intent: "Low" },
  { name: "Sneha Iyer", conversion: 73, contact: "9001122334", intent: "High" },
  { name: "Vikas Jain", conversion: 66, contact: "9112233445", intent: "Medium" },
  { name: "Shreya Nair", conversion: 78, contact: "9334455667", intent: "High" },
  { name: "Arjun Patel", conversion: 55, contact: "9445566778", intent: "Low" },
  { name: "Kriti Saxena", conversion: 69, contact: "9556677889", intent: "Medium" },
];

export default function App() {
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
                Lead Intelligence Dashboard
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <input
              className="px-4 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none"
              placeholder="Search leads..."
            />

            <Menu as="div" className="relative">
              <Menu.Button className="flex items-center gap-2 px-4 py-2 border border-[#E5E7EB] rounded-lg">
                <div className="w-8 h-8 bg-[#E5E7EB] rounded-full" />
                <span className="text-sm">Agent</span>
              </Menu.Button>

              <Menu.Items className="absolute right-0 mt-2 w-40 bg-white border border-[#E5E7EB] rounded-lg shadow">
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
      <div className="p-6 space-y-6">
        {/* TOP ANALYTICS */}
        <div className="grid grid-cols-4 gap-6">
          <StatCard title="Total Leads" value="32" />
          <StatCard title="High Intent Leads" value="14" />
          <StatCard title="Avg Conversion %" value="56%" />
          <StatCard title="Calls Analyzed Today" value="9" />
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* LEADS TABLE */}
          <div className="col-span-8 bg-white border border-[#E5E7EB] rounded-xl p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Top Prospects</h2>
              <button className="bg-[#0F6CB6] text-white px-4 py-2 rounded-lg hover:bg-[#0B4F8A]">
                + New Call
              </button>
            </div>

            <div className="grid grid-cols-5 text-sm text-[#6B7280] border-b border-[#E5E7EB] pb-2">
              <span>Name</span>
              <span>Conversion</span>
              <span>Intent</span>
              <span>Contact</span>
              <span></span>
            </div>

            {leads.map((lead, i) => (
              <div
                key={i}
                className="grid grid-cols-5 items-center py-3 border-b border-[#E5E7EB] last:border-none"
              >
                <span>{lead.name}</span>
                <span className="font-medium text-[#0F6CB6]">
                  {lead.conversion}%
                </span>
                <IntentBadge intent={lead.intent} />
                <span>{lead.contact}</span>
                <button className="justify-self-end bg-[#FFD400] px-3 py-1 rounded text-sm">
                  Call
                </button>
              </div>
            ))}
          </div>

          {/* RIGHT ANALYTICS */}
          <div className="col-span-4 space-y-6">
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
    <div className="bg-white border border-[#E5E7EB] rounded-xl p-4">
      <div className="text-sm text-[#6B7280]">{title}</div>
      <div className="text-2xl font-semibold text-[#0F6CB6]">{value}</div>
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
    <span
      className={`px-2 py-1 text-xs rounded-full w-fit ${color}`}
    >
      {intent}
    </span>
  );
}

function ProgressCard() {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
      <h3 className="font-semibold mb-4">Agent Conversion Score</h3>
      <div className="w-full bg-[#E5E7EB] rounded-full h-3 mb-2">
        <div className="bg-[#0F6CB6] h-3 rounded-full w-[56%]" />
      </div>
      <div className="text-sm text-[#6B7280]">
        56% likelihood across recent calls
      </div>
    </div>
  );
}

function RecentInsights() {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
      <h3 className="font-semibold mb-3">Recent Insights</h3>
      <ul className="space-y-3 text-sm">
        <li>• Customer asked about premium flexibility</li>
        <li>• Strong intent detected after benefits explanation</li>
        <li>• Objection: policy tenure duration</li>
      </ul>
    </div>
  );
}
