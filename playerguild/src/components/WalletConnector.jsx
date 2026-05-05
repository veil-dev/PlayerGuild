import { useState, useEffect, useCallback } from "react";
import {
  StellarWalletsKit,
  WalletNetwork,
  WalletType,
  FREIGHTER_ID,
  XBULL_ID,
  ALBEDO_ID,
  LOBSTR_ID,
  FreighterModule,
  xBullModule,
  AlbedoModule,
  LobstrModule,
  WalletConnectModule,
} from "@creit.tech/stellar-wallets-kit";

// ─── Kit singleton ────────────────────────────────────────────────────────────
let kit = null;

function getKit() {
  if (!kit) {
    kit = new StellarWalletsKit({
      network: WalletNetwork.TESTNET,
      selectedWalletId: FREIGHTER_ID,
      modules: [
        new FreighterModule(),
        new xBullModule(),
        new AlbedoModule(),
        new LobstrModule(),
        new WalletConnectModule({
          projectId: "cloud.walletconnect.com ", 
          name: "PlayerGuild",
          description: "Blockchain quest board for gamers on Stellar",
          url: "https://playerguild.app",
          icons: [],
          method: undefined,
          network: WalletNetwork.TESTNET,
        }),
      ],
    });
  }
  return kit;
}

// ─── Wallet metadata ──────────────────────────────────────────────────────────
const WALLETS = [
  {
    id: FREIGHTER_ID,
    name: "Freighter",
    description: "Official Stellar browser wallet",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" width="32" height="32">
        <rect width="40" height="40" rx="10" fill="#5B4FCF" />
        <path d="M10 20h20M20 10l10 10-10 10" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    installUrl: "https://www.freighter.app/",
    checkInstalled: () => typeof window !== "undefined" && !!window.freighter,
  },
  {
    id: XBULL_ID,
    name: "xBull",
    description: "Feature-rich Stellar wallet",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" width="32" height="32">
        <rect width="40" height="40" rx="10" fill="#E8A020" />
        <path d="M12 28L20 12l8 16" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14.5 23h11" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    ),
    installUrl: "https://xbull.app/",
    checkInstalled: () => typeof window !== "undefined" && !!window.xBullSDK,
  },
  {
    id: ALBEDO_ID,
    name: "Albedo",
    description: "No-install web signer",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" width="32" height="32">
        <rect width="40" height="40" rx="10" fill="#0EA5E9" />
        <circle cx="20" cy="20" r="8" stroke="#fff" strokeWidth="2.5" />
        <circle cx="20" cy="20" r="3" fill="#fff" />
      </svg>
    ),
    installUrl: null, // web-based, no install needed
    checkInstalled: () => true,
  },
  {
    id: LOBSTR_ID,
    name: "LOBSTR",
    description: "Popular Stellar mobile wallet",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" width="32" height="32">
        <rect width="40" height="40" rx="10" fill="#1A1A2E" />
        <path d="M20 10c-5.5 0-10 4.5-10 10s4.5 10 10 10 10-4.5 10-10" stroke="#A855F7" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M20 15v5l4 2" stroke="#A855F7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    installUrl: "https://lobstr.co/",
    checkInstalled: () => typeof window !== "undefined" && !!window.lobstr,
  },
  {
    id: "walletconnect",
    name: "WalletConnect",
    description: "Connect any WC-compatible wallet",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" width="32" height="32">
        <rect width="40" height="40" rx="10" fill="#3B99FC" />
        <path d="M13 17.5c3.9-3.8 10.2-3.8 14.1 0l.5.4a.5.5 0 010 .7l-1.6 1.6a.3.3 0 01-.4 0l-.6-.6c-2.7-2.6-7.1-2.6-9.8 0l-.7.7a.3.3 0 01-.4 0l-1.6-1.6a.5.5 0 010-.7l.5-.5zm17.4 3.3l1.4 1.4a.5.5 0 010 .7l-6.4 6.2a.5.5 0 01-.7 0l-4.5-4.4a.2.2 0 00-.3 0l-4.5 4.4a.5.5 0 01-.7 0l-6.4-6.2a.5.5 0 010-.7l1.4-1.4a.5.5 0 01.7 0l4.5 4.4a.2.2 0 00.3 0l4.5-4.4a.5.5 0 01.7 0l4.5 4.4a.2.2 0 00.3 0l4.5-4.4a.5.5 0 01.7 0z" fill="#fff" />
      </svg>
    ),
    installUrl: "https://walletconnect.com/",
    checkInstalled: () => true,
  },
];

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useWallet() {
  const [address, setAddress] = useState(null);
  const [walletId, setWalletId] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);

  // Restore session on mount
  useEffect(() => {
    const saved = localStorage.getItem("pg_wallet");
    if (saved) {
      try {
        const { address: a, walletId: w } = JSON.parse(saved);
        setAddress(a);
        setWalletId(w);
      } catch {}
    }
  }, []);

  const connect = useCallback(async (selectedWalletId) => {
    setConnecting(true);
    setError(null);
    try {
      const k = getKit();
      await k.setWallet(selectedWalletId);
      const { address: addr } = await k.getAddress();
      setAddress(addr);
      setWalletId(selectedWalletId);
      localStorage.setItem("pg_wallet", JSON.stringify({ address: addr, walletId: selectedWalletId }));
      return addr;
    } catch (err) {
      const msg = err?.message || "Connection failed";
      setError(msg);
      throw err;
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setWalletId(null);
    setError(null);
    localStorage.removeItem("pg_wallet");
    kit = null; // reset singleton so next connect is fresh
  }, []);

  const signTransaction = useCallback(async (xdr) => {
    if (!address) throw new Error("Not connected");
    const k = getKit();
    const { signedTxXdr } = await k.signTransaction(xdr, {
      address,
      networkPassphrase: "Test SDF Network ; September 2015",
    });
    return signedTxXdr;
  }, [address]);

  return { address, walletId, connecting, error, connect, disconnect, signTransaction };
}

