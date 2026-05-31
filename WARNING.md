# WARNING.md — Chessify Protocol: Known Issues & Technical Debt

> Canonical issue tracker for bugs, gaps, and debt found across contracts, hooks, and frontend.
> Ordered by severity. Fix blockers before shipping to users.

---

## SEVERITY 1 — BLOCKERS (breaks core functionality on mainnet)

---

### W-001 · Contract Principal Mismatch — All Stacks Payouts Fail

**File**: `contracts/chess-token-v3.clar:121`

```clarinet
(asserts! (is-eq contract-caller .chess-game-v3) ERR-NOT-AUTHORIZED)
```

The deployed game contract is named `.chess-game` (see `Clarinet.toml`), not `.chess-game-v3`.
`gateway-release` is the only path for funds to leave the vault. Every call to it will fail with `u100`.

**Impact**: Any Stacks game with `wager > 0` locks tokens permanently. Affected paths:
- `end-game-with-winner` → resign, report-win, claim-timeout (line 271)
- `accept-draw` → both refunds (lines 568–569)
- `cancel-game` → white's refund (line 664)

**Fix**: Redeploy `chess-token-v3.clar` with line 121 changed to:
```clarinet
(asserts! (is-eq contract-caller .chess-game) ERR-NOT-AUTHORIZED)
```
Then verify with `clarinet console` before redeploying.

---

### W-002 · Game ID Off-by-One — Stacks Games Navigate to Wrong Page

**File**: `src/hooks/useStacksChess.ts:53`

```typescript
const predictedGameId = currentTotal + 1
```

`get-total-games` returns `(var-get game-nonce)`, which is the **next** ID to be assigned (not a count of existing games plus one). The contract assigns `game-id = game-nonce` before incrementing.

| State | `game-nonce` | `get-total-games` | Next game ID | `predictedGameId` |
|---|---|---|---|---|
| 0 games exist | 0 | 0 | 0 | 1 ❌ |
| 5 games exist | 5 | 5 | 5 | 6 ❌ |

**Impact**: After creating a Stacks game, the user is navigated to `/app/game/[N+1]`, which either doesn't exist or is someone else's game. The actual game is created at ID `N`.

**Fix** in `useStacksChess.ts:53`:
```typescript
const predictedGameId = currentTotal  // game-nonce IS the next id
```

---

### W-003 · Stacks Leaderboard Uses 1-Indexed IDs — Game 0 Always Skipped

**File**: `src/hooks/useStacksLeaderboard.ts:37`

```typescript
const ids = Array.from({ length: total }, (_, i) => i + 1)
// generates [1, 2, ..., total]
```

Stacks game IDs start at `0` (game-nonce initialises to `u0`). This loop skips game 0 entirely and fetches a nonexistent game at index `total`.

**Impact**: All players whose only game is game 0 never appear in the Stacks leaderboard. The phantom fetch at `total` returns `null` silently, so there is no error — just silent data loss.

**Fix**:
```typescript
const ids = Array.from({ length: total }, (_, i) => i)
// generates [0, 1, ..., total-1]
```

---

## SEVERITY 2 — HIGH (feature gaps, wrong behaviour, no workaround)

---

### W-004 · 4 of 9 Contract Functions Unimplemented in Frontend Hooks

Both `useCeloChess` and `useStacksChess` return only:
`{ createGame, joinGame, submitMove, resign, reportWin }`

Missing from both:

| Function | Contract (Clarity) | Contract (Solidity) | Frontend Hook |
|---|---|---|---|
| `claim-timeout` / `claimTimeout` | ✅ | ✅ | ❌ missing |
| `propose-draw` / `proposeDraw` | ✅ | ✅ | ❌ missing |
| `accept-draw` / `acceptDraw` | ✅ | ✅ | ❌ missing |
| `cancel-game` / `cancelGame` | ✅ | ✅ | ❌ missing |

**Impact**:
- A player whose opponent goes AFK cannot claim a timeout win from the UI on either chain
- Neither player can offer or accept a draw from the UI on either chain
- A game creator cannot cancel a waiting game from the UI on either chain

**Files to fix**: `src/hooks/useCeloChess.ts`, `src/hooks/useStacksChess.ts`

---

### W-005 · Elo Not Updated on Draw

**Files**: `contracts/chess-game.clar:542–598`, `celo-contracts/ChessGame.sol:248–270`

`accept-draw` updates draw counts and refunds wagers but never calls `update-elo` / `_updateElo`. Both chains are consistent with each other, but drawn games have zero Elo impact — players can safely draw each other repeatedly without rating consequence.

