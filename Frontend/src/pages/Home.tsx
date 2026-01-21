import { useNavigate } from "react-router-dom";

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
    <div className="p-4 md:p-6 space-y-6">
      {/* NAVBAR REMOVED - Now in Layout */}

      {/* HEADER / SEARCH REMOVED - Agent moved to Navbar */}
      <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
        Dashboard
      </h1>

      {/* TOP ANALYTICS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Leads" value="32" icon="👥" color="blue" />
        <StatCard title="High Intent" value="14" icon="🔥" color="orange" />
        <StatCard title="Avg Conversion" value="56%" icon="📈" color="green" />
        <StatCard title="Calls Today" value="9" icon="📞" color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEADS TABLE */}
        <div className="lg:col-span-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 overflow-hidden flex flex-col">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span className="text-indigo-400">✨</span> Top Prospects
            </h2>
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={() => navigate("/live-call")}
                className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:from-red-600 hover:to-orange-600 transition shadow-lg shadow-red-500/20 flex items-center gap-2 flex-1 justify-center whitespace-nowrap"
              >
                🎙️ Live Record
              </button>
              <button
                onClick={() => navigate("/new-call")}
                className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition shadow-lg shadow-indigo-500/20 flex-1 justify-center whitespace-nowrap"
              >
                + New Call
              </button>
            </div>
          </div>

          {/* Table Header */}
          <div className="hidden md:grid md:grid-cols-5 text-xs font-medium text-slate-400 border-b border-white/10 pb-3 uppercase tracking-wider">
            <span>Name</span>
            <span>Conversion</span>
            <span>Intent</span>
            <span>Contact</span>
            <span className="text-right">Action</span>
          </div>

          {/* Table Rows */}
          <div className="space-y-2 md:space-y-0 mt-2 overflow-y-auto pr-1 scrollbar-thin max-h-[500px]">
            {leads.map((lead, i) => (
              <div
                key={i}
                onClick={() => goToProspectDetails(lead)}
                className="group block md:grid md:grid-cols-5 md:items-center py-3 px-3 md:px-2 rounded-xl border border-transparent hover:border-white/10 hover:bg-white/5 transition cursor-pointer"
              >
                {/* Mobile View */}
                <div className="md:hidden space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-white">{lead.name}</div>
                      <div className="text-xs text-slate-400">{lead.contact}</div>
                    </div>
                    <IntentBadge intent={lead.intent} />
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="text-sm">
                      <span className="text-slate-400">Conv: </span>
                      <span className="text-green-400 font-bold">{lead.conversion}%</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startCallFromTable(lead);
                      }}
                      className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-indigo-500/30"
                    >
                      Call Now
                    </button>
                  </div>
                </div>

                {/* Desktop View */}
                <span className="hidden md:block font-medium text-slate-200 group-hover:text-white transition">{lead.name}</span>
                <span className="hidden md:block font-bold text-green-400">{lead.conversion}%</span>
                <span className="hidden md:block">
                  <IntentBadge intent={lead.intent} />
                </span>
                <span className="hidden md:block text-sm text-slate-400">{lead.contact}</span>
                <div className="hidden md:flex justify-end">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startCallFromTable(lead);
                    }}
                    className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-indigo-500/30 transition opacity-0 group-hover:opacity-100"
                  >
                    Call
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT ANALYTICS */}
        <div className="space-y-6">
          <ProgressCard />
          <RecentInsights />
        </div>
      </div>
    </div>
  );
}

/* ---------------- Components ---------------- */

function StatCard({ title, value, icon, color }: { title: string; value: string; icon: string; color: "blue" | "green" | "orange" | "purple" }) {
  const colors = {
    blue: "from-blue-500/20 to-cyan-500/20 border-blue-500/20 text-blue-400",
    green: "from-emerald-500/20 to-teal-500/20 border-emerald-500/20 text-emerald-400",
    orange: "from-orange-500/20 to-amber-500/20 border-orange-500/20 text-orange-400",
    purple: "from-purple-500/20 to-pink-500/20 border-purple-500/20 text-purple-400",
  };

  return (
    <div className={`bg-gradient-to-br ${colors[color]} backdrop-blur-sm border rounded-2xl p-4 hover:scale-[1.02] transition duration-300`}>
      <div className="flex justify-between items-start mb-2">
        <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">{title}</div>
        <span className="text-xl opacity-80">{icon}</span>
      </div>
      <div className={`text-2xl font-bold ${colors[color].split(" ").pop()}`}>
        {value}
      </div>
    </div>
  );
}

function IntentBadge({ intent }: { intent: Lead["intent"] }) {
  const styles =
    intent === "High"
      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
      : intent === "Medium"
        ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/30"
        : "bg-slate-500/20 text-slate-300 border-slate-500/30";

  return (
    <span className={`px-2.5 py-1 text-[10px] font-medium rounded-full border ${styles}`}>
      {intent.toUpperCase()}
    </span>
  );
}

function ProgressCard() {
  return (
    <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900/40 backdrop-blur-sm border border-indigo-500/20 rounded-2xl p-5">
      <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
        <span className="text-indigo-400">🎯</span> Agent Score
      </h3>
      <div className="relative pt-2">
        <div className="flex justify-between text-xs mb-2 text-slate-400">
          <span>Conversion Rate</span>
          <span className="text-white font-bold">56%</span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-2 mb-2 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full w-[56%] animate-pulse" />
        </div>
        <div className="text-xs text-slate-500">
          Top 15% of agents this week
        </div>
      </div>
    </div>
  );
}

function RecentInsights() {
  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5">
      <h3 className="font-semibold text-sm mb-4 text-slate-200">
        Recent Insights
      </h3>
      <ul className="space-y-3 text-sm">
        {[
          { text: "Customer asked about premium flexibility", type: "neutral" },
          { text: "Strong intent detected after benefits explanation", type: "positive" },
          { text: "Objection: policy tenure duration", type: "negative" }
        ].map((item, i) => (
          <li key={i} className="flex gap-3 items-start p-2 rounded-lg hover:bg-white/5 transition">
            <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${item.type === 'positive' ? 'bg-green-400' :
              item.type === 'negative' ? 'bg-red-400' : 'bg-blue-400'
              }`} />
            <span className="text-slate-300 text-xs leading-relaxed">{item.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
