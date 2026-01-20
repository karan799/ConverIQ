import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import NewCall from "./pages/NewCall";
import CallScreen from "./pages/CallScreen";
import LiveCallScreen from "./pages/LiveCallScreen";
import CallSummary from "./pages/CallSummary";
import ProspectDetails from "./pages/ProspectDetails";


export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/new-call" element={<NewCall />} />
      <Route path="/call/:callId" element={<CallScreen />} />
      <Route path="/live-call" element={<LiveCallScreen />} />
      <Route path="/call-summary" element={<CallSummary />} />
      <Route path="/prospect/:id" element={<ProspectDetails />} />
    </Routes>
  );
}
