// src/components/StatsBar.jsx
import { useEffect, useState } from "react";
import { Coins, Shield, Sword, CheckCircle } from "lucide-react";
import "./StatsBar.css";

const PRICE_ENDPOINTS = {
  stellarOrderBook:
    "https://horizon.stellar.org/order_book?base_asset_type=native&counter_asset_type=credit_alphanum4&counter_asset_code=USDC&counter_asset_issuer=GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN&limit=5",
  binance: "https://api.binance.com/api/v3/ticker/price?symbol=XLMUSDC",
  coinbase: "https://api.coinbase.com/v2/exchange-rates?currency=XLM",
  cryptocompare: "https://min-api.cryptocompare.com/data/price?fsym=XLM&tsyms=USD,USDC",
  coingecko:
    "https://api.coingecko.com/api/v3/simple/price?ids=stellar,usd-coin&vs_currencies=usd&include_last_updated_at=true",
};
const PRICE_REFRESH_MS = 60000;
const RATE_CACHE_KEY = "playerguild:xlm-usdc-rate";

export default function StatsBar({ quests }) {
  const open      = quests.filter((q) => q.status === "open").length;
  const claimed   = quests.filter((q) => q.status === "claimed").length;
  const completed = quests.filter((q) => q.status === "completed").length;
  const totalUSDCValue = quests
    .filter((q) => q.status !== "cancelled")
    .reduce((sum, q) => sum + parseFloat(q.reward), 0);
  const totalUSDC = totalUSDCValue.toFixed(2);
  const rates = useCurrencyRates();

  return (
    <div className="stats-bar">
      <StatItem icon={<Sword size={14} />} value={open} label="Open Quests" color="var(--neon-green)" />
      <StatItem icon={<Shield size={14} />} value={claimed} label="In Progress" color="var(--status-claimed)" />
      <StatItem icon={<CheckCircle size={14} />} value={completed} label="Completed" color="var(--status-completed)" />
      <StatItem
        icon={<Coins size={14} />}
        value={`${totalUSDC} USDC`}
        label="Escrowed XLM"
        color="var(--neon-gold)"
        tooltip={<CurrencyTooltip rates={rates} totalUSDC={totalUSDCValue} />}
      />
    </div>
  );
}

function StatItem({ icon, value, label, color, tooltip }) {
  return (
    <div className="stat-item">
      <div className={`stat-main-row ${tooltip ? "stat-main-row--has-tooltip" : ""}`} tabIndex={tooltip ? 0 : undefined}>
        <span className="stat-icon" style={{ color }}>{icon}</span>
        <div>
          <div className="stat-value" style={{ color }}>{value}</div>
          <div className="stat-label">{label}</div>
        </div>
      </div>
      {tooltip}
    </div>
  );
}

function CurrencyTooltip({ rates, totalUSDC }) {
  if (!rates.xlmUsd || !rates.usdcUsd) {
    return (
      <div className="stat-tooltip" role="tooltip">
        <div className="tooltip-title">Live conversion</div>
        <div className="tooltip-meta">
          {rates.status === "error" ? "Trying backup market feeds..." : "Fetching current market rate..."}
        </div>
      </div>
    );
  }

  const usdcToXlm = rates.usdcUsd / rates.xlmUsd;
  const xlmToUsdc = rates.xlmUsd / rates.usdcUsd;
  const totalXLM = totalUSDC * usdcToXlm;

  return (
    <div className="stat-tooltip" role="tooltip">
      <div className="tooltip-title">Live conversion</div>
      <div className="tooltip-row">
        <span>1 USDC</span>
        <strong>{formatRate(usdcToXlm)} XLM</strong>
      </div>
      <div className="tooltip-row">
        <span>1 XLM</span>
        <strong>{formatRate(xlmToUsdc)} USDC</strong>
      </div>
      <div className="tooltip-row tooltip-row--total">
        <span>{formatAmount(totalUSDC)} USDC</span>
        <strong>{formatAmount(totalXLM)} XLM</strong>
      </div>
      <div className="tooltip-meta">
        {rates.source}
        {rates.status === "refreshing" ? " refreshing..." : ` updated ${formatUpdatedAt(rates.updatedAt)}`}
      </div>
    </div>
  );
}

