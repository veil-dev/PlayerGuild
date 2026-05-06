// src/pages/MyQuests.jsx
import { Link } from "react-router-dom";
import { Shield, Sword, Wallet } from "lucide-react";
import { useWallet } from "../contexts/WalletContext";
import { useQuestStore } from "../contexts/QuestStore";
import QuestCard from "../components/QuestCard";

export default function MyQuests() {
  const { publicKey, connect } = useWallet();
  const { quests } = useQuestStore();

  if (!publicKey) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", gap: 16, padding: "100px 24px", textAlign: "center",
      }}>
        <Wallet size={36} style={{ color: "var(--neon-green)", opacity: 0.5 }} />
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, letterSpacing: "0.1em" }}>
          Connect Your Wallet
        </h2>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>
          Connect to see quests you've posted or claimed.
        </p>
        <button
          onClick={connect}
          style={{
            padding: "10px 24px", background: "transparent",
            border: "1px solid var(--neon-green)", color: "var(--neon-green)",
            fontFamily: "var(--font-mono)", fontSize: 12, borderRadius: 3, cursor: "pointer",
          }}
        >
          Connect Wallet
        </button>
      </div>
    );
  }

  const posted  = quests.filter((q) => q.giver  === publicKey);
  const claimed = quests.filter((q) => q.hunter === publicKey);

  return (
    <div className="page">
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 36 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, letterSpacing: "0.12em" }}>
          My Quests
        </h1>
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--neon-cyan)",
          padding: "4px 10px", border: "1px solid rgba(0,229,255,0.2)", borderRadius: 2,
        }}>
          {publicKey.slice(0, 6)}...{publicKey.slice(-6)}
        </span>
      </div>

      {/* Posted */}
      <section style={{ marginBottom: 40 }}>
        <SectionHeader icon={<Sword size={14} />} label="Quests I Posted" count={posted.length} />
        {posted.length === 0 ? (
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>
            No quests posted yet.{" "}
            <Link to="/post" style={{ color: "var(--neon-cyan)" }}>Post your first quest →</Link>
          </p>
        ) : (
          <div className="quest-grid">
            {posted.map((q, i) => <QuestCard key={q.id} quest={q} delay={i * 60} />)}
          </div>
        )}
      </section>

      {/* Claimed */}
      <section style={{ marginBottom: 40 }}>
        <SectionHeader icon={<Shield size={14} />} label="Quests I've Claimed" count={claimed.length} />
        {claimed.length === 0 ? (
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>
            No quests claimed yet.{" "}
            <Link to="/" style={{ color: "var(--neon-cyan)" }}>Browse the board →</Link>
          </p>
        ) : (
          <div className="quest-grid">
            {claimed.map((q, i) => <QuestCard key={q.id} quest={q} delay={i * 60} />)}
          </div>
        )}
      </section>
    </div>
  );
}

function SectionHeader({ icon, label, count }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      marginBottom: 16, paddingBottom: 10, borderBottom: "1px solid var(--border)",
    }}>
      <span style={{ color: "var(--neon-green)" }}>{icon}</span>
      <h2 style={{
        fontFamily: "var(--font-mono)", fontSize: 12,
        letterSpacing: "0.1em", fontWeight: 400, color: "var(--text-secondary)",
      }}>
        {label}
      </h2>
      <span style={{
        fontFamily: "var(--font-display)", fontSize: 12, color: "var(--neon-green)",
        padding: "1px 8px", border: "1px solid rgba(0,255,157,0.2)", borderRadius: 2,
      }}>
        {count}
      </span>
    </div>
  );
}