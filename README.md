# PlayerGuild

> A blockchain-powered quest board where gamers post and complete paid gigs — built on Stellar.

**Live Demo:** https://player-guild.vercel.app

---

## Problem

A Filipino mobile gamer who earns real money through play-to-earn titles cannot safely hire another player to complete a dungeon run or grind session — there is no trusted escrow between strangers, so either the giver pays upfront and gets nothing, or the hunter works and never receives payment.

## Solution

PlayerGuild lets quest givers lock XLM rewards in a Soroban smart contract escrow; a hunter claims the quest, completes the work, and the giver releases payment on-chain — all settled in seconds with near-zero fees, using Stellar's fast finality and composable asset model.

---

## Timeline

| Phase | Milestone |
|-------|-----------|
| Week 1 | Smart contract + testnet deployment |
| Week 2 | React web UI + Freighter wallet integration |
| Week 3 | Anchor integration (GCash / Maya off-ramp) |
| Week 4 | Hackathon demo + pilot with 50 gamers |

---

## Stellar Features Used

- **XLM transfers** — quest rewards locked and released via native asset
- **Soroban smart contracts** — escrow logic, quest lifecycle state machine
- **Trustlines** — optional USDC support for stablecoin rewards
- **Built-in DEX** — hunters can swap XLM rewards to USDC or PHP-pegged tokens instantly

---

## Vision and Purpose

Gaming economies in Southeast Asia generate billions of dollars of informal labour. PlayerGuild formalises this market by giving every gamer a trustless, instant, low-cost way to transact — bridging the gap between the unbanked gig economy and decentralised finance.

---

## Prerequisites

- Rust `>=1.74` with `wasm32-unknown-unknown` target
- Soroban CLI `>=21.0.0`
- Node.js `>=18` (for front-end)

```bash
rustup target add wasm32-unknown-unknown
cargo install --locked soroban-cli@21.0.0
```

---

## Build

```bash
soroban contract build
# Output: target/wasm32-unknown-unknown/release/player_guild.wasm
```

---

## Test

```bash
cargo test
```

All 5 tests should pass:
- `test_full_quest_lifecycle` — happy path end-to-end
- `test_giver_cannot_claim_own_quest` — edge case guard
- `test_storage_state_after_post` — state verification
- `test_cancel_open_quest` — cancel flow
- `test_cannot_claim_cancelled_quest` — edge case guard

---

## Deploy to Testnet

```bash
# Configure testnet identity
soroban keys generate --global player_guild_dev --network testnet

# Fund account
soroban keys fund player_guild_dev --network testnet

# Deploy contract
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/player_guild.wasm \
  --source player_guild_dev \
  --network testnet
# Returns: CONTRACT_ID
```

---

## Sample CLI Invocations

### Post a quest (5 XLM reward)

```bash
soroban contract invoke \
  --id CONTRACT_ID \
  --source player_guild_dev \
  --network testnet \
  -- post_quest \
  --giver GIVER_ADDRESS \
  --title "Defeat the Dragon Boss in Ragnarok M" \
  --reward_xlm 50000000
# Returns quest_id: 1
```

### Claim the quest

```bash
soroban contract invoke \
  --id CONTRACT_ID \
  --source hunter_dev \
  --network testnet \
  -- claim_quest \
  --hunter HUNTER_ADDRESS \
  --quest_id 1
```

### Approve and settle

```bash
soroban contract invoke \
  --id CONTRACT_ID \
  --source player_guild_dev \
  --network testnet \
  -- complete_quest \
  --giver GIVER_ADDRESS \
  --quest_id 1
```

### Read quest state

```bash
soroban contract invoke \
  --id CONTRACT_ID \
  --network testnet \
  -- get_quest \
  --quest_id 1
```

---

## License

MIT © 2025 PlayerGuild Contributors\

## contract
https://stellar.expert/explorer/testnet/tx/a58c33e3a40ce91892968409d6fee8c2245f7a85dbf0e33211aaaba0b95a2b34
https://lab.stellar.org/r/testnet/contract/CDIJG6MKABPATFQSGJDTN3WR7E7A6KFJNLSBWFME56IKINGV32D4L7EL
