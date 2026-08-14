# ♟️ Chessify — Chess Settlement on Stellar

A **free-to-play chess protocol** built for **Stellar / Soroban**: players stake free-to-mint CHESS tokens on real chess matches, the game itself is validated off-chain, and the **escrow, payout, and Elo rating live in a single Soroban contract**.

Chessify already runs on Stacks, Celo, and Base — those deployments are the proving ground. **Stellar is where the protocol is headed**: one contract, sub-cent fees, 5-second finality, and a token model that works with any SEP-41 asset.

> Archived multi-chain README (Stacks / Celo / Base detail): [`docs/README-multichain-archive.md`](docs/README-multichain-archive.md)

---

## 🌟 Why Stellar

| Property | What it buys Chessify |
|---|---|
| **~5s ledger close** | Create → join → settle feels instant; no "waiting for confirmation" board freeze |
| **Fees in stroops** | A wager match costs a rounding error, so free-to-play stays actually free |
| **SEP-41 token interface** | The wager asset is a constructor argument — CHESS, a Stellar Asset Contract, or any classic asset wrapped as a SAC |
| **Rust / Soroban** | The whole engine (escrow + lifecycle + Elo) fits in one auditable contract, not a 2-contract split |
| **Native auth** | `require_auth()` replaces the approve-then-transfer dance the EVM ports need |

---

## 📐 Architecture

### On-chain — `stellar-contracts/src/lib.rs`

A single contract, `ChessGameContract`, owns everything:

| Concern | Implementation |
|---|---|
| **Escrow** | Wagers move into the contract address on `create_game` / `join_game`, out on resolution |
| **Lifecycle** | `Waiting → Active → Finished / Draw / Cancelled` |
| **Clock** | Ledger-timestamp timeout (default **1800s**), claimable by the *waiting* side |
| **Elo** | Integer Elo, K=32, 400-point diff cap, floor 100, start 1200 |
| **Token** | Any `token::Client` (SEP-41) address, bound at `initialize` |

**Entry points**

```
initialize(admin, token, timeout_secs)     — once, wires token + admin
create_game(creator, wager) -> game_id     — escrows the creator's wager
join_game(player, game_id)                 — matches the wager, game goes Active
submit_move(player, game_id)               — flips turn, resets clock, clears draw offer
resign(player, game_id)                    — opponent takes the pot
report_win(player, game_id)                — checkmate claim
claim_timeout(player, game_id)             — opponent stalled past the window
propose_draw / accept_draw                 — mutual draw, both wagers refunded
cancel_game(player, game_id)               — creator-only, pre-join refund
```

**Reads**: `get_game`, `get_player_stats`, `total_games`, `can_claim_timeout`, `seconds_until_timeout`.
**Admin**: `set_timeout`.

Errors are a typed `ChessError` enum (`NotYourTurn`, `GameNotActive`, `TimeoutNotReached`, …) — no bare panics. Every state change publishes an event (`game_created`, `game_joined`, `move_made`, `game_resigned`, `checkmate_reported`, `timeout_claimed`, `draw_proposed`, `draw_accepted`, `game_cancelled`) so an indexer can rebuild history without polling storage.

### Off-chain

Chess rules are **never** validated on-chain — that would cost more than the wager is worth.

- **Move relay** — Upstash Redis. Moves are turn-bound and cryptographically signed; the signed message binds chain + game + ply + SAN + resulting position, so a signature can't be replayed onto a different move.
- **Server verification** — the relay confirms the game is `Active` and enforces turn order against chain reads before accepting a move.
- **Replay** — `src/lib/settlement.ts` replays the authoritative move list with chess.js to determine checkmate / stalemate / draw.

---

## 🚦 Status — read this before you assume

| Layer | State |
|---|---|
| Soroban contract (`stellar-contracts`) | ✅ **Written** — full lifecycle, escrow, Elo, timeouts |
| Build (`stellar contract build`) | ✅ compiles against `soroban-sdk 22.0.0` |
| Testnet / mainnet deployment | ❌ **Not deployed** |
| CHESS token on Stellar (SEP-41 / SAC) | ❌ not issued |
| Frontend wallet integration (Freighter / passkeys) | ❌ not wired |
| Backend chain adapter for Stellar | ❌ not written |
| Stacks / Celo / Base | ✅ live on mainnet — see the archived README |

