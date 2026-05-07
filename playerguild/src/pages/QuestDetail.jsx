// src/pages/QuestDetail.jsx
import { useParams, useNavigate, Link } from "react-router-dom";
import { useEffect } from "react";
import {
  ArrowLeft, Coins, User, Clock, Shield, CheckCircle,
  XCircle, ExternalLink, Sword,
} from "lucide-react";
import toast from "react-hot-toast";
import { useWallet } from "../contexts/WalletContext";
import { useQuestStore } from "../contexts/QuestStore";
import {
  questStatusLabel, questStatusColor, shortenAddress,
  EXPLORER_URL, LAB_URL, formatReward, TOKENS,
} from "../utils/stellar";
import "./QuestDetail.css";

const USD_RATES = { XLM: 0.11, USDC: 1.00 };

export default function QuestDetail() {
  const { id } = useParams();
  const { publicKey, connect } = useWallet();
  const { quests, claimQuest, completeQuest, cancelQuest, loading, loadQuests, loaded } = useQuestStore();

  useEffect(() => {
    if (!loaded) loadQuests();
  }, [loaded, loadQuests]);

  const quest = quests.find((q) => q.id === parseInt(id));

  if (!quest) {
    return (
      <div className="page">
        <div className="not-found">
          <p>Quest not found.</p>
          <Link to="/" className="back-link"><ArrowLeft size={14} /> Back to Board</Link>
        </div>
      </div>
    );
  }

  const token       = quest.rewardToken ?? "XLM";
  const tokenMeta   = TOKENS[token] ?? TOKENS.XLM;
  const rewardLabel = formatReward(quest.reward, token);
  const usdEst      = (parseFloat(quest.reward) * (USD_RATES[token] ?? 1)).toFixed(2);

  const statusColor = questStatusColor[quest.status] || "#888";
  const isGiver     = publicKey === quest.giver;
  const isHunter    = publicKey === quest.hunter;
  const canClaim    = quest.status === "open" && publicKey && !isGiver;
  const canComplete = quest.status === "claimed" && isGiver;
  const canCancel   = quest.status === "open" && isGiver;

  const handleClaim = async () => {
    if (!publicKey) { connect(); return; }
    try {
      await claimQuest(quest.id, publicKey);
      toast.success("Quest claimed! Complete the task and notify the giver.");
    } catch (e) { toast.error("Failed to claim quest"); }
  };

  const handleComplete = async () => {
    try {
      await completeQuest(quest.id);
      toast.success(`${rewardLabel} released to the hunter!`);
    } catch (e) { toast.error("Failed to release payment"); }
  };

  const handleCancel = async () => {
    try {
      await cancelQuest(quest.id);
      toast.success("Quest cancelled. Reward refunded.");
    } catch (e) { toast.error("Failed to cancel quest"); }
  };

  return (
    <div className="page">
      <Link to="/" className="back-link">
        <ArrowLeft size={14} /> Back to Board
      </Link>

      <div className="detail-layout">
        {/* Main */}
        <div className="detail-main">
          <div className="detail-header">
            <span className="detail-game">{quest.game}</span>
            <div
              className="detail-status"
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

          <h1 className="detail-title">{quest.title}</h1>

          <div className="detail-meta">
            <span className="detail-meta-item">
              <User size={13} />
              Posted by <strong>{shortenAddress(quest.giver)}</strong>
            </span>
            <span className="detail-meta-item">
              <Clock size={13} />
              {new Date(quest.createdAt).toLocaleDateString("en-PH", {
                month: "short", day: "numeric",
                hour: "2-digit", minute: "2-digit",
              })}
            </span>
          </div>

          <div className="detail-description">
            <h2 className="section-title">Quest Details</h2>
            <p>{quest.description}</p>
          </div>

          {quest.tags?.length > 0 && (
            <div className="detail-tags">
              {quest.tags.map((t) => <span key={t} className="tag">#{t}</span>)}
            </div>
          )}

          {/* Timeline */}
          <div className="quest-timeline">
            <h2 className="section-title">Quest Timeline</h2>
            <div className="timeline">
              <TlStep
                done
                label="Quest Posted"
                sub={`by ${shortenAddress(quest.giver)}`}
              />
              <TlStep
                done={["claimed", "completed"].includes(quest.status)}
                label="Quest Claimed"
                sub={quest.hunter ? `by ${shortenAddress(quest.hunter)}` : "Waiting for hunter..."}
              />
              <TlStep
                done={quest.status === "completed"}
                label="Work Completed"
                sub={quest.status === "completed" ? "Verified by giver" : "Pending"}
              />
              <TlStep
                done={quest.status === "completed"}
                label="Payment Released"
                sub={
                  quest.status === "completed"
                    ? `${rewardLabel} sent on-chain`
                    : "Held in escrow"
                }
              />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="detail-sidebar">
          {/* Reward card */}
          <div className="reward-card">
            <div className="reward-label">
              <Coins size={14} />
              Quest Reward
            </div>
            <div className="reward-xlm">
              {tokenMeta.icon} {quest.reward}{" "}
              <span>{tokenMeta.label}</span>
            </div>
            <div className="reward-usd">≈ ${usdEst} USD</div>
            <div className="reward-note">
              <Shield size={11} />
              Locked in Soroban escrow
            </div>
          </div>

          {/* Actions */}
          <div className="actions-card">
            {!publicKey && (
              <button className="action-btn action-btn--primary" onClick={connect}>
                Connect Wallet to Act
              </button>
            )}
            {canClaim && (
              <button className="action-btn action-btn--primary" onClick={handleClaim} disabled={loading}>
                <Sword size={14} />
                {loading ? "Processing..." : "Claim Quest"}
              </button>
            )}
            {canComplete && (
              <button className="action-btn action-btn--success" onClick={handleComplete} disabled={loading}>
                <CheckCircle size={14} />
                {loading ? "Processing..." : "Approve & Release Payment"}
              </button>
            )}
            {canCancel && (
              <button className="action-btn action-btn--danger" onClick={handleCancel} disabled={loading}>
                <XCircle size={14} />
                {loading ? "Processing..." : "Cancel Quest"}
              </button>
            )}
            {isHunter && quest.status === "claimed" && (
              <div className="action-info">
                You've claimed this quest. Complete the task and notify the quest giver.
              </div>
            )}
            {quest.status === "completed" && (
              <div className="action-done">
                <CheckCircle size={14} />
                Quest completed. Payment released on-chain.
              </div>
            )}
          </div>

          {/* Contract links */}
          <div className="contract-links">
            <div className="contract-links-title">On-Chain</div>
            <a href={LAB_URL} target="_blank" rel="noopener noreferrer" className="chain-link">
              <ExternalLink size={12} /> View Contract on Stellar Lab
            </a>
            <a
              href={`${EXPLORER_URL}/account/${quest.giver}`}
              target="_blank"
              rel="noopener noreferrer"
              className="chain-link"
            >
              <ExternalLink size={12} /> View Giver Account
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function TlStep({ done, label, sub }) {
  return (
    <div className={`tl-step ${done ? "tl-step--done" : ""}`}>
      <div className="tl-dot" />
      <div className="tl-content">
        <div className="tl-label">{label}</div>
        <div className="tl-sub">{sub}</div>
      </div>
    </div>
  );
}
