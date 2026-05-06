// src/components/QuestCard.jsx
import { Link } from "react-router-dom";
import { Coins, Clock, User, ChevronRight } from "lucide-react";
import { questStatusLabel, questStatusColor, shortenAddress, TOKENS } from "../utils/stellar";
import "./QuestCard.css";

export default function QuestCard({ quest, delay = 0 }) {
  const statusColor = questStatusColor[quest.status] || "#888";
  const timeAgo     = getTimeAgo(quest.createdAt);
  const token       = TOKENS[quest.rewardToken] ?? TOKENS.XLM;

  return (
    <Link
      to={`/quest/${quest.id}`}
      className="quest-card"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Status stripe */}
      <div className="quest-status-stripe" style={{ background: statusColor }} />

      <div className="quest-card-inner">
        {/* Header */}
        <div className="quest-card-header">
          <span className="quest-game">{quest.game}</span>
          <div
            className="quest-status-pill"
            style={{
              color: statusColor,
              borderColor: `${statusColor}33`,
              background: `${statusColor}0d`,
            }}
          >
            <span className="status-dot" style={{ background: statusColor }} />
            {questStatusLabel[quest.status]}
          </div>
        </div>

        {/* Title */}
        <h3 className="quest-title">{quest.title}</h3>

        {/* Description excerpt */}
        <p className="quest-excerpt">{quest.description}</p>

        {/* Tags */}
        {quest.tags?.length > 0 && (
          <div className="quest-tags">
            {quest.tags.slice(0, 3).map((t) => (
              <span key={t} className="tag">#{t}</span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="quest-card-footer">
          <div className="quest-meta-items">
            <span className="quest-meta-item">
              <Coins size={12} />
              <strong className="reward-amount">
                {token.icon} {quest.reward} {token.label}
              </strong>
            </span>
            <span className="quest-meta-item">
              <User size={12} />
              {shortenAddress(quest.giver)}
            </span>
            <span className="quest-meta-item">
              <Clock size={12} />
              {timeAgo}
            </span>
          </div>
          <ChevronRight size={16} className="quest-arrow" />
        </div>
      </div>
    </Link>
  );
}

function getTimeAgo(ts) {
  const diff = Date.now() - ts;
  if (diff < 60000)    return "just now";
  if (diff < 3600000)  return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}