import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Menu } from "@headlessui/react";

export default function Layout() {
    const navigate = useNavigate();
    const location = useLocation();

    // You might want to move the recording state management to a context provider later
    // for now we'll keep it simple as per the existing LiveCallScreen logic

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 text-white font-sans selection:bg-indigo-500/30">
            {/* Header */}
            <nav className="sticky top-0 z-50 bg-black/30 backdrop-blur-md border-b border-white/10">
                <div className="px-6 py-4 flex items-center justify-between">
                    <div
                        className="flex items-center gap-3 cursor-pointer group"
                        onClick={() => navigate("/")}
                    >
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-300">
                            CI
                        </div>
                        <div>
                            <div className="text-white font-semibold text-lg tracking-tight">ConverIQ</div>
                            <div className="text-xs text-indigo-300 font-medium">Lead Intelligence Dashboard</div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Navigation Links can go here */}
                        {location.pathname !== '/' && (
                            <button
                                onClick={() => navigate("/")}
                                className="text-sm font-medium text-indigo-300 hover:text-white transition-colors"
                            >
                                Scanner
                            </button>
                        )}
                        <Menu as="div" className="relative">
                            <Menu.Button className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-sm hover:bg-indigo-500/20 transition">
                                <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center text-xs text-white">A</div>
                                <span className="text-indigo-200">Agent</span>
                            </Menu.Button>
                            <Menu.Items className="absolute right-0 mt-2 w-48 bg-slate-900 border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden">
                                <div className="p-1">
                                    <Menu.Item>
                                        {({ active }) => (
                                            <button className={`w-full text-left px-3 py-2 text-sm rounded-lg transition ${active ? "bg-indigo-500/20 text-indigo-300" : "text-slate-400"}`}>
                                                Profile
                                            </button>
                                        )}
                                    </Menu.Item>
                                    <Menu.Item>
                                        {({ active }) => (
                                            <button className={`w-full text-left px-3 py-2 text-sm rounded-lg transition ${active ? "bg-red-500/20 text-red-300" : "text-slate-400"}`}>
                                                Logout
                                            </button>
                                        )}
                                    </Menu.Item>
                                </div>
                            </Menu.Items>
                        </Menu>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="animate-fadeIn">
                <Outlet />
            </main>

            <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out forwards;
        }
      `}</style>
        </div>
    );
}
