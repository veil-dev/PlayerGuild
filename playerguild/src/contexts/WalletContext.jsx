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
import { api, getToken, clearToken } from "../utils/api";

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

export const SUPPORTED_WALLETS = [
  {
    id: FREIGHTER_ID,
    name: "Freighter",
    description: "Official Stellar browser extension",
    installUrl: "https://www.freighter.app/",
    isDetected: () => typeof window !== "undefined" && (!!window.freighter || !!window.freighterApi || !!window.__freighter__),
  },
  {
    id: XBULL_ID,
    name: "xBull",
    description: "Feature-rich Stellar wallet",
    installUrl: "https://xbull.app/",
    isDetected: () => typeof window !== "undefined" && (!!window.xBullSDK || !!window.xbull || !!window.xBull || !!window._xBullSDK),
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
    isDetected: () => typeof window !== "undefined" && (!!window.lobstr || !!window.lobstrComet || !!window.LOBSTR),
  },
];

const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const [publicKey, setPublicKey]   = useState(null);
  const [walletId, setWalletId]     = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [profile, setProfile]       = useState(null);
  const [walletReady, setWalletReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("pg_wallet");
      if (saved) {
        const { publicKey: pk, walletId: wid } = JSON.parse(saved);
        if (pk && wid) {
          setPublicKey(pk);
          setWalletId(wid);
          if (getToken()) {
            api.getUser(pk).then(setProfile).catch(() => {});
          }
        }
      }
    } catch {}
    setWalletReady(true);
  }, []);

  const loginToBackend = useCallback(async (address, kit) => {
    try {
      const { challenge } = await api.getChallenge(address);
      let signature = "wallet-connected";
      try {
        const { signedTxXdr } = await kit.signTransaction(challenge, {
          address,
          networkPassphrase: "Test SDF Network ; September 2015",
        });
        signature = signedTxXdr;
      } catch {
        // The current backend accepts a placeholder signature for the hackathon demo.
      }
      await api.verify(address, challenge, signature);
      const userProfile = await api.getUser(address);
      setProfile(userProfile);
    } catch {
      // non-fatal — wallet still works for on-chain ops
    }
  }, []);

  const connect = useCallback(() => setPickerOpen(true), []);

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
      loginToBackend(address, kit);
      return address;
    } catch (err) {
      toast.error(err?.message ?? "Failed to connect wallet");
      throw err;
    } finally {
      setConnecting(false);
    }
  }, [loginToBackend]);

  const disconnect = useCallback(() => {
    setPublicKey(null);
    setWalletId(null);
    setProfile(null);
    _kit = null;
    clearToken();
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
      publicKey, walletId, connecting, profile, walletReady,
      pickerOpen, setPickerOpen,
      connect, connectWallet, disconnect, signAndSubmit,
    }}>
      {children}
    </WalletContext.Provider>
  );
}

export const useWallet = () => useContext(WalletContext);
