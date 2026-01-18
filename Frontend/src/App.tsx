import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import NewCall from "./pages/NewCall";
import CallScreen from "./pages/CallScreen";
import CallSummary from "./pages/CallSummary";
import ProspectDetails from "./pages/ProspectDetails";
import AudioScreen from "./pages/AudioScreen";
import AudioFunction from "./pages/AudioCall";


export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/new-call" element={<NewCall />} />
      <Route path="/call/:callId" element={<CallScreen />} />
      <Route path="/call-summary" element={<CallSummary />} />
      <Route path="/prospect/:id" element={<ProspectDetails />} />
      <Route path="/audio" element={<AudioScreen />} />
      <Route path="/call" element={<AudioFunction />} />
    </Routes>
  );
}


