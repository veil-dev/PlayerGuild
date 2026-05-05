import { useState } from "react";
import { useWallet, SUPPORTED_WALLETS } from "../contexts/WalletContext";

// ─── Icons ────────────────────────────────────────────────────────────────────
const ICONS = {
  freighter: (
    <svg viewBox="0 0 36 36" fill="none" width="28" height="28">
      <rect width="36" height="36" rx="9" fill="#5B4FCF" />
      <path d="M9 18h18M18 9l9 9-9 9" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  xbull: (
    <svg viewBox="0 0 36 36" fill="none" width="28" height="28">
      <rect width="36" height="36" rx="9" fill="#E8A020" />
      <path d="M11 25L18 11l7 14" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 21h10" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  ),
  albedo: (
    <svg viewBox="0 0 36 36" fill="none" width="28" height="28">
      <rect width="36" height="36" rx="9" fill="#0EA5E9" />
      <circle cx="18" cy="18" r="7" stroke="#fff" strokeWidth="2.2" />
      <circle cx="18" cy="18" r="2.5" fill="#fff" />
    </svg>
  ),
  lobstr: (
    <svg viewBox="0 0 36 36" fill="none" width="28" height="28">
      <rect width="36" height="36" rx="9" fill="#1A1A2E" />
      <path d="M18 9c-5 0-9 4-9 9s4 9 9 9 9-4 9-9" stroke="#A855F7" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M18 13v5l3.5 2" stroke="#A855F7" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

function walletIcon(id) {
  if (id.includes("freighter")) return ICONS.freighter;
  if (id.includes("xbull"))     return ICONS.xbull;
  if (id.includes("albedo"))    return ICONS.albedo;
  if (id.includes("lobstr"))    return ICONS.lobstr;
  return null;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function WalletPicker() {
  const { pickerOpen, setPickerOpen, connectWallet, connecting } = useWallet();
  const [loadingId, setLoadingId] = useState(null);

  if (!pickerOpen) return null;

  async function handleSelect(wallet) {
    setLoadingId(wallet.id);
    try {
      await connectWallet(wallet.id);
    } catch {
      // toast already shown by context
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div style={overlay} onClick={(e) => { if (e.target === e.currentTarget) setPickerOpen(false); }}>
      <div style={modal}>

        {/* Header */}
        <div style={header}>
          <div>
            <p style={title}>Connect Wallet</p>
            <p style={subtitle}>Select a Stellar wallet to continue</p>
          </div>
          <button style={closeBtn} onClick={() => setPickerOpen(false)}>✕</button>
        </div>

        {/* Network pill */}
        <div style={networkPill}>
          <span style={dot} />
          Stellar Testnet
        </div>

        {/* Wallet rows */}
        <div style={list}>
          {SUPPORTED_WALLETS.map((wallet) => {
            const detected = wallet.isDetected();
            const loading  = loadingId === wallet.id;

            return (
              <button
                key={wallet.id}
                style={{ ...row, ...(loading ? rowActive : {}) }}
                onClick={() => handleSelect(wallet)}
                disabled={!!connecting}
              >
                <span style={iconWrap}>{walletIcon(wallet.id)}</span>

                <span style={info}>
                  <span style={walletName}>{wallet.name}</span>
                  <span style={walletDesc}>{wallet.description}</span>
                </span>

                <span style={badge}>
                  {loading ? (
                    <span style={spinner} />
                  ) : detected ? (
                    <span style={detectedBadge}>Detected</span>
                  ) : wallet.installUrl ? (
                    <a
                      href={wallet.installUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={installLink}
                      onClick={(e) => e.stopPropagation()}
                    >
                      Install ↗
                    </a>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>

        <p style={footer}>
          New to Stellar?{" "}
          <a href="https://www.stellar.org/learn/stellar-basics" target="_blank" rel="noreferrer" style={learnLink}>
            Learn the basics ↗
          </a>
        </p>
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const overlay = {
  position: "fixed", inset: 0,
  background: "rgba(0,0,0,0.72)",
  backdropFilter: "blur(6px)",
  display: "flex", alignItems: "center", justifyContent: "center",
  zIndex: 9999,
};
const modal = {
  background: "#0F0A1E",
  border: "1px solid rgba(124,58,237,0.22)",
  borderRadius: 16,
  padding: 24,
  width: "100%", maxWidth: 400,
  boxShadow: "0 24px 80px rgba(124,58,237,0.18)",
};
const header = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 };
const title  = { margin: 0, fontSize: 17, fontWeight: 700, color: "#F3F0FF" };
const subtitle = { margin: "4px 0 0", fontSize: 13, color: "#6B7280" };
const closeBtn = { background: "none", border: "none", color: "#6B7280", fontSize: 16, cursor: "pointer", padding: 4, lineHeight: 1 };
const networkPill = {
  display: "inline-flex", alignItems: "center", gap: 6,
  background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.22)",
  borderRadius: 20, padding: "3px 10px",
  fontSize: 11, color: "#6EE7B7", fontWeight: 600,
  marginBottom: 16, letterSpacing: "0.04em",
};
const dot = { width: 6, height: 6, borderRadius: "50%", background: "#10B981", boxShadow: "0 0 6px #10B981" };
const list = { display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 };
const row = {
  display: "flex", alignItems: "center", gap: 12,
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 12, padding: "11px 13px",
  cursor: "pointer", textAlign: "left",
  transition: "border-color 0.15s, background 0.15s",
  width: "100%",
};
const rowActive = { borderColor: "rgba(124,58,237,0.5)", background: "rgba(124,58,237,0.08)" };
const iconWrap = { flexShrink: 0 };
const info  = { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 };
const walletName = { fontSize: 14, fontWeight: 600, color: "#F3F0FF" };
const walletDesc = { fontSize: 12, color: "#6B7280" };
const badge = { flexShrink: 0 };
const detectedBadge = {
  fontSize: 11, color: "#6EE7B7",
  background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)",
  borderRadius: 20, padding: "2px 8px", fontWeight: 600,
};
const installLink = { fontSize: 11, color: "#A78BFA", textDecoration: "none", fontWeight: 600 };
const spinner = {
  display: "inline-block", width: 15, height: 15,
  border: "2px solid rgba(124,58,237,0.3)",
  borderTopColor: "#7C3AED", borderRadius: "50%",
  animation: "spin 0.7s linear infinite",
};
const footer = { fontSize: 12, color: "#4B5563", textAlign: "center", margin: 0, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.05)" };
const learnLink = { color: "#7C3AED", textDecoration: "none" };