**Impact**: Elo leaderboard does not reflect draw performance. Players approaching min-rating can farm draws against stronger players with no downside.

**Fix**: Call `(update-elo winner loser)` (using the draw proposer as "winner" or just update both symmetrically) at the end of `accept-draw` on both chains. Requires Elo to be adjusted for draws using `K * 0.5` expected-score formula.

---

### W-006 · Wallet Provider Chain Preference Race Condition

**File**: `src/components/wallet-provider.tsx:82–111`

Two independent `useEffect` hooks both write to `activeChain` on mount:
1. **Line 82–105**: Stacks session init — if signed in and no Celo, calls `setActiveChainState('stacks')`
2. **Line 108–111**: localStorage preference — unconditionally calls `setActiveChainState(savedChain)`

React 18 runs effects in declaration order, so the localStorage effect (2) always runs after the Stacks init effect (1) and overwrites it. The `if (!authenticated)` guard on line 95 is never effective if the user had 'celo' saved in localStorage.

**Impact**: A Stacks-signed-in user with 'celo' in localStorage will see the Celo UI even though their wallet is connected on Stacks. The active chain display and all contract calls will be wrong.

**Fix**: Check localStorage first and only auto-switch to Stacks if no saved preference exists:
```typescript
useEffect(() => {
  const saved = localStorage.getItem('chessify_active_chain') as 'celo' | 'stacks' | null
  if (saved) setActiveChainState(saved)
}, [])
```
Then in the Stacks init effect, only call `setActiveChainState('stacks')` if `!saved && !authenticated`.

---

### W-007 · `disconnectAll` Calls Disconnect Twice

**File**: `src/components/wallet-provider.tsx:194–203`

```typescript
const disconnectAll = useCallback(() => {
  if (activeChain === 'celo') {
    disconnect()
  } else {
    disconnectStacks()
  }
  // Also disconnect the other if both happen to be connected
  if (isConnected) disconnect()        // duplicate if activeChain === 'celo'
  if (isStacksConnected) disconnectStacks()  // duplicate if activeChain === 'stacks'
}, ...)
```

When `activeChain === 'celo'` and `isConnected === true`, `disconnect()` is called twice. Privy's `logout()` is idempotent but `wagmiDisconnect()` called twice can leave wagmi in an inconsistent state.

**Fix**: Remove the duplicate fallthrough calls — the bottom two `if` blocks already handle the cross-chain case, so the top `if/else` is redundant:
```typescript
if (isConnected) disconnect()
if (isStacksConnected) disconnectStacks()
```

---

## SEVERITY 3 — MODERATE (data integrity, UX, debt)

---

### W-008 · SIP-010 Trait Defined Inline Instead of Imported

**File**: `contracts/chess-token-v3.clar:26–36`

The SIP-010 trait is defined locally rather than implementing the canonical `SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE.sip-010-trait-ft-standard.sip-010-trait`. This means the token is **not officially SIP-010 compliant** from the chain's perspective and may not be recognised by wallets, DEXes, or indexers that look up the standard trait implementation.

**Fix**: Replace the inline trait definition with:
```clarinet
(impl-trait 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE.sip-010-trait-ft-standard.sip-010-trait)
```
This requires a redeployment.

---

### W-009 · All 7 Unit Test Files Are Pure Scaffolds

**Files**: `tests/*.test.ts` — all 7 files

Every test file contains only:
```typescript
it("ensures simnet is well initialised", () => {
  expect(simnet.blockHeight).toBeDefined();
});
```

Zero assertions exist for:
- Token transfer, faucet claim, mint, batch-mint
- Game lifecycle: create → join → move → resign → win → draw → timeout → cancel
- Elo calculation: underdog vs favourite rating changes, min-rating floor, draw stability
- Escrow: vault balance changes on create/join, payout on win, refund on draw/cancel
- Error paths: ERR-NOT-AUTHORIZED, cooldown enforcement, duplicate joins

**Risk**: Any contract change can break existing mainnet behaviour with no automated signal.

---

### W-010 · `useStacksRead.getGame` Triple-Dereference Is Fragile

**File**: `src/hooks/useStacksRead.ts:70`

```typescript
return json.value.value?.value || null // (ok (some { ... }))
```

The three-level access pattern depends on a specific Clarity CV serialisation shape. If the Hiro API changes its CV serialisation or returns a different optional shape, this silently returns `null` — which `GameClient.tsx` treats as "no game data" and shows a loading spinner forever.

