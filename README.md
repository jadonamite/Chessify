# ♟️ Chessify Protocol

A **live, mainnet, free-to-play, multi-chain chess protocol** deployed on **Stacks (Bitcoin L2)**, **Celo (EVM)**, and **Base (EVM)**. 

Chessify lets players wager free-to-mint CHESS tokens on real chess matches: rules are validated **off-chain** (chess.js over a signed Redis move relay) while wagers, payouts, and Elo are **settled on-chain**, all behind a premium "Cyber-Industrial" design system.

> **Chessify vs. [playchessify](https://github.com/jadonamite/playchessify)**: Chessify is the complete multi-chain protocol (Stacks + Celo + Base); playchessify is the Celo-only deployment of the same engine.

---

## 📐 Architecture Overview

The protocol has been consolidated from a legacy modular system into a streamlined **2-contract architecture** per chain, ensuring lower gas costs and faster execution.

### Stacks (Clarity)
- **`chess-token-v3.clar`**: SIP-010 token + Escrow Vault.
- **`chess-game.clar`**: Game engine, Elo rating system, and Timeout management.
- **`automata-agent.clar`**: On-chain attestation for AI agent actions.

### Celo (Solidity)
- **`ChessToken.sol`**: ERC-20 token with faucet and batch-minting.
- **`ChessGame.sol`**: Game engine mirroring the Stacks logic (Elo, lifecycle, escrow).

### Base (Solidity)
- **`ChessToken.sol`**: ERC-20 token with faucet and batch-minting.
- **`ChessGame.sol`**: Game engine mirroring the Stacks logic (Elo, lifecycle, escrow).

### Off-chain Services
Chess itself is never validated on-chain — the contracts only escrow and settle.

- **Move relay** — Upstash Redis. Moves are turn-bound; capable wallets **cryptographically sign** each move (`canonicalMoveMessage` binds chain + game + ply + SAN + resulting position, so a signature can't be replayed onto another move).
- **Server verification** — the relay confirms the game is `Active` and enforces turn order via read-only chain calls (`onchain-read.ts`) before accepting a move.
- **Settlement** — replayed off-chain with chess.js (`settlement.ts`) and submitted on-chain by the players (`reportWin` / `settleDraw` / resign / timeout). Trust model: CHESS is free, so a false claim costs nothing. A **trusted-oracle** settlement path is architected but deferred.

---

## 🚀 Protocol Status

| Layer | Component | Status |
| :--- | :--- | :--- |
| **Blockchain** | Smart Contracts (Stacks, Celo & Base) | ✅ **DONE** |
| **Network** | Mainnet Deployment (Stacks, Celo & Base) | ✅ **DONE** |
| **Frontend** | UI/UX & Landing Pages | ✅ **LIVE** |
| **Integration** | Wallet Handlers & Chain Hooks (Stacks, Celo, Base) | ✅ **LIVE** |

---

## 🔥 Economic Model

### Layer 1 Gas (STX / CELO)
Used strictly for transaction fees. The protocol is designed to be "zero-risk" by isolating game wagers from the native gas tokens.

### Layer 2 Economy (CHESS Token)
A free-to-access in-game currency used for wagers, rewards, and ranking.
- **Faucet**: 1,000 CHESS per day per wallet.
- **Wagers**: Players agree on CHESS amounts (e.g., 100 CHESS) before starting.
- **Security**: Wagers are locked in the contract-owned vault (escrow) and released only upon game resolution.

---

## 🎮 Lifecycle Flow

1. **Connect**: Privy wallet (injected, embedded, or social) on Celo/Base, or Stacks Connect. Pick a chain via the chain-select modal.
2. **Initialization**: Player A picks a wager and creates a match (`createGame`). Tokens are escrowed in the contract.
3. **Matching**: Player B joins the match, locking an equal CHESS amount.
4. **Gameplay**: Moves go to the **relay** (not on-chain) — turn-bound and signed. The opponent's board syncs by polling. A side that doesn't move within the clock window forfeits on time.
5. **Resolution**: Checkmate/draw/timeout is replayed off-chain with chess.js, then **settled on-chain by the players** (`reportWin` / `settleDraw` / resign / timeout).
6. **Payout**: The contract releases the pot to the winner (or refunds both on a draw) and updates Elo ratings.

---

## 🗂️ Pages

| Route | Page |
|---|---|
| `/` | Landing |
| `/app` | App entry |
| `/app/lobby` | Open challenges, create/join, profile stats |
| `/app/game/[id]` | Live board (`id`, or `bot` for offline AI) |
| `/app/faucet` | CHESS faucet |
| `/app/history` | Your on-chain games |
| `/app/leaderboard` | On-chain Elo rankings |
| `/app/profile/[identifier]` | `.chess` profile (address or username) |
| `/app/settings` | Sound, board theme, piece set, AI difficulty, hints, profile |

---

## 🛠️ Tech Stack

- **Contracts**: Clarity (Stacks), Solidity (Celo & Base)
- **Frontend**: Next.js 16, TypeScript, Tailwind CSS 4.x
- **Animation**: Framer Motion, Three.js (R3F)
- **Wallets**: Privy (embedded + social), Wagmi, Viem (EVM), Stacks Connect
- **Off-chain**: Upstash Redis (signed move relay + profiles)
- **Chess**: chess.js (rules + replay), react-chessboard (UI)
- **State**: Zustand, TanStack Query

---

## 📖 Deployed Details

**Stacks Deployer**: `SP6X0MXEEGZX14ZTK7XQXJ76W35ZJDP9NZBT6F39`  
**Celo Token**: `0xE370aad742dF8DC8Ae9c0F0b9f265334D39e2197`  
**Celo Game**: `0xf85f00D39A84b5180390548Ea9f76B0458607E78`  
**Base Token**: `0x6aab785e1fa220eefe74d90a143e0a4a3c36e4e4`  
**Base Game**: `0x309fc0793350c694ae1de87719f2c9a413a25ac3`

---

## 🧪 Testing

Uses Clarinet SDK + Vitest against a local simnet. Each test file is self-contained (`initBeforeEach: true` resets simnet per test).

```bash
npm run test          # run all tests
npm run test:report   # with coverage
npm run test:watch    # watch mode
```

| File | Coverage |
|---|---|
| `chess-token.test.ts` | SIP-010 transfer, faucet, mint, gateway-release guard |
| `registry.test.ts` | game creation, joining, player stat init |
| `logic.test.ts` | submit-move turn-flip, move-count, draw-clear |
| `escrow.test.ts` | wager locking, win payout, cancel refund, draw refund |
| `ranking.test.ts` | Elo formula (K=32, diff cap 400, floor 100, draws) |
| `timer.test.ts` | claim-timeout guards, can-claim, set-timeout-blocks |
| `router.test.ts` | resign, report-win, propose/accept draw, cancel lifecycle |

> **Note**: Legacy contract files (`router.clar`, `registry.clar`, etc.) remain in `contracts/` but are superseded. Only `chess-token-v3`, `chess-game`, and `automata-agent` are active on mainnet.

---

*”Play for the pride of the chain, stay for the thrill of the move.”*
