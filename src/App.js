import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { WalletProvider } from "./contexts/WalletContext";
import Navbar from "./components/Navbar";
import QuestBoard from "./pages/QuestBoard";
import PostQuest from "./pages/PostQuest";
import QuestDetail from "./pages/QuestDetail";
import MyQuests from "./pages/MyQuests";
import "./styles/global.css";

export default function App() {
  return (
    <WalletProvider>
      <BrowserRouter>
        <div className="app-root">
          <Navbar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<QuestBoard />} />
              <Route path="/post" element={<PostQuest />} />
              <Route path="/quest/:id" element={<QuestDetail />} />
              <Route path="/my-quests" element={<MyQuests />} />
            </Routes>
          </main>
        </div>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#0d0d14",
              color: "#e8e8f0",
              border: "1px solid #2a2a3e",
              fontFamily: "'Space Mono', monospace",
              fontSize: "13px",
            },
          }}
        />
      </BrowserRouter>
    </WalletProvider>
  );
}