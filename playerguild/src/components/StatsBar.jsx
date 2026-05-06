// src/components/StatsBar.jsx
import { Coins, Shield, Sword, CheckCircle } from "lucide-react";
import { TOKENS } from "../utils/stellar";
import "./StatsBar.css";

export default function StatsBar({ quests }) {
  const active = quests.filter((q) => q.status !== "cancelled");
  const open      = quests.filter((q) => q.status === "open").length;
  const claimed   = quests.filter((q) => q.status === "claimed").length;
  const completed = quests.filter((q) => q.status === "completed").length;

  // Sum escrowed amounts per token separately
  const totalByToken = Object.keys(TOKENS).reduce((acc, tokenId) => {
    acc[tokenId] = active
      .filter((q) => (q.rewardToken ?? "XLM") === tokenId)
      .reduce((sum, q) => sum + parseFloat(q.reward || 0), 0)
      .toFixed(2);
    return acc;
  }, {});

  // Build a compact label like "12.00 XLM · 5.00 USDC" — skip zero amounts
  const escrowLabel = Object.entries(totalByToken)
    .filter(([, amount]) => parseFloat(amount) > 0)
    .map(([tokenId, amount]) => `${TOKENS[tokenId].icon} ${amount} ${TOKENS[tokenId].label}`)
    .join("  ·  ") || "0";

  return (
    <div className="stats-bar">
      <StatItem icon={<Sword size={14} />}        value={open}        label="Open Quests"  color="var(--neon-green)" />
      <StatItem icon={<Shield size={14} />}        value={claimed}     label="In Progress"  color="var(--status-claimed)" />
      <StatItem icon={<CheckCircle size={14} />}   value={completed}   label="Completed"    color="var(--status-completed)" />
      <StatItem icon={<Coins size={14} />}         value={escrowLabel} label="Escrowed"     color="var(--neon-gold)" />
    </div>
  );
}

function StatItem({ icon, value, label, color }) {
  return (
    <div className="stat-item">
      <span className="stat-icon" style={{ color }}>{icon}</span>
      <div>
        <div className="stat-value" style={{ color }}>{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}