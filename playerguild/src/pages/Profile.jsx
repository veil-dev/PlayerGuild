// src/pages/Profile.jsx
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  User, Star, Sword, Shield, Edit2, Check, X,
  MessageSquare, Trophy, Clock, ExternalLink,
  Phone, Camera,
} from "lucide-react";
import toast from "react-hot-toast";
import { useWallet } from "../contexts/WalletContext";
import { api } from "../utils/api";
import { shortenAddress, EXPLORER_URL } from "../utils/stellar";
import "./Profile.css";

export default function Profile() {
  const { wallet } = useParams();
  const navigate   = useNavigate();
  const { publicKey, walletReady } = useWallet();

  const targetWallet = wallet || publicKey;
  const isOwn        = targetWallet === publicKey;

  const [user,        setUser]        = useState(null);
  const [reviews,     setReviews]     = useState([]);
  const [activity,    setActivity]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [editing,     setEditing]     = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [avatarMode,  setAvatarMode]  = useState("url");
  const [form,        setForm]        = useState({
    username: "", bio: "", avatar_url: "", discord_handle: "",
    contact_number: "", facebook_url: "",
  });

  const [showRating,  setShowRating]  = useState(false);
  const [ratingForm,  setRatingForm]  = useState({ rating: 0, comment: "", role: "hunter" });
  const [hoveredStar, setHoveredStar] = useState(0);
  const [submittingRating, setSubmittingRating] = useState(false);

  const lastFetched = useRef(null);

  useEffect(() => {
    if (!walletReady) return;
    if (!targetWallet) return;
    if (lastFetched.current === targetWallet) return;
    lastFetched.current = targetWallet;
    setLoading(true);
    api.getUser(targetWallet)
      .then((u) => {
        setUser(u);
        setForm({
          username:       u.username       || "",
          bio:            u.bio            || "",
          avatar_url:     u.avatar_url     || "",
          discord_handle: u.discord_handle || "",
          contact_number: u.contact_number || "",
          facebook_url:   u.facebook_url   || "",
        });
        api.getReviews(targetWallet)
          .then((r) => setReviews(r.reviews || []))
          .catch((e) => console.warn("Reviews fetch failed:", e));
        api.getActivity(targetWallet)
          .then((a) => setActivity(a.activity || []))
          .catch((e) => console.warn("Activity fetch failed:", e));
      })
      .catch((e) => {
        console.error("Profile fetch failed:", e);
        toast.error(e.message || "Failed to load profile");
      })
      .finally(() => setLoading(false));
  }, [targetWallet, walletReady, navigate]);

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

  const handleAvatarFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setForm((f) => ({ ...f, avatar_url: ev.target.result }));
      setAvatarMode("preview");
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitRating = async () => {
    if (!ratingForm.rating) { toast.error("Please select a star rating"); return; }
    setSubmittingRating(true);
    try {
      await api.rateUser(targetWallet, ratingForm);
      toast.success("Rating submitted!");
      setShowRating(false);
      setRatingForm({ rating: 0, comment: "", role: "hunter" });
      api.getReviews(targetWallet)
        .then((r) => setReviews(r.reviews || []))
        .catch(() => {});
    } catch (e) {
      toast.error(e.message || "Failed to submit rating");
    } finally {
      setSubmittingRating(false);
    }
  };

  if (!walletReady) return (
    <div className="page profile-loading">
      <div className="profile-spinner" />
    </div>
  );

  if (!targetWallet) return (
    <div className="page" style={{ textAlign: "center", paddingTop: "4rem" }}>
      <p style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: 13 }}>
        Connect your wallet to view your profile.
      </p>
    </div>
  );

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

  const completedAsHunter = (user.quests_completed || 0);
  const completedAsGiver  = (user.quests_posted    || 0);
  const avgRating         = parseFloat(user.avg_rating) || 0;
  const reviewCount       = parseInt(user.review_count) || 0;

  const hunterScore = Math.min(100,
    Math.round((completedAsHunter * 40 + avgRating * 20) / Math.max(1, completedAsHunter * 40 + 100) * 100)
  );
  const employerScore = Math.min(100,
    Math.round((completedAsGiver * 20 + avgRating * 12) / Math.max(1, completedAsGiver * 20 + 60) * 100)
  );
  const overallScore = Math.round((hunterScore + employerScore) / 2);

  const scoreColor = (s) => s >= 80 ? "#00ff9d" : s >= 50 ? "#f9a825" : "#ef5350";
  const scoreLabel = (s) => s >= 80 ? "Excellent" : s >= 60 ? "Good" : s >= 40 ? "Fair" : "New";

  const displayAvatar = editing ? form.avatar_url : user.avatar_url;

  return (
    <div className="page">
      <div className="profile-layout">

        {/* ── Left column ── */}
        <div className="profile-left">

          {/* Avatar + identity */}
          <div className="profile-card profile-identity">
            <div className="profile-avatar-wrap">
              {displayAvatar ? (
                <img
                  src={displayAvatar}
                  alt="avatar"
                  className="profile-avatar"
                  onError={(e) => { e.target.style.display = "none"; }}
                />
              ) : (
                <div className="profile-avatar-placeholder">
                  <User size={36} />
                </div>
              )}
              {editing && (
                <label className="profile-avatar-upload" title="Upload photo">
                  <Camera size={14} />
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handleAvatarFile}
                  />
                </label>
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

                <div className="profile-avatar-row">
                  <input
                    className="profile-input"
                    placeholder="Avatar URL (or upload above)"
                    value={avatarMode === "preview" ? "" : form.avatar_url}
                    onChange={(e) => {
                      setAvatarMode("url");
                      setForm((f) => ({ ...f, avatar_url: e.target.value }));
                    }}
                    disabled={avatarMode === "preview"}
                  />
                  {avatarMode === "preview" && (
                    <button
                      className="profile-cancel-btn"
                      style={{ padding: "4px 8px", fontSize: 11 }}
                      onClick={() => { setAvatarMode("url"); setForm((f) => ({ ...f, avatar_url: "" })); }}
                    >
                      <X size={11} /> Clear
                    </button>
                  )}
                </div>

                <input
                  className="profile-input"
                  placeholder="Discord handle (e.g. user#1234)"
                  value={form.discord_handle}
                  onChange={(e) => setForm((f) => ({ ...f, discord_handle: e.target.value }))}
                />
                <input
                  className="profile-input profile-input-icon"
                  placeholder="Contact number"
                  value={form.contact_number}
                  onChange={(e) => setForm((f) => ({ ...f, contact_number: e.target.value }))}
                  maxLength={20}
                />
                <input
                  className="profile-input profile-input-icon"
                  placeholder="Facebook URL or username"
                  value={form.facebook_url}
                  onChange={(e) => setForm((f) => ({ ...f, facebook_url: e.target.value }))}
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

                <div className="profile-socials">
                  {user.discord_handle && (
                    <div className="profile-social-row">
                      <MessageSquare size={12} />
                      <span>{user.discord_handle}</span>
                    </div>
                  )}
                  {user.contact_number && (
                    <div className="profile-social-row">
                      <Phone size={12} />
                      <span>{user.contact_number}</span>
                    </div>
                  )}
                  {user.facebook_url && (
                    <div className="profile-social-row">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                      <a
                        href={user.facebook_url.startsWith("http") ? user.facebook_url : `https://facebook.com/${user.facebook_url}`}
                        target="_blank"
                        rel="noreferrer"
                        className="profile-social-link"
                      >
                        {user.facebook_url.replace(/^https?:\/\/(www\.)?facebook\.com\//, "")}
                      </a>
                    </div>
                  )}
                </div>

                <a
                  href={`${EXPLORER_URL}/account/${targetWallet}`}
                  target="_blank"
                  rel="noreferrer"
                  className="profile-wallet-link"
                >
                  <ExternalLink size={11} />
                  {shortenAddress(targetWallet)}
                </a>

                <div className="profile-action-row">
                  {isOwn ? (
                    <button className="profile-edit-btn" onClick={() => setEditing(true)}>
                      <Edit2 size={13} /> Edit Profile
                    </button>
                  ) : publicKey && (
                    <button className="profile-rate-btn" onClick={() => setShowRating(true)}>
                      <Star size={13} /> Rate User
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Stats */}
          <div className="profile-card">
            <div className="profile-card-title">Stats</div>
            <div className="profile-stats">
              <StatRow icon={<Sword size={13} />}         label="Quests Posted"    value={user.quests_posted    || 0} />
              <StatRow icon={<Shield size={13} />}        label="Quests Claimed"   value={user.quests_claimed   || 0} />
              <StatRow icon={<Trophy size={13} />}        label="Quests Completed" value={user.quests_completed || 0} />
              <StatRow icon={<Star size={13} />}          label="Avg Rating"       value={avgRating ? `${avgRating} / 5` : "—"} />
              <StatRow icon={<MessageSquare size={13} />} label="Reviews"          value={reviewCount} />
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
                            : r.quest_id > 0 ? `Quest #${r.quest_id}` : "Direct rating"}
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

      {/* ── Rating Modal ── */}
      {showRating && (
        <div className="rating-overlay" onClick={() => setShowRating(false)}>
          <div className="rating-modal" onClick={(e) => e.stopPropagation()}>
            <div className="rating-modal-header">
              <span>Rate {user.username || shortenAddress(targetWallet)}</span>
              <button className="rating-close" onClick={() => setShowRating(false)}><X size={16} /></button>
            </div>

            <div className="rating-modal-body">
              <div className="rating-field">
                <label className="rating-label">You are rating them as</label>
                <div className="rating-role-row">
                  <button
                    className={`rating-role-btn ${ratingForm.role === "hunter" ? "active" : ""}`}
                    onClick={() => setRatingForm((f) => ({ ...f, role: "hunter" }))}
                  >
                    🛡 Hunter
                  </button>
                  <button
                    className={`rating-role-btn ${ratingForm.role === "giver" ? "active" : ""}`}
                    onClick={() => setRatingForm((f) => ({ ...f, role: "giver" }))}
                  >
                    ⚔ Employer
                  </button>
                </div>
              </div>

              <div className="rating-field">
                <label className="rating-label">Rating</label>
                <div className="rating-stars">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      size={28}
                      className="rating-star"
                      fill={(hoveredStar || ratingForm.rating) >= s ? "#f9a825" : "none"}
                      stroke={(hoveredStar || ratingForm.rating) >= s ? "#f9a825" : "#4B5563"}
                      onMouseEnter={() => setHoveredStar(s)}
                      onMouseLeave={() => setHoveredStar(0)}
                      onClick={() => setRatingForm((f) => ({ ...f, rating: s }))}
                    />
                  ))}
                  <span className="rating-star-label">
                    {["", "Poor", "Fair", "Good", "Great", "Excellent"][hoveredStar || ratingForm.rating] || ""}
                  </span>
                </div>
              </div>

              <div className="rating-field">
                <label className="rating-label">Comment (optional)</label>
                <textarea
                  className="profile-input"
                  placeholder="Share your experience working with this person..."
                  value={ratingForm.comment}
                  onChange={(e) => setRatingForm((f) => ({ ...f, comment: e.target.value }))}
                  rows={3}
                  maxLength={300}
                />
              </div>

              <button
                className="profile-save-btn"
                style={{ width: "100%", justifyContent: "center" }}
                onClick={handleSubmitRating}
                disabled={submittingRating || !ratingForm.rating}
              >
                <Star size={14} /> {submittingRating ? "Submitting..." : "Submit Rating"}
              </button>
            </div>
          </div>
        </div>
      )}
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