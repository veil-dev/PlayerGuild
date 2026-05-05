import { Link, useLocation } from "react-router-dom";
import { Sword, Shield, ScrollText, Wallet, ExternalLink } from "lucide-react";
import { useWallet } from "../contexts/WalletContext";
import { shortenAddress, LAB_URL } from "../utils/stellar";
import "./Navbar.css";

export default function Navbar() {
  const { publicKey, connecting, connect, disconnect } = useWallet();
  const { pathname } = useLocation();

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        {/* Logo */}
        <Link to="/" className="navbar-logo">
          <Sword size={18} className="logo-icon" />
          <span className="logo-text">PLAYER<span className="logo-accent">GUILD</span></span>
        </Link>

        {/* Nav links */}
        <div className="navbar-links">
          <NavLink to="/" active={pathname === "/"} icon={<ScrollText size={14} />} label="Quest Board" />
          <NavLink to="/post" active={pathname === "/post"} icon={<Sword size={14} />} label="Post Quest" />
          <NavLink to="/my-quests" active={pathname === "/my-quests"} icon={<Shield size={14} />} label="My Quests" />
          <a
            href={LAB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="nav-link nav-external"
            title="View on Stellar Lab"
          >
            <ExternalLink size={14} />
            <span>Contract</span>
          </a>
        </div>

        {/* Wallet button */}
        <div className="navbar-wallet">
          {publicKey ? (
            <div className="wallet-connected">
              <span className="wallet-dot" />
              <span className="wallet-addr">{shortenAddress(publicKey)}</span>
              <button className="btn-disconnect" onClick={disconnect}>Disconnect</button>
            </div>
          ) : (
            <button className="btn-connect" onClick={connect} disabled={connecting}>
              <Wallet size={14} />
              {connecting ? "Connecting..." : "Connect Wallet"}
            </button>
          )}
        </div>
      </div>

      {/* Testnet banner */}
      <div className="testnet-bar">
        <span className="testnet-dot" />
        STELLAR TESTNET
        <span className="testnet-sep">·</span>
        CONTRACT:{" "}
        <a href={LAB_URL} target="_blank" rel="noopener noreferrer" className="testnet-link">
          CDIJG6...4L7EL
        </a>
      </div>
    </nav>
  );
}

function NavLink({ to, active, icon, label }) {
  return (
    <Link to={to} className={`nav-link ${active ? "nav-link--active" : ""}`}>
      {icon}
      <span>{label}</span>
    </Link>
  );
}