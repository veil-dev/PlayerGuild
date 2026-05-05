// src/components/StatsBar.jsx
import { Coins, Shield, Sword, CheckCircle } from "lucide-react";
import "./StatsBar.css";

export default function StatsBar({ quests }) {
  const open      = quests.filter((q) => q.status === "open").length;
  const claimed   = quests.filter((q) => q.status === "claimed").length;
  const completed = quests.filter((q) => q.status === "completed").length;
  const totalXLM  = quests
    .filter((q) => q.status !== "cancelled")
    .reduce((sum, q) => sum + parseFloat(q.reward), 0)
    .toFixed(2);

  return (
    <div className="stats-bar">
      <StatItem icon={<Sword size={14} />} value={open} label="Open Quests" color="var(--neon-green)" />
      <StatItem icon={<Shield size={14} />} value={claimed} label="In Progress" color="var(--status-claimed)" />
      <StatItem icon={<CheckCircle size={14} />} value={completed} label="Completed" color="var(--status-completed)" />
      <StatItem icon={<Coins size={14} />} value={`${totalXLM} XLM`} label="Escrowed" color="var(--neon-gold)" />
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