function useCurrencyRates() {
  const [rates, setRates] = useState({
    xlmUsd: null,
    usdcUsd: null,
    updatedAt: null,
    source: "Market",
    status: "loading",
  });

  useEffect(() => {
    let isMounted = true;
    const cachedRates = readCachedRates();

    if (cachedRates) {
      setRates({ ...cachedRates, status: "refreshing" });
    }

    const loadRates = async () => {
      setRates((current) => ({
        ...current,
        status: current.xlmUsd ? "refreshing" : "loading",
      }));

      try {
        const nextRates = await fetchMarketRates();

        if (isMounted) {
          setRates({ ...nextRates, status: "ready" });
          cacheRates(nextRates);
        }
      } catch (error) {
        if (isMounted) {
          setRates((current) => ({ ...current, status: "error" }));
        }
      }
    };

    loadRates();
    const intervalId = window.setInterval(loadRates, PRICE_REFRESH_MS);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  return rates;
}

async function fetchMarketRates() {
  const providers = [
    fetchStellarOrderBookRate,
    fetchBinanceRate,
    fetchCoinbaseRate,
    fetchCryptoCompareRate,
    fetchCoinGeckoRate,
  ];

  for (const provider of providers) {
    try {
      return await provider();
    } catch (error) {
      // Continue through backup providers.
    }
  }

  throw new Error("All market feeds failed");
}

async function fetchStellarOrderBookRate() {
  const data = await fetchJson(PRICE_ENDPOINTS.stellarOrderBook);
  const bestBid = Number(data?.bids?.[0]?.price);
  const bestAsk = Number(data?.asks?.[0]?.price);
  const prices = [bestBid, bestAsk].filter((price) => Number.isFinite(price) && price > 0);
  const xlmUsd = prices.reduce((sum, price) => sum + price, 0) / prices.length;

  return normalizeRates({
    xlmUsd,
    usdcUsd: 1,
    source: "Stellar DEX",
  });
}

async function fetchBinanceRate() {
  const data = await fetchJson(PRICE_ENDPOINTS.binance);
  const xlmUsd = Number(data?.price);

  return normalizeRates({
    xlmUsd,
    usdcUsd: 1,
    source: "Binance XLM/USDC",
  });
}

async function fetchCoinbaseRate() {
  const data = await fetchJson(PRICE_ENDPOINTS.coinbase);
  const xlmUsd = Number(data?.data?.rates?.USD);
  const usdcUsd = Number(data?.data?.rates?.USDC)
    ? xlmUsd / Number(data.data.rates.USDC)
    : 1;

  return normalizeRates({
    xlmUsd,
    usdcUsd,
    source: "Coinbase",
  });
}

async function fetchCryptoCompareRate() {
  const data = await fetchJson(PRICE_ENDPOINTS.cryptocompare);
  const xlmUsd = Number(data?.USD || data?.USDC);
  const usdcUsd = data?.USDC && data?.USD ? Number(data.USD) / Number(data.USDC) : 1;

  return normalizeRates({
    xlmUsd,
    usdcUsd,
    source: "CryptoCompare",
  });
}

async function fetchCoinGeckoRate() {
  const data = await fetchJson(PRICE_ENDPOINTS.coingecko);
  const xlmUsd = Number(data?.stellar?.usd);
  const usdcUsd = Number(data?.["usd-coin"]?.usd) || 1;
  const lastUpdated =
    Math.max(
      Number(data?.stellar?.last_updated_at) || 0,
      Number(data?.["usd-coin"]?.last_updated_at) || 0
    ) * 1000;

  return normalizeRates({
    xlmUsd,
    usdcUsd,
    updatedAt: lastUpdated || Date.now(),
    source: "CoinGecko",
  });
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Price request failed: ${response.status}`);
  }

  return response.json();
}

function normalizeRates({ xlmUsd, usdcUsd, updatedAt = Date.now(), source }) {
  if (!Number.isFinite(xlmUsd) || xlmUsd <= 0 || !Number.isFinite(usdcUsd) || usdcUsd <= 0) {
    throw new Error("Invalid price response");
  }

  return { xlmUsd, usdcUsd, updatedAt, source };
}

function readCachedRates() {
  try {
    const cached = JSON.parse(window.localStorage.getItem(RATE_CACHE_KEY));
    if (!cached) return null;
    return normalizeRates({ ...cached, source: `${cached.source || "Cached rate"} cached` });
  } catch (error) {
    return null;
  }
}

function cacheRates(rates) {
  try {
    window.localStorage.setItem(RATE_CACHE_KEY, JSON.stringify(rates));
  } catch (error) {
    // Ignore storage failures; live rates still work for this session.
  }
}

function formatRate(value) {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: value >= 1 ? 4 : 6,
  }).format(value);
}

function formatAmount(value) {
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatUpdatedAt(timestamp) {
  if (!timestamp) return "just now";

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}
