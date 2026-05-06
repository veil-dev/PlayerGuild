export const CONTRACT_ID = "CDIJG6MKABPATFQSGJDTN3WR7E7A6KFJNLSBWFME56IKINGV32D4L7EL";
export const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";
export const HORIZON_URL = "https://horizon-testnet.stellar.org";
export const SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org";
export const EXPLORER_URL = "https://stellar.expert/explorer/testnet";
export const LAB_URL = `https://lab.stellar.org/r/testnet/contract/${CONTRACT_ID}`;
export const STROOPS_PER_XLM = 10_000_000;
export const toStroops = (xlm) => Math.floor(parseFloat(xlm) * STROOPS_PER_XLM);
export const fromStroops = (stroops) => (parseInt(stroops) / STROOPS_PER_XLM).toFixed(2);
export const shortenAddress = (addr) => addr ? `${addr.slice(0, 4)}...${addr.slice(-4)}` : "";
export const questStatusMap = { 0: "open", 1: "claimed", 2: "completed", 3: "cancelled" };
export const questStatusLabel = { open: "Open", claimed: "In Progress", completed: "Completed", cancelled: "Cancelled" };
export const questStatusColor = { open: "#00ff9d", claimed: "#f9a825", completed: "#4fc3f7", cancelled: "#ef5350" };

// ─── Token config ─────────────────────────────────────────────────────────────
export const TOKENS = {
  XLM: {
    id:       "XLM",
    label:    "XLM",
    name:     "Stellar Lumens",
    decimals: 7,
    contract: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
    icon:     "⭐",
  },
  USDC: {
    id:       "USDC",
    label:    "USDC",
    name:     "USD Coin",
    decimals: 7,
    contract: "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA",
    icon:     "💵",
  },
};

export const TOKEN_LIST = Object.values(TOKENS);

/** Human-readable amount → base units */
export const toBaseUnits = (amount, tokenId = "XLM") => {
  const { decimals } = TOKENS[tokenId] ?? TOKENS.XLM;
  return Math.round(parseFloat(amount) * 10 ** decimals);
};

/** Base units → human-readable string */
export const fromBaseUnits = (amount, tokenId = "XLM") => {
  const { decimals } = TOKENS[tokenId] ?? TOKENS.XLM;
  return (Number(amount) / 10 ** decimals).toFixed(2);
};

/** Format reward for display e.g. "⭐ 5.00 XLM" */
export const formatReward = (amount, tokenId = "XLM") => {
  const token = TOKENS[tokenId] ?? TOKENS.XLM;
  return `${token.icon} ${fromBaseUnits(amount, tokenId)} ${token.label}`;
};