**Fix**: Use a typed CV decoder (e.g., `cvToValue` with a shape assertion) or add explicit shape validation before dereferencing.

---

### W-011 · Dead Code in `src/lib/index.ts`

**File**: `src/lib/index.ts:15–20`

Contains a commented temporal-anomaly block and an abandoned `ThemeToggle` export that was never completed. Has no effect at runtime but pollutes the NPM package entry point.

**Fix**: Delete lines 15–20 entirely.

---

### W-012 · `end-game-with-winner` Does Double map-get? for Stats

**File**: `contracts/chess-game.clar:278–305`

The winner stats update performs two `map-get?` lookups on the same key:
```clarinet
(map-set player-stats winner
  (merge
    (default-to ... (map-get? player-stats winner))   ;; lookup 1
    (let ((s (default-to ... (map-get? player-stats winner))))  ;; lookup 2
      { wins: ..., games-played: ... }
    )
  )
)
```

This is functionally correct (both reads return the same value) but redundant. Same pattern for the loser block. Not a bug, but wastes two storage reads per game end.

---

### W-013 · No Chain-Mismatch Warning in Wallet Provider

**File**: `src/components/wallet-provider.tsx`

If a Celo user has switched their MetaMask to a non-Celo network (e.g., Ethereum mainnet), contract calls will silently fail or revert with confusing errors. There is no `chainId` check, no wrong-network banner, and no prompt to switch.

**Fix**: Add a `chainId` watch via wagmi's `useChainId()` and surface a toast/banner when `chainId !== CELO_CHAIN_ID`.

---

### W-014 · `useStacksChess.joinGame` Post-Condition Fails for Free Games

**File**: `src/hooks/useStacksChess.ts:93–96`

```typescript
const postCondition = Pc.principal(stacksAddress)
  .willSendEq(microWager)
  .ft(`${STACKS_CONTRACTS.token.address}.${STACKS_CONTRACTS.token.name}`, 'chess-token')
```

When `wagerAmount === 0`, `microWager === 0n`. The post-condition asserts that exactly 0 tokens will be sent. In Clarity, the contract's `join-game` skips the transfer entirely when wager is 0 (line 380–387) — no FT event is emitted.

A `willSendEq(0n)` FT post-condition on a call that emits no FT transfer may pass or fail depending on the Stacks wallet version. Should be conditionally omitted:

```typescript
const postConditions = microWager > 0n
  ? [Pc.principal(stacksAddress).willSendEq(microWager).ft(..., 'chess-token')]
  : []
```

Same issue exists in `createGame` (line 56–58).

---

## SEVERITY 4 — LOW (cosmetic, docs, non-urgent)

---

### W-015 · `README.md` Documents Superseded 7-Contract Architecture

`README.md` describes `router`, `registry`, `escrow`, `logic`, `timer`, `ranking`, `gateway_v2` as active. The canonical system is `chess-token-v3` + `chess-game`. New contributors will be misled.

---

### W-016 · `STACKS_CONTRACTS` in `contracts.ts` Has Duplicate Comment

**File**: `src/config/contracts.ts:6–7`

Two consecutive comment lines say essentially the same thing:
```
// Stacks contracts configuration remain for multi-chain support
// Stacks contracts configuration for consolidated system
```
One is a copy-paste leftover from a previous edit.

---

### W-017 · Timeout Constant Comment Is Wrong

**File**: `contracts/chess-game.clar:72–73`

```clarinet
;; ~30 min on Stacks at 10-min block time = 3 blocks.
;; Set to 432 for ~3 days (conservative default, owner can adjust).
(define-constant DEFAULT-TIMEOUT u432)
```

The comment says "~30 min = 3 blocks" then sets the constant to 432 (~3 days). The first line is a leftover from an earlier draft value. Only the second line is accurate.

---

---

### W-018 · Timeout Handler Calls `reportWin` Instead of `claimTimeout`

**File**: `src/components/game/GameClient.tsx` (inherited from playchessify)

The timeout handler was calling `reportCeloWin` / `reportStacksWin`. Both emit `CheckmateReported` on-chain instead of `TimeoutClaimed`, polluting event logs and making it impossible to distinguish checkmate wins from timeout wins.

**Fix**: Added `handleClaimTimeout` that calls `claimCeloTimeout` / `claimStacksTimeout`. A "CLAIM TIMEOUT WIN" button is shown when `canClaimTimeout` returns true from the contract.

**Status**: ✅ Fixed

