# Playchessify Oracle Settlement — Stacks Contracts

**Status:** Live on Stacks mainnet · Deployed 2026-06-26 · Deployer `SP6X0MXEEGZX14ZTK7XQXJ76W35ZJDP9NZBT6F39`

This document explains the two contracts that run Chessify's chess protocol on Stacks
under the **oracle-settlement** model, why they're built this way, and how a game flows
through them end to end.

---

## 1. The two contracts

| Contract | Role | Address |
|---|---|---|
| `playchessifyToken` | The **CHESS token + permanent escrow vault** | `SP6X0M….playchessifyToken` |
| `playchessifyEngine` | The **game logic** (lifecycle, escrow moves, Elo) | `SP6X0M….playchessifyEngine` |

They are deliberately split so the **vault is permanent** and the **engine is replaceable**.

---

## 2. The core idea: an off-chain referee, an on-chain safe

Chess moves are **not** played on-chain — they go through Chessify's off-chain relay
(validated with chess.js), exactly like any online chess site (instant, no per-move fees).
The blockchain only does two things:

1. **Holds the stake** — both players lock equal CHESS into the vault when a game starts.
2. **Pays the result** — when the game ends, a trusted **oracle** (a backend key) replays
   the authoritative move list, confirms the terminal position, and tells the engine who won.
   The engine then releases the escrow from the vault to the winner (or splits it on a draw).

The oracle can **only** declare white-wins / black-wins / draw. It can never send funds to
itself or anyone else — funds only ever go to the two real players. If the oracle ever goes
down, either player can reclaim their stake after ~1 day (`reclaim-expired`), so money is
never permanently stuck.

There is **no on-chain `submit-move` / `report-win` / `claim-timeout`** — the relay + oracle
replace them.

---

## 3. `playchessifyToken` — the permanent vault

A standard SIP-010 CHESS token with two upgrades over the old `chess-token-v4` that make it
**the last token we ever need to deploy**:

### a. Re-keyable authorization (allow-list)
The privileged payout function `gateway-release` (used by the engine to pay winners / refund
draws / reclaim escrow) used to be **welded to one hardcoded game contract**. Now it checks an
**owner-managed allow-list**:

```clarity
(map authorized-games principal bool)          ;; which engines may move vault funds
(set-authorized-game (game principal) (enabled bool))   ;; owner adds/removes engines
```

So **any future engine** is authorized with a single owner call — no token redeploy, no
escrow migration — and two engines can even run at once during a migration. This is the fix
for the bug that made the abandoned `chess-game-oracle` non-functional (its payouts reverted
with `ERR-NOT-AUTHORIZED u100` because the live token only trusted `chess-game-v2`).

### b. Minter role
A dedicated, owner-settable `minter` can provision CHESS without the owner key:

```clarity
(define-data-var minter principal CONTRACT-OWNER)
(set-minter (new-minter principal))            ;; owner rotates the minter
(mint-to (amount uint) (recipient principal))  ;; minter-only — backend gas-sponsor provisioning
```

Plus the usual: `faucet-claim` (1,000 CHESS/day), owner `mint`/`batch-mint`, `transfer`,
`get-vault-balance`, `is-authorized-game`, `get-minter`.

---

## 4. `playchessifyEngine` — the game

Holds each game and drives escrow. Deposits and payouts route through
`.playchessifyToken`; the engine must be allow-listed there (`set-authorized-game`).

**State per game:** `{ white, black, wager, status, created-at, draw-proposer }`
(status: `0 waiting · 1 active · 2 finished · 3 cancelled · 4 draw`). Plus per-player Elo
stats (`wins/losses/draws/rating/games-played`, K=32, floor 100).

**Player actions** (the player signs; gas can be sponsored — see §6):
| Function | Effect |
|---|---|
| `create-game (wager)` | Locks the creator's wager into the vault; opens a WAITING game |
| `join-game (id)` | Opponent matches the wager; game goes ACTIVE |
| `resign (id)` | Caller loses; opponent paid the full pot |
| `propose-draw (id)` / `accept-draw (id)` | Both agree → split refund |
| `cancel-game (id)` | Creator cancels a still-WAITING game; refunded |

**Oracle / backstop:**
| Function | Caller | Effect |
|---|---|---|
| `settle-game (id, result)` | **oracle only** | Declares 1/2/3; pays winner or splits draw |
| `reclaim-expired (id)` | either player | After ~1 day ACTIVE, split-refund if oracle is down |
| `set-oracle (principal)` | owner | Rotate the settlement key |

**Reads:** `get-game`, `get-game-status`, `get-total-games`, `get-oracle`, `can-reclaim`,
`get-player-stats`, `get-rating`.

---

## 5. End-to-end game flow

```
1. White: create-game(wager)   → wager → vault, status WAITING
2. Black: join-game(id)         → wager → vault, status ACTIVE  (vault now holds 2× wager)
3. Players play off-chain via the relay (no on-chain tx per move)
4. Game ends (checkmate / stalemate / clock):
     backend oracle replays the move list, confirms the terminal result, and calls
     settle-game(id, result)
5. Engine → token.gateway-release → pays the winner the full pot
            (or splits it back on a draw); Elo updated
   Alt endings: resign / propose+accept-draw / cancel-game (pre-join) /
                reclaim-expired (oracle-down backstop)
```

---

## 6. Gasless UX (the "July" feature) — done natively, no contract code

The EVM roadmap needed an ERC-2771 forwarder + `*WithSig` functions (a redeploy) so external
wallets could play without holding gas. **Stacks doesn't need that** — it has native
**sponsored transactions**: the player signs the contract call as `sponsored`, and a
gas-sponsor key co-signs and pays the STX fee. `tx-sender` stays the real player.

So gasless is delivered entirely in the **backend** (`/api/stacks/sponsor`) + the client
(`openContractCall({ sponsored: true })`) — **zero meta-tx code in the contracts**, which is
why the engine stays minimal and replaceable.

---

## 7. Why this never needs another token redeploy

- The **token holds all funds** and is permanent — its allow-list re-keys to any future engine.
- The **engine is freely replaceable** — ship a new one, call `set-authorized-game(newEngine)`
  on the token and `set-oracle` on the engine, repoint the frontend. Funds never move, no
  migration.
- Contrast with the EVM model (and the abandoned `chess-game-oracle`), where authorization was
  welded in and any change forced new addresses + escrow migration.

---

## 8. Operator keys

| Key | Address | Role |
|---|---|---|
| Owner / deployer | `SP6X0M…NZBT6F39` | deploys, `set-authorized-game`, `set-oracle`, `mint` |
| Oracle | `SP3AB4M3W69SXTBNVR09FGZ7HX0ESY222545SM914` | signs `settle-game` (secret in gitignored `.env.oracle.local`) |
| Minter | (set as needed) | `mint-to` provisioning |
| Gas sponsor | (backend) | co-signs sponsored player txs |

---

## 9. Verification

- Simnet: full create→join→settle pays the winner; vault empties; allow-list blocks an
  unauthorized engine then allows it after `set-authorized-game`; `mint-to` by a rotated minter.
- Mainnet: `set-authorized-game(engine)` = `(ok true)`; `get-oracle` = the dedicated key;
  live create→cancel refund through `gateway-release` succeeds (the direct inverse of the old
  contract's `u100` rejection).
