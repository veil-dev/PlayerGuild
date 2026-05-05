// src/utils/stellar.js
// Contract deployed on Stellar testnet
// https://stellar.expert/explorer/testnet/tx/a58c33e3a40ce91892968409d6fee8c2245f7a85dbf0e33211aaaba0b95a2b34

export const CONTRACT_ID = "CDIJG6MKABPATFQSGJDTN3WR7E7A6KFJNLSBWFME56IKINGV32D4L7EL";
export const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";
export const HORIZON_URL = "https://horizon-testnet.stellar.org";
export const SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org";
export const EXPLORER_URL = "https://stellar.expert/explorer/testnet";
export const LAB_URL = `https://lab.stellar.org/r/testnet/contract/${CONTRACT_ID}`;

// XLM stroops per unit (1 XLM = 10,000,000 stroops)
export const STROOPS_PER_XLM = 10_000_000;

export const toStroops = (xlm) => Math.floor(parseFloat(xlm) * STROOPS_PER_XLM);
export const fromStroops = (stroops) => (parseInt(stroops) / STROOPS_PER_XLM).toFixed(2);

export const shortenAddress = (addr) =>
  addr ? `${addr.slice(0, 4)}...${addr.slice(-4)}` : "";

export const questStatusMap = {
  0: "open",
  1: "claimed",
  2: "completed",
  3: "cancelled",
};

export const questStatusLabel = {
  open: "Open",
  claimed: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const questStatusColor = {
  open: "#00ff9d",
  claimed: "#f9a825",
  completed: "#4fc3f7",
  cancelled: "#ef5350",
};