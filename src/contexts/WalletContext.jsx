import { createContext, useContext, useState, useCallback, useEffect } from "react";
import toast from "react-hot-toast";
import {
  StellarWalletsKit,
  WalletNetwork,
  FREIGHTER_ID,
  XBULL_ID,
  ALBEDO_ID,
  LOBSTR_ID,
  FreighterModule,
  xBullModule,
  AlbedoModule,
  LobstrModule,
} from "@creit.tech/stellar-wallets-kit";
import { shortenAddress } from "../utils/stellar";

// ─── Kit singleton ────────────────────────────────────────────────────────────
let _kit = null;
function getKit(walletId) {
  if (!_kit) {
    _kit = new StellarWalletsKit({
      network: WalletNetwork.TESTNET,
      selectedWalletId: walletId ?? FREIGHTER_ID,
      modules: [
        new FreighterModule(),
        new xBullModule(),
        new AlbedoModule(),
        new LobstrModule(),
      ],
    });
  }
  return _kit;
}

// ─── Wallet metadata (used by the picker UI) ──────────────────────────────────
export const SUPPORTED_WALLETS = [
  {
    id: FREIGHTER_ID,
    name: "Freighter",
    description: "Official Stellar browser extension",
    installUrl: "https://www.freighter.app/",
    isDetected: () => typeof window !== "undefined" && !!window.freighter,
  },
  {
    id: XBULL_ID,
    name: "xBull",
    description: "Feature-rich Stellar wallet",
    installUrl: "https://xbull.app/",
    isDetected: () => typeof window !== "undefined" && !!window.xBullSDK,
  },
  {
    id: ALBEDO_ID,
    name: "Albedo",
    description: "Web-based signer — no install needed",
    installUrl: null,
    isDetected: () => true,
  },
  {
    id: LOBSTR_ID,
    name: "LOBSTR",
    description: "Popular Stellar mobile wallet",
    installUrl: "https://lobstr.co/",
    isDetected: () => typeof window !== "undefined" && !!window.lobstr,
  },
];

// ─── Context ──────────────────────────────────────────────────────────────────
const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const [publicKey, setPublicKey] = useState(null);
  const [walletId, setWalletId] = useState(null);
  const [connecting, setConnecting] = useState(false);
  // When true, the wallet picker modal should be shown by whatever UI consumes this context
  const [pickerOpen, setPickerOpen] = useState(false);

  // Restore persisted session on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("pg_wallet");
      if (saved) {
        const { publicKey: pk, walletId: wid } = JSON.parse(saved);
        if (pk && wid) {
          setPublicKey(pk);
          setWalletId(wid);
        }
      }
    } catch {}
  }, []);

  // Called by the picker modal when the user selects a wallet
  const connectWallet = useCallback(async (selectedWalletId) => {
    setConnecting(true);
    try {
      const kit = getKit(selectedWalletId);
      await kit.setWallet(selectedWalletId);
      const { address } = await kit.getAddress();
      setPublicKey(address);
      setWalletId(selectedWalletId);
      setPickerOpen(false);
      localStorage.setItem("pg_wallet", JSON.stringify({ publicKey: address, walletId: selectedWalletId }));
      toast.success(`Connected: ${shortenAddress(address)}`);
      return address;
    } catch (err) {
      const msg = err?.message ?? "Failed to connect wallet";
      toast.error(msg);
      throw err;
    } finally {
      setConnecting(false);
    }
  }, []);

  // connect() is what the rest of the app calls — it just opens the picker
  const connect = useCallback(() => {
    setPickerOpen(true);
  }, []);

  const disconnect = useCallback(() => {
    setPublicKey(null);
    setWalletId(null);
    _kit = null; // reset singleton so next connect starts fresh
    localStorage.removeItem("pg_wallet");
    toast("Wallet disconnected", { icon: "👋" });
  }, []);

  const signAndSubmit = useCallback(async (xdr) => {
    if (!publicKey) throw new Error("Wallet not connected");
    const kit = getKit(walletId);
    const { signedTxXdr } = await kit.signTransaction(xdr, {
      address: publicKey,
      networkPassphrase: "Test SDF Network ; September 2015",
    });
    return signedTxXdr;
  }, [publicKey, walletId]);

  return (
    <WalletContext.Provider value={{
      publicKey,
      walletId,
      connecting,
      pickerOpen,
      setPickerOpen,
      connect,
      connectWallet,
      disconnect,
      signAndSubmit,
    }}>
      {children}
    </WalletContext.Provider>
  );
}

export const useWallet = () => useContext(WalletContext);