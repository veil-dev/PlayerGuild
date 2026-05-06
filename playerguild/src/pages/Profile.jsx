// src/pages/Profile.jsx
import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  User, Star, Sword, Shield, Edit2, Check, X,
  MessageSquare, Trophy, Clock, ExternalLink,
} from "lucide-react";
import toast from "react-hot-toast";
import { useWallet } from "../contexts/WalletContext";
import { api } from "../utils/api";
import { shortenAddress, EXPLORER_URL } from "../utils/stellar";
import "./Profile.css";

export default function Profile() {
  const { wallet } = useParams();
  const navigate   = useNavigate();
  const { publicKey, profile: myProfile } = useWallet();

  const targetWallet = wallet || publicKey;
  const isOwn        = targetWallet === publicKey;

  const [user,     setUser]     = useState(null);
  const [reviews,  setReviews]  = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [editing,  setEditing]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [form,     setForm]     = useState({
    username: "", bio: "", avatar_url: "", discord_handle: "",
  });

  useEffect(() => {
    if (!targetWallet) { navigate("/"); return; }
    setLoading(true);
    Promise.all([
      api.getUser(targetWallet),
      api.getReviews(targetWallet),
      api.getActivity(targetWallet),
    ])
      .then(([u, r, a]) => {
        setUser(u);
        setReviews(r.reviews || []);
        setActivity(a.activity || []);
        setForm({
          username:       u.username       || "",
          bio:            u.bio            || "",
          avatar_url:     u.avatar_url     || "",
          discord_handle: u.discord_handle || "",
        });
      })
      .catch(() => toast.error("Failed to load profile"))
      .finally(() => setLoading(false));
  }, [targetWallet, navigate]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateProfile(form);
      setUser((u) => ({ ...u, ...form }));
      setEditing(false);
      toast.success("Profile updated!");
    } catch (e) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (!targetWallet) return null;

  if (loading) return (
    <div className="page profile-loading">
      <div className="profile-spinner" />
    </div>
  );

  if (!user) return (
    <div className="page">
      <p style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: 13 }}>
        User not found.
      </p>
    </div>
  );

  // ─── Credibility scores ──────────────────────────────────────────────────
  const completedAsHunter  = (user.quests_completed || 0);
  const completedAsGiver   = (user.quests_posted    || 0);
  const avgRating          = parseFloat(user.avg_rating) || 0;
  const reviewCount        = parseInt(user.review_count) || 0;

  // Hunter score: completions (40pts each) + rating bonus (up to 100pts)
  const hunterScore = Math.min(100,
    Math.round((completedAsHunter * 40 + avgRating * 20) / Math.max(1, completedAsHunter * 40 + 100) * 100)
  );

  // Employer score: quests posted (20pts each) + avg rating they gave (up to 60pts)
  const employerScore = Math.min(100,
    Math.round((completedAsGiver * 20 + avgRating * 12) / Math.max(1, completedAsGiver * 20 + 60) * 100)
  );

  const overallScore = Math.round((hunterScore + employerScore) / 2);

  const scoreColor = (s) => s >= 80 ? "#00ff9d" : s >= 50 ? "#f9a825" : "#ef5350";
  const scoreLabel = (s) => s >= 80 ? "Excellent" : s >= 60 ? "Good" : s >= 40 ? "Fair" : "New";

  return (
    <div className="page">
      <div className="profile-layout">

        {/* ── Left column ── */}
        <div className="profile-left">

          {/* Avatar + identity */}
          <div className="profile-card profile-identity">
            <div className="profile-avatar-wrap">
              {form.avatar_url || user.avatar_url ? (
                <img
                  src={editing ? form.avatar_url : user.avatar_url}
                  alt="avatar"
                  className="profile-avatar"
                  onError={(e) => { e.target.style.display = "none"; }}
                />
              ) : (
                <div className="profile-avatar-placeholder">
                  <User size={36} />
                </div>
              )}
            </div>

            {editing ? (
              <div className="profile-edit-fields">
                <input
                  className="profile-input"
                  placeholder="Username"
                  value={form.username}
                  onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                  maxLength={30}
                />
                <input
                  className="profile-input"
                  placeholder="Avatar URL"
                  value={form.avatar_url}
                  onChange={(e) => setForm((f) => ({ ...f, avatar_url: e.target.value }))}
                />
                <input
                  className="profile-input"
                  placeholder="Discord handle (e.g. user#1234)"
                  value={form.discord_handle}
                  onChange={(e) => setForm((f) => ({ ...f, discord_handle: e.target.value }))}
                />
                <textarea
                  className="profile-input profile-bio-input"
                  placeholder="Bio — tell the guild about yourself"
                  value={form.bio}
                  onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                  rows={3}
                  maxLength={200}
                />
                <div className="profile-edit-actions">
                  <button className="profile-save-btn" onClick={handleSave} disabled={saving}>
                    <Check size={14} /> {saving ? "Saving..." : "Save"}
                  </button>
                  <button className="profile-cancel-btn" onClick={() => setEditing(false)}>
                    <X size={14} /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="profile-username">
                  {user.username || shortenAddress(targetWallet)}
                </div>
                {user.bio && <p className="profile-bio">{user.bio}</p>}
                {user.discord_handle && (
                  <div className="profile-discord">
                    <MessageSquare size={12} /> {user.discord_handle}
                  </div>
                )}
                <a
                  href={`${EXPLORER_URL}/account/${targetWallet}`}
                  target="_blank"
                  rel="noreferrer"
                  className="profile-wallet-link"
                >
                  <ExternalLink size={11} />
                  {shortenAddress(targetWallet)}
                </a>
                {isOwn && (
                  <button className="profile-edit-btn" onClick={() => setEditing(true)}>
                    <Edit2 size={13} /> Edit Profile
                  </button>
                )}
              </>
            )}
          </div>

          {/* Stats */}
          <div className="profile-card">
            <div className="profile-card-title">Stats</div>
            <div className="profile-stats">
              <StatRow icon={<Sword size={13} />}  label="Quests Posted"    value={user.quests_posted    || 0} />
              <StatRow icon={<Shield size={13} />} label="Quests Claimed"   value={user.quests_claimed   || 0} />
              <StatRow icon={<Trophy size={13} />} label="Quests Completed" value={user.quests_completed || 0} />
              <StatRow icon={<Star size={13} />}   label="Avg Rating"       value={avgRating ? `${avgRating} / 5` : "—"} />
              <StatRow icon={<MessageSquare size={13} />} label="Reviews"   value={reviewCount} />
            </div>
          </div>
        </div>

        {/* ── Right column ── */}
        <div className="profile-right">

          {/* Credibility scores */}
          <div className="profile-card">
            <div className="profile-card-title">Credibility Score</div>
            <div className="cred-scores">

              <CredScore
                label="Overall"
                score={overallScore}
                color={scoreColor(overallScore)}
                badge={scoreLabel(overallScore)}
                desc="Combined hunter + employer reputation"
              />

              <div className="cred-divider" />

              <CredScore
                label="As Hunter"
                icon={<Shield size={14} />}
                score={hunterScore}
                color={scoreColor(hunterScore)}
                badge={scoreLabel(hunterScore)}
                desc={`${completedAsHunter} quests completed`}
              />

              <CredScore
                label="As Employer"
                icon={<Sword size={14} />}
                score={employerScore}
                color={scoreColor(employerScore)}
                badge={scoreLabel(employerScore)}
                desc={`${completedAsGiver} quests posted`}
              />
            </div>
          </div>

          {/* Reviews */}
          <div className="profile-card">
            <div className="profile-card-title">
              Reviews <span className="profile-count">{reviews.length}</span>
            </div>
            {reviews.length === 0 ? (
              <p className="profile-empty">No reviews yet.</p>
            ) : (
              <div className="reviews-list">
                {reviews.map((r) => (
                  <div key={r.id} className="review-item">
                    <div className="review-header">
                      <div className="review-meta">
                        <span className="review-role">{r.role === "hunter" ? "🛡 Hunter" : "⚔ Employer"}</span>
                        <span className="review-quest">
                          {r.quest_title
                            ? <Link to={`/quest/${r.quest_id}`} className="review-quest-link">{r.quest_title}</Link>
                            : `Quest #${r.quest_id}`}
                        </span>
                      </div>
                      <StarRating value={r.rating} />
                    </div>
                    {r.comment && <p className="review-comment">{r.comment}</p>}
                    <div className="review-from">
                      from {shortenAddress(r.reviewer)} · {timeAgo(r.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activity */}
          <div className="profile-card">
            <div className="profile-card-title">
              Recent Activity <span className="profile-count">{activity.length}</span>
            </div>
            {activity.length === 0 ? (
              <p className="profile-empty">No activity yet.</p>
            ) : (
              <div className="activity-list">
                {activity.slice(0, 10).map((a) => (
                  <div key={a.id} className="activity-item">
                    <span className="activity-dot" style={{ background: actionColor(a.action) }} />
                    <div className="activity-body">
                      <span className="activity-action">{actionLabel(a.action)}</span>
                      {a.quest_title && (
                        <Link to={`/quest/${a.quest_id}`} className="activity-quest">
                          {a.quest_title}
                        </Link>
                      )}
                    </div>
                    <span className="activity-time">
                      <Clock size={11} /> {timeAgo(a.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatRow({ icon, label, value }) {
  return (
    <div className="stat-row">
      <span className="stat-row-icon">{icon}</span>
      <span className="stat-row-label">{label}</span>
      <span className="stat-row-value">{value}</span>
    </div>
  );
}

function CredScore({ label, icon, score, color, badge, desc }) {
  return (
    <div className="cred-score">
      <div className="cred-score-header">
        {icon && <span style={{ color }}>{icon}</span>}
        <span className="cred-score-label">{label}</span>
        <span className="cred-badge" style={{ color, borderColor: color + "44", background: color + "11" }}>
          {badge}
        </span>
      </div>
      <div className="cred-bar-wrap">
        <div className="cred-bar" style={{ width: `${score}%`, background: color }} />
      </div>
      <div className="cred-score-footer">
        <span className="cred-desc">{desc}</span>
        <span className="cred-number" style={{ color }}>{score}</span>
      </div>
    </div>
  );
}

function StarRating({ value }) {
  return (
    <div className="star-rating">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={12}
          fill={s <= value ? "#f9a825" : "none"}
          stroke={s <= value ? "#f9a825" : "#4B5563"}
        />
      ))}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(ts) {
  const diff = Date.now() - ts * 1000;
  if (diff < 60000)    return "just now";
  if (diff < 3600000)  return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function actionLabel(action) {
  return { posted: "Posted quest", claimed: "Claimed quest", completed: "Completed quest",
           cancelled: "Cancelled quest", settled: "Released payment" }[action] || action;
}

function actionColor(action) {
  return { posted: "#00ff9d", claimed: "#f9a825", completed: "#4fc3f7",
           cancelled: "#ef5350", settled: "#a78bfa" }[action] || "#888";
}