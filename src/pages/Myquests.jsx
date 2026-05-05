// src/pages/MyQuests.jsx
import { Link } from "react-router-dom";
import { Shield, Sword, Wallet } from "lucide-react";
import { useWallet } from "../contexts/WalletContext";
import { useQuestStore } from "../contexts/QuestStore";
import QuestCard from "../components/QuestCard";
import "./MyQuests.css";

export default function MyQuests() {
  const { publicKey, connect } = useWallet();
  const { quests } = useQuestStore();

  if (!publicKey) {
    return (
      <div className="page">
        <div className="myquests-gate">
          <Wallet size={36} className="gate-icon" />
          <h2 className="gate-title">Connect Your Wallet</h2>
          <p className="gate-sub">Connect to see quests you've posted or claimed.</p>
          <button className="btn-connect-gate" onClick={connect}>Connect Wallet</button>
        </div>
      </div>
    );
  }

  const posted  = quests.filter((q) => q.giver   === publicKey);
  const claimed = quests.filter((q) => q.hunter  === publicKey);

  return (
    <div className="page">
      <div className="myquests-header">
        <h1 className="myquests-title">My Quests</h1>
        <span className="myquests-addr">{publicKey.slice(0, 6)}...{publicKey.slice(-6)}</span>
      </div>

      {/* Posted */}
      <section className="myquests-section">
        <div className="section-heading">
          <Sword size={14} className="section-icon" />
          <h2>Quests I Posted</h2>
          <span className="section-count">{posted.length}</span>
        </div>
        {posted.length === 0 ? (
          <div className="section-empty">
            No quests posted yet.{" "}
            <Link to="/post" className="inline-link">Post your first quest →</Link>
          </div>
        ) : (
          <div className="quest-grid">
            {posted.map((q, i) => <QuestCard key={q.id} quest={q} delay={i * 60} />)}
          </div>
        )}
      </section>

      {/* Claimed */}
      <section className="myquests-section">
        <div className="section-heading">
          <Shield size={14} className="section-icon" />
          <h2>Quests I've Claimed</h2>
          <span className="section-count">{claimed.length}</span>
        </div>
        {claimed.length === 0 ? (
          <div className="section-empty">
            You haven't claimed any quests yet.{" "}
            <Link to="/" className="inline-link">Browse the board →</Link>
          </div>
        ) : (
          <div className="quest-grid">
            {claimed.map((q, i) => <QuestCard key={q.id} quest={q} delay={i * 60} />)}
          </div>
        )}
      </section>
    </div>
  );
}s