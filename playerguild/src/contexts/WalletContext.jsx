import { createContext, useContext, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { shortenAddress } from "../utils/stellar";

const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const [publicKey, setPublicKey] = useState(null);
  const [connecting, setConnecting] = useState(false);

  const connect = useCallback(async () => {
    setConnecting(true);
    try {
      if (window.freighter) {
        await window.freighter.requestAccess();
        const { publicKey: pk } = await window.freighter.getPublicKey();
        setPublicKey(pk);
        toast.success(`Connected: ${shortenAddress(pk)}`);
      } else {
        const mockKey = "GDEMO" + Math.random().toString(36).slice(2, 50).toUpperCase();
        setPublicKey(mockKey);
        toast.success("Demo wallet connected");
      }
    } catch (err) {
      toast.error("Failed to connect wallet");
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setPublicKey(null);
    toast("Wallet disconnected", { icon: "👋" });
  }, []);

  const signAndSubmit = useCallback(async (xdr) => {
    if (!publicKey) throw new Error("Wallet not connected");
    if (window.freighter) {
      const { signedXDR } = await window.freighter.signTransaction(xdr, { network: "TESTNET" });
      return signedXDR;
    }
    return xdr;
  }, [publicKey]);

  return (
    <WalletContext.Provider value={{ publicKey, connecting, connect, disconnect, signAndSubmit }}>
      {children}
    </WalletContext.Provider>
  );
}

export const useWallet = () => useContext(WalletContext);