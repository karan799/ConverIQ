import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import NewCall from "./pages/NewCall";
import CallScreen from "./pages/CallScreen";
import CallSummary from "./pages/CallSummary";


export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/new-call" element={<NewCall />} />
      <Route path="/call/:callId" element={<CallScreen />} />
      <Route path="/call-summary" element={<CallSummary />} />
    </Routes>
  );
}