// ─── Truncate address helper ──────────────────────────────────────────────────
function truncate(addr) {
  if (!addr) return "";
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function WalletModal({ onClose, onConnect, connecting, error }) {
  const [selected, setSelected] = useState(null);

  async function handleSelect(wallet) {
    setSelected(wallet.id);
    try {
      await onConnect(wallet.id);
      onClose();
    } catch {}
  }

  return (
    <div style={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.modalHeader}>
          <div>
            <div style={styles.modalTitle}>Connect Wallet</div>
            <div style={styles.modalSub}>Choose your Stellar wallet to continue</div>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Network badge */}
        <div style={styles.networkBadge}>
          <span style={styles.networkDot} />
          Stellar Testnet
        </div>

        {/* Wallet list */}
        <div style={styles.walletList}>
          {WALLETS.map((wallet) => {
            const installed = wallet.checkInstalled();
            const isLoading = connecting && selected === wallet.id;

            return (
              <button
                key={wallet.id}
                style={{
                  ...styles.walletRow,
                  ...(isLoading ? styles.walletRowLoading : {}),
                }}
                onClick={() => handleSelect(wallet)}
                disabled={connecting}
              >
                <div style={styles.walletIcon}>{wallet.icon}</div>
                <div style={styles.walletInfo}>
                  <div style={styles.walletName}>{wallet.name}</div>
                  <div style={styles.walletDesc}>{wallet.description}</div>
                </div>
                <div style={styles.walletStatus}>
                  {isLoading ? (
                    <div style={styles.spinner} />
                  ) : installed ? (
                    <span style={styles.detectedBadge}>Detected</span>
                  ) : wallet.installUrl ? (
                    <a
                      href={wallet.installUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={styles.installLink}
                      onClick={(e) => e.stopPropagation()}
                    >
                      Install ↗
                    </a>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>

        {/* Error */}
        {error && <div style={styles.errorBox}>⚠ {error}</div>}

        <div style={styles.modalFooter}>
          New to Stellar?{" "}
          <a href="https://www.stellar.org/learn/stellar-basics" target="_blank" rel="noreferrer" style={styles.learnLink}>
            Learn the basics ↗
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function WalletConnector() {
  const { address, walletId, connecting, error, connect, disconnect } = useWallet();
  const [showModal, setShowModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const connectedWallet = WALLETS.find((w) => w.id === walletId);

  if (address) {
    return (
      <div style={styles.connectedWrapper}>
        <button
          style={styles.connectedBtn}
          onClick={() => setShowMenu((v) => !v)}
        >
          {connectedWallet && <span style={{ marginRight: 8 }}>{connectedWallet.icon}</span>}
          <span style={styles.connectedAddress}>{truncate(address)}</span>
          <span style={styles.chevron}>{showMenu ? "▲" : "▼"}</span>
        </button>

        {showMenu && (
          <div style={styles.menu}>
            <div style={styles.menuAddress}>
              <div style={styles.menuAddressLabel}>Connected as</div>
              <div style={styles.menuAddressFull}>{address}</div>
              <button
                style={styles.copyBtn}
                onClick={() => { navigator.clipboard.writeText(address); setShowMenu(false); }}
              >
                Copy address
              </button>
            </div>
            <button style={styles.disconnectBtn} onClick={() => { disconnect(); setShowMenu(false); }}>
              Disconnect
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <button style={styles.connectBtn} onClick={() => setShowModal(true)} disabled={connecting}>
        {connecting ? "Connecting…" : "Connect Wallet"}
      </button>

      {showModal && (
        <WalletModal
          onClose={() => setShowModal(false)}
          onConnect={connect}
          connecting={connecting}
          error={error}
        />
      )}
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = {
  connectBtn: {
    background: "linear-gradient(135deg, #7C3AED, #4F46E5)",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    padding: "10px 20px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    letterSpacing: "0.02em",
    transition: "opacity 0.15s",
  },
  connectedWrapper: { position: "relative" },
  connectedBtn: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    background: "rgba(124,58,237,0.12)",
    border: "1px solid rgba(124,58,237,0.4)",
    borderRadius: "10px",
    padding: "8px 14px",
    color: "#C4B5FD",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
  },
  connectedAddress: { fontFamily: "monospace" },
  chevron: { marginLeft: 6, fontSize: 10, opacity: 0.7 },
  menu: {
    position: "absolute",
    top: "calc(100% + 8px)",
    right: 0,
    background: "#1A1033",
    border: "1px solid rgba(124,58,237,0.3)",
    borderRadius: 12,
    padding: 12,
    minWidth: 280,
    zIndex: 1000,
    boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
  },
  menuAddress: { marginBottom: 10 },
  menuAddressLabel: { fontSize: 11, color: "#6B7280", marginBottom: 4 },
  menuAddressFull: {
    fontFamily: "monospace",
    fontSize: 11,
    color: "#A78BFA",
    wordBreak: "break-all",
    marginBottom: 8,
  },
  copyBtn: {
    background: "rgba(124,58,237,0.15)",
    border: "1px solid rgba(124,58,237,0.3)",
    borderRadius: 6,
    color: "#C4B5FD",
    fontSize: 12,
    padding: "4px 10px",
    cursor: "pointer",
    width: "100%",
  },
  disconnectBtn: {
    background: "rgba(239,68,68,0.1)",
    border: "1px solid rgba(239,68,68,0.3)",
    borderRadius: 8,
    color: "#FCA5A5",
    fontSize: 13,
    padding: "8px 12px",
    cursor: "pointer",
    width: "100%",
    fontWeight: 600,
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.7)",
    backdropFilter: "blur(6px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  modal: {
    background: "#0F0A1E",
    border: "1px solid rgba(124,58,237,0.25)",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 420,
    boxShadow: "0 24px 80px rgba(124,58,237,0.2)",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: 700, color: "#F3F0FF", marginBottom: 4 },
  modalSub: { fontSize: 13, color: "#6B7280" },
  closeBtn: {
    background: "none",
    border: "none",
    color: "#6B7280",
    fontSize: 16,
    cursor: "pointer",
    padding: 4,
    lineHeight: 1,
  },
  networkBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    background: "rgba(16,185,129,0.1)",
    border: "1px solid rgba(16,185,129,0.25)",
    borderRadius: 20,
    padding: "4px 10px",
    fontSize: 11,
    color: "#6EE7B7",
    fontWeight: 600,
    marginBottom: 16,
    letterSpacing: "0.04em",
  },
  networkDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "#10B981",
    boxShadow: "0 0 6px #10B981",
  },
  walletList: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 },
  walletRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 12,
    padding: "12px 14px",
    cursor: "pointer",
    textAlign: "left",
    transition: "border-color 0.15s, background 0.15s",
    width: "100%",
  },
  walletRowLoading: {
    borderColor: "rgba(124,58,237,0.5)",
    background: "rgba(124,58,237,0.08)",
  },
  walletIcon: { flexShrink: 0 },
  walletInfo: { flex: 1, minWidth: 0 },
  walletName: { fontSize: 14, fontWeight: 600, color: "#F3F0FF", marginBottom: 2 },
  walletDesc: { fontSize: 12, color: "#6B7280" },
  walletStatus: { flexShrink: 0 },
  detectedBadge: {
    fontSize: 11,
    color: "#6EE7B7",
    background: "rgba(16,185,129,0.1)",
    border: "1px solid rgba(16,185,129,0.2)",
    borderRadius: 20,
    padding: "2px 8px",
    fontWeight: 600,
  },
  installLink: {
    fontSize: 11,
    color: "#A78BFA",
    textDecoration: "none",
    fontWeight: 600,
  },
  spinner: {
    width: 16,
    height: 16,
    border: "2px solid rgba(124,58,237,0.3)",
    borderTopColor: "#7C3AED",
    borderRadius: "50%",
    animation: "spin 0.7s linear infinite",
  },
  errorBox: {
    background: "rgba(239,68,68,0.1)",
    border: "1px solid rgba(239,68,68,0.25)",
    borderRadius: 8,
    color: "#FCA5A5",
    fontSize: 13,
    padding: "10px 14px",
    marginBottom: 12,
  },
  modalFooter: {
    fontSize: 12,
    color: "#4B5563",
    textAlign: "center",
    paddingTop: 8,
    borderTop: "1px solid rgba(255,255,255,0.05)",
  },
  learnLink: { color: "#7C3AED", textDecoration: "none" },
};