**Trust model note**: the current Stellar contract uses the **player-report model** (`report_win` — the caller claims the win). That is acceptable while CHESS is free-to-mint and valueless, and it is what the original Stacks contracts do. The EVM branch has since moved to an **oracle model** (a server key replays the game and is the only address allowed to declare a result). Porting that to Soroban — an `oracle` address in `DataKey`, a `settle_game(oracle, game_id, result)` gated on it, plus a `reclaim_expired` backstop — is the main open contract task.

---

## 🗺️ Roadmap to Stellar mainnet

1. **Oracle model** — add `DataKey::Oracle`, `set_oracle`, `settle_game`, and `reclaim_expired`; demote `report_win`.
2. **Token** — issue CHESS as a SEP-41 contract (faucet + minter role) or wrap a classic asset as a SAC.
3. **Rust tests** — `soroban-sdk` `testutils` coverage mirroring the Clarity suite (escrow, Elo, timeout, draw, cancel). `test_snapshots/` is stubbed and waiting.
4. **Deploy to testnet** — `initialize` with the token + a rotatable oracle key, run a full game end to end.
5. **Frontend** — Freighter / Stellar Wallets Kit (and passkey smart wallets) alongside the existing Privy + Stacks Connect paths; add Stellar to the chain-select modal and `config/contracts.ts`.
6. **Backend** — a Stellar chain adapter for the relay's read path and a server signer for oracle settlement.
7. **Mainnet** — deploy, fund the oracle key, register operators.

---

## 🛠️ Build & Deploy

```bash
# Build the Soroban contract
cd stellar-contracts
stellar contract build
cargo test                                  # once the test module lands

# Deploy (testnet)
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/stellar_contracts.wasm \
  --source <KEY> --network testnet

# Wire it up
stellar contract invoke --id <CONTRACT_ID> --source <KEY> --network testnet \
  -- initialize --admin <ADMIN> --token <TOKEN_ID> --timeout_secs 1800
```

Frontend:

```bash
npm run dev      # Next.js dev server
npm run build    # production build
npm run test     # Clarinet/Vitest suite (Stacks contracts)
```

---

## 🔥 Economic Model

- **XLM** pays ledger fees only — never at risk in a game.
- **CHESS** is a free-to-access in-game currency: faucet-minted, used for wagers, rewards, and ranking. It has no monetary value by design.
- Wagers are held by the **contract address itself** (no separate vault contract) and released only on resolution: winner takes `wager * 2`, a draw or a cancel refunds in full.

---

## 🎮 Lifecycle

1. **Connect** — Freighter / Stellar wallet (planned), or the existing Privy / Stacks paths on other chains.
2. **Create** — `create_game(creator, wager)`; the wager is escrowed, game sits in `Waiting`.
3. **Join** — `join_game` matches the wager; status flips to `Active`, white moves first.
4. **Play** — moves go to the **relay**, not the chain. `submit_move` only flips turn and resets the clock. Stall past the timeout and the opponent can `claim_timeout`.
5. **Resolve** — checkmate/draw is replayed off-chain with chess.js; resign and accepted draws settle directly on-chain.
6. **Payout** — the pot goes to the winner (or splits back on a draw) and both Elo ratings update in the same transaction.

---

## 🗂️ Repo Layout

| Path | What |
|---|---|
| `stellar-contracts/` | **Soroban contract (Rust) — the focus of this repo** |
| `contracts/` | Clarity contracts (Stacks, live) |
| `celo-contracts/`, `base-contracts/` | Solidity ports (live) |
| `src/` | Next.js 16 app — lobby, board, faucet, history, leaderboard, profiles |
| `src/lib/settlement.ts` | Off-chain chess.js replay used for settlement |
| `tests/` | Clarinet SDK + Vitest suite for the Clarity contracts |
| `docs/README-multichain-archive.md` | The previous multi-chain README |

---

## 🧰 Tech Stack

- **Contracts**: Rust / Soroban (Stellar) · Clarity (Stacks) · Solidity (Celo, Base)
- **Frontend**: Next.js 16, TypeScript, Tailwind CSS 4
- **Animation**: Framer Motion, Three.js (R3F)
- **Wallets**: Freighter / Stellar Wallets Kit (planned), Privy + Wagmi/Viem (EVM), Stacks Connect
- **Off-chain**: Upstash Redis (signed move relay + profiles)
- **Chess**: chess.js (rules + replay), react-chessboard (UI)
- **State**: Zustand, TanStack Query

---

*"Play for the pride of the chain, stay for the thrill of the move."*
