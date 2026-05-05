import { TOKEN_LIST } from "../utils/stellar";

/**
 * TokenSelector
 * Props:
 *   value      – currently selected token id ("XLM" | "USDC")
 *   onChange   – (tokenId: string) => void
 *   disabled   – optional bool
 */
export default function TokenSelector({ value, onChange, disabled = false }) {
  return (
    <div style={wrap}>
      {TOKEN_LIST.map((token) => {
        const active = value === token.id;
        return (
          <button
            key={token.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(token.id)}
            style={{
              ...btn,
              ...(active ? btnActive : {}),
              ...(disabled ? btnDisabled : {}),
            }}
          >
            <span style={iconStyle}>{token.icon}</span>
            <span style={labelStyle}>{token.label}</span>
            {active && <span style={checkStyle}>✓</span>}
          </button>
        );
      })}
    </div>
  );
}

const wrap = {
  display: "flex",
  gap: 8,
};
const btn = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 16px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.03)",
  color: "#9CA3AF",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  transition: "all 0.15s",
};
const btnActive = {
  border: "1px solid rgba(124,58,237,0.6)",
  background: "rgba(124,58,237,0.12)",
  color: "#C4B5FD",
};
const btnDisabled = {
  opacity: 0.5,
  cursor: "not-allowed",
};
const iconStyle = { fontSize: 16 };
const labelStyle = { letterSpacing: "0.02em" };
const checkStyle = { fontSize: 11, color: "#A78BFA", marginLeft: 2 };