---

### W-019 · Client Timer Does Not Match Contract Block-Based Timeout

**File**: `src/components/game/GameClient.tsx` (inherited from playchessify)

playchessify had a 5-minute client-side countdown that fired `reportWin`. The Celo contract timeout is 360 blocks (~30 min). The two never matched.

**Fix**: Removed the client-side countdown. The "CLAIM TIMEOUT WIN" button now appears only when `canClaimTimeout(gameId)` returns `true` from the contract (polled every 30s). The actual enforcement is entirely on-chain.

**Status**: ✅ Fixed

---

### W-020 · Profile API Lowercases All Addresses — Breaks Stacks Principals

**File**: `/src/app/api/profile/*`

All profile API routes call `.toLowerCase()` on addresses before storage and lookup. Stacks principals (`SP...`) are **case-sensitive** — lowercasing them produces a different (invalid) string. Any Stacks player who claims a profile will have their principal stored under an incorrect key.

**Fix needed**: The profile API must detect Stacks principals (starts with `SP` or `ST`) and preserve their case, while still normalising EVM addresses to lowercase.

**Status**: ❌ Unfixed

---

### W-021 · Move Relay Has No Stacks Route

**File**: `src/app/api/games/[chain]/[id]/moves/route.ts`

All relay storage uses key prefix `chess:moves:celo:{id}`. When `chain === 'stacks'` the key becomes `chess:moves:stacks:{id}` but no code validates or separates this — both chains write to the same key namespace with no collision guard. More critically, `useGameMoves` passes `chain: activeChain` but the relay API likely uses `celo` as the canonical key regardless.

**Fix needed**: Verify the relay route correctly keys on `[chain]` and test that two simultaneous games with the same ID on different chains don't collide in Redis.

**Status**: ❌ Needs verification

---

### W-022 · 1-Indexed Game Scan in Lobby and Leaderboard (Both Chains)

**Files**: `src/hooks/useLobby.ts`, `src/hooks/useStacksLeaderboard.ts`

Inherited from playchessify. Game IDs are 0-indexed on both chains (`gameNonce` / `game-nonce` starts at 0). Lobby and leaderboard scans were generating `[1..nonce]`, skipping game 0 and fetching a nonexistent game at index `nonce`.

**Fix**: Changed to `[0..nonce-1]` in all three scan loops.

**Status**: ✅ Fixed

---

## ISSUE STATUS SUMMARY

| ID | Severity | Area | Status |
|---|---|---|---|
| W-001 | BLOCKER | Stacks contract | ✅ Fixed locally — **needs mainnet redeploy** |
| W-002 | BLOCKER | Stacks hook | ✅ Fixed |
| W-003 | BLOCKER | Stacks leaderboard | ✅ Fixed |
| W-004 | HIGH | Both hooks + GameClient | ✅ Fixed — all 4 functions added + wired to UI |
| W-005 | HIGH | Both contracts | ⚠️ Design decision — no Elo on draw |
| W-006 | HIGH | Wallet provider | ✅ Fixed |
| W-007 | HIGH | Wallet provider | ✅ Fixed |
| W-008 | MODERATE | Stacks contract | ❌ Requires redeploy |
| W-009 | MODERATE | Tests | ✅ Fixed — 75 tests across 7 files, all passing |
| W-010 | MODERATE | Stacks hook | ✅ Fixed |
| W-011 | MODERATE | NPM lib | ✅ Fixed |
| W-012 | MODERATE | Stacks contract | ⚠️ Functional but wasteful |
| W-013 | MODERATE | Wallet provider + Navbar | ✅ Fixed — wrong-network banner + switchToCelo |
| W-014 | MODERATE | Stacks hook | ✅ Fixed |
| W-015 | LOW | Docs | ✅ README already described 2-contract arch; added testing section |
| W-016 | LOW | Config | ✅ Fixed |
| W-017 | LOW | Contract comment | ❌ Cosmetic |
| W-018 | HIGH | GameClient | ✅ Fixed |
| W-019 | HIGH | GameClient | ✅ Fixed |
| W-020 | HIGH | Profile API | ✅ Already handled — `normalizeAddress` in `profile-address.ts` preserves Stacks principals |
| W-021 | MODERATE | Move relay | ✅ Chain correctly namespaced in Redis key + game-0 validator fixed |
| W-022 | BLOCKER | Lobby + Leaderboard | ✅ Fixed |

---

> Last updated: 2026-05-31
> Source: manual audit + playchessify comparative analysis
