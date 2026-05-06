// src/pages/PostQuest.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sword, Info, Lock, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";
import { useWallet } from "../contexts/WalletContext";
import { useQuestStore } from "../contexts/QuestStore";
import TokenSelector from "../components/TokenSelector";
import { TOKENS } from "../utils/stellar";
import "./PostQuest.css";

const GAMES = [
  "Ragnarok M", "Mobile Legends", "Genshin Impact", "Lost Ark",
  "Arena of Valor", "Wild Rift", "Honkai: Star Rail", "PUBG Mobile",
  "Valorant", "Dota 2", "Other",
];

// Rough USD estimates per token
const USD_RATES = { XLM: 0.11, USDC: 1.00 };

export default function PostQuest() {
  const navigate = useNavigate();
  const { publicKey, connect } = useWallet();
  const { postQuest, loading } = useQuestStore();

  const [form, setForm] = useState({
    title: "",
    description: "",
    reward: "",
    game: "",
    tags: "",
  });
  const [rewardToken, setRewardToken] = useState("XLM");

  const set = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const usdEst = form.reward
    ? (parseFloat(form.reward) * (USD_RATES[rewardToken] ?? 1)).toFixed(2)
    : null;

  const handleSubmit = async () => {
    if (!publicKey) {
      toast.error("Connect your wallet first");
      return;
    }
    if (!form.title || !form.description || !form.reward || !form.game) {
      toast.error("Fill in all required fields");
      return;
    }
    if (parseFloat(form.reward) <= 0) {
      toast.error("Reward must be greater than 0");
      return;
    }

    try {
      const tags = form.tags
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);

      await postQuest({ ...form, tags, rewardToken, giverKey: publicKey });
      toast.success("Quest posted! Reward locked in escrow.");
      navigate("/");
    } catch (err) {
      toast.error("Failed to post quest");
      console.error(err);
    }
  };

  return (
    <div className="page">
      <div className="post-layout">
        {/* Form */}
        <div className="post-form-col">
          <div className="post-header">
            <Sword size={18} className="post-header-icon" />
            <div>
              <h1 className="post-title">Post a Quest</h1>
              <p className="post-subtitle">
                Your {TOKENS[rewardToken]?.label ?? rewardToken} reward will be locked in Soroban escrow
              </p>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Quest Title <span className="req">*</span></label>
            <input
              className="form-input"
              placeholder="e.g. Defeat the Dragon Boss in Ragnarok M"
              value={form.title}
              onChange={set("title")}
              maxLength={80}
            />
            <span className="form-hint">{form.title.length}/80</span>
          </div>

          <div className="form-group">
            <label className="form-label">Game <span className="req">*</span></label>
            <select className="form-input form-select" value={form.game} onChange={set("game")}>
              <option value="">Select game...</option>
              {GAMES.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Description <span className="req">*</span></label>
            <textarea
              className="form-input form-textarea"
              placeholder="Describe what needs to be done, requirements, communication channel, etc."
              value={form.description}
              onChange={set("description")}
              rows={4}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Reward <span className="req">*</span>
              <span className="label-sub">Will be locked on-chain</span>
            </label>

            {/* Token picker */}
            <div style={{ marginBottom: 10 }}>
              <TokenSelector
                value={rewardToken}
                onChange={setRewardToken}
                disabled={loading}
              />
            </div>

            {/* Amount input */}
            <div className="reward-input-wrap">
              <input
                className="form-input reward-input"
                type="number"
                min="0.1"
                step="0.5"
                placeholder="0.00"
                value={form.reward}
                onChange={set("reward")}
              />
              <span className="reward-currency">{TOKENS[rewardToken]?.label ?? rewardToken}</span>
            </div>

            {usdEst && (
              <span className="form-hint usd-est">
                ≈ ${usdEst} USD (est.)
              </span>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Tags <span className="opt">(optional)</span></label>
            <input
              className="form-input"
              placeholder="carry, boss, ranked  —  comma separated"
              value={form.tags}
              onChange={set("tags")}
            />
          </div>

          {/* Wallet gate */}
          {!publicKey ? (
            <button className="btn-connect-gate" onClick={connect}>
              <Lock size={14} />
              Connect Wallet to Post
            </button>
          ) : (
            <button
              className="btn-submit"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="loading-dot" />
                  Locking reward in escrow...
                </>
              ) : (
                <>
                  Lock &amp; Post Quest
                  <ChevronRight size={16} />
                </>
              )}
            </button>
          )}
        </div>

        {/* Info panel */}
        <div className="post-info-col">
          <div className="info-card">
            <div className="info-card-title">
              <Info size={14} />
              How it works
            </div>
            <ol className="how-list">
              <li>
                <span className="how-num">01</span>
                <div>
                  <strong>Post &amp; Lock</strong>
                  <p>Your reward is locked in the Soroban escrow contract on Stellar testnet.</p>
                </div>
              </li>
              <li>
                <span className="how-num">02</span>
                <div>
                  <strong>Hunter Claims</strong>
                  <p>Another gamer claims your quest. The contract records their address.</p>
                </div>
              </li>
              <li>
                <span className="how-num">03</span>
                <div>
                  <strong>Work Gets Done</strong>
                  <p>The hunter completes the in-game task and notifies you.</p>
                </div>
              </li>
              <li>
                <span className="how-num">04</span>
                <div>
                  <strong>You Release Payment</strong>
                  <p>You approve on-chain. Tokens are instantly transferred to the hunter.</p>
                </div>
              </li>
            </ol>
          </div>

          <div className="info-card" style={{ marginTop: 12 }}>
            <div className="info-card-title">
              <Info size={14} />
              Supported Tokens
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
              {Object.values(TOKENS).map((t) => (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 16 }}>{t.icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary, #F3F0FF)" }}>
                      {t.label}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted, #6B7280)" }}>{t.name}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="contract-card">
            <div className="contract-label">Live Contract</div>
            <div className="contract-addr">CDIJG6...4L7EL</div>
            <div className="contract-net">Stellar Testnet · Soroban</div>
          </div>
        </div>
      </div>
    </div>
  );
}