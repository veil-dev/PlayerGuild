import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { WalletProvider } from "./contexts/WalletContext";
import WalletPicker from "./contexts/WalletPicker";
import Navbar from "./components/Navbar";
import QuestBoard from "./pages/QuestBoard";
import PostQuest from "./pages/PostQuest";
import QuestDetail from "./pages/QuestDetail";
import MyQuests from "./pages/MyQuests";
import Profile from "./pages/Profile";
import "./styles/global.css";

export default function App() {
  return (
    <WalletProvider>
      <BrowserRouter>
        <WalletPicker />
        <div className="app-root">
          <Navbar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<QuestBoard />} />
              <Route path="/post" element={<PostQuest />} />
              <Route path="/quest/:id" element={<QuestDetail />} />
              <Route path="/my-quests" element={<MyQuests />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/profile/:wallet" element={<Profile />} />
            </Routes>
          </main>
        </div>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#1A1033",
              color: "#F3F0FF",
              border: "1px solid rgba(124,58,237,0.3)",
              fontSize: "13px",
            },
          }}
        />
      </BrowserRouter>
    </WalletProvider>
  );
}