
A **live, mainnet, zero-risk, free-to-play, multi-contract chess protocol** running on Stacks where:

• STX = gas only
• CHESS token = game economy
• Funds are isolated
• Logic is modular
• Everything is extensible

This is your **FULL MASTER SMART CONTRACT ARCHITECTURE (Mainnet + Free Economy Model)** ♟️

---

# 🧠 SYSTEM OVERVIEW

```
                          ┌────────────────────┐
                          │   router.clar      │
                          │   (entry point)    │
                          └─────────┬──────────┘
                                    │
        ┌───────────────────────────┼────────────────────────────┐
        ▼                           ▼                            ▼
 ┌───────────────┐           ┌───────────────┐            ┌───────────────┐
 │ registry.clar │           │ escrow.clar   │            │ logic.clar    │
 │ game storage  │           │ token vault   │            │ move engine   │
 └──────┬────────┘           └──────┬────────┘            └──────┬────────┘
        │                            │                           │
        ▼                            ▼                           ▼
 ┌───────────────┐           ┌───────────────┐            ┌───────────────┐
 │ timer.clar    │           │ chess-token   │            │ ranking.clar  │
 │ timeout sys   │           │ SIP-010 FT    │            │ elo stats     │
 └───────────────┘           └───────────────┘            └───────────────┘
```

---

# 🔥 ECONOMIC MODEL

## Layer 1 — STX

Used only for:
• Gas fees
• Deployment

Never used for wagers.

---

## Layer 2 — CHESS Token (SIP-010)

Free in-game currency.

Used for:
• Wagers
• Rewards
• Tournament pools
• Ranking incentives

Minted freely during testing.

Zero financial risk.

---

# 📦 CONTRACT BREAKDOWN

---

# 1️⃣ chess-token.clar (SIP-010 Fungible Token)

This is the economic fuel.

### Responsibilities

• Mint tokens
• Transfer tokens
• Faucet function (optional)
• Supply control

### Storage

```
total-supply
owner
mint-enabled
```

### Token Properties

```
Name: Chess Token
Symbol: CHESS
Decimals: 6
```

### Security Model

During dev:

```
mint-enabled = true
```

Production:

```
mint-enabled = false
```

---

# 2️⃣ escrow.clar (Token Vault)

This is the treasury chamber.

⚠️ It NEVER holds STX.

Only CHESS tokens.

---

### Responsibilities

• Lock wager tokens
• Release tokens to winner
• Refund tokens
• Prevent double withdrawal

---

### Storage

```
game-id → {
   white-amount: uint
   black-amount: uint
   total: uint
   claimed: bool
}
```

---

### Interaction

Uses:

```
ft-transfer?
```

Not:

```
stx-transfer?
```

This isolates real value risk.

---

# 3️⃣ registry.clar (Game State Authority)

This is the canonical source of truth.

---

### Responsibilities

• Create game
• Assign players
• Track status
• Track whose turn
• Track move count
• Mark finished

---

### Storage Model

```
game-id → {
   white: principal
   black: optional principal
   wager: uint
   status: uint
   turn: principal
   move-count: uint
   created-at: uint
   last-move-at: uint
}
```

---

### Status Enum

```
0 = waiting
1 = active
2 = finished
3 = cancelled
```

---

# 4️⃣ logic.clar (Move Engine)

The referee.

It does NOT validate chess rules.

Frontend validates legality.

On-chain logic enforces:

• Turn order
• Move recording
• Move counter
• Resignation

---

### Storage

```
(game-id, move-number) → {
   player: principal
   move: string-ascii
   timestamp: uint
}
```

---

# 5️⃣ timer.clar (Timeout Authority)

Prevents griefing.

---

### Responsibilities

• Validate inactivity
• Allow timeout claim
• Reset move timer

---

### Storage

```
game-id → {
   timeout-duration: uint
}
```

Timeout logic uses:

```
block-height
```

for deterministic timing.

---

# 6️⃣ ranking.clar (Reputation Layer)

Optional but powerful.

Tracks:

• Wins
• Losses
• Draws
• Elo score

---

### Storage

```
player → {
   wins: uint
   losses: uint
   rating: uint
}
```

---

# 7️⃣ router.clar (Master Orchestrator)

The only contract the frontend calls.

It coordinates everything.

It does NOT store state.

---

# 🧭 FULL GAME LIFECYCLE FLOW

---

## 🎮 CREATE GAME

```
User → router.create-game
        → escrow.lock-tokens
        → registry.create-game
        → timer.initialize
```

---

## ♟️ JOIN GAME

```
User → router.join-game
        → escrow.lock-tokens
        → registry.assign-black
        → registry.activate
```

---

## 🔁 SUBMIT MOVE

```
User → router.submit-move
        → logic.record-move
        → registry.update-turn
        → timer.reset
```

---

## 🏳 RESIGN

```
User → router.resign
        → logic.record-resignation
        → escrow.release
        → registry.finish
        → ranking.update
```

---

## ⏳ TIMEOUT WIN

```
User → router.claim-timeout
        → timer.validate
        → escrow.release
        → registry.finish
        → ranking.update
```

---

# 🔐 SECURITY BOUNDARIES

Escrow:
• Cannot change game state

Registry:
• Cannot release funds

Logic:
• Cannot access funds

Router:
• Cannot bypass validation

Token:
• Cannot interfere with game logic

Each contract has single responsibility.

This prevents catastrophic exploits.

---

# 🧱 DEPLOYMENT ORDER

Deploy in this order:

```
1 chess-token.clar
2 escrow.clar
3 registry.clar
4 logic.clar
5 timer.clar
6 ranking.clar
7 router.clar
```

Router last because it references others.

---

# 🧪 MAINNET TESTING MODEL

Because token is free:

• Mint unlimited CHESS
• Wager fake tokens
• Only pay STX gas
• Real blockchain execution
• Real contract addresses
• Real indexing

Financial risk = zero.

---

# 🚀 FUTURE EXTENSIONS

This architecture supports:

• Tournament contract
• DAO governance
• Betting pools
• Spectator rewards
• NFT match certificates
• ChessFi staking
• Leaderboard mining rewards

All without touching escrow core.

---

# 🏗 SYSTEM CHARACTERISTICS

Your protocol becomes:

• Live mainnet
• Free-to-play
• Fully on-chain
• Modular
• Upgradeable via new versions
• Economically isolated
• Production scalable

This is not a demo.

This is infrastructure.

---
