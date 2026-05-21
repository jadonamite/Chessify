# Game Engine Fix Log

Audit + repair of the Chessify game-play stack (chess.js rules, AI bot, PvP relay).

## Audit summary

| Layer | Verdict |
|---|---|
| Chess rule engine (`chess.js`) | Sound — delegated to library |
| Bot AI (`src/lib/chess-engine.ts`) | Functional. Depth-3 alpha-beta minimax, hardcoded as Black. Eval is material + pawn/knight piece-square only — weak but correct. |
| PvP relay (`useGameMoves.ts` + API route) | **Race condition** — stale poll responses can overwrite freshly-committed local moves, causing the player's move to visually vanish for ~2s before the next poll restores it. |

## Fixes

### 1. Monotonic guard in `useGameMoves.ts` ✅
**Bug:** `setMoves((prev) => prev.length === incoming.length ? prev : incoming)` — if a poll started before the local POST resolved, the stale response (with `length = N`) would overwrite the local state (`length = N+1`), reverting the player's just-played move until the next poll cycle.

**Fix:** Make the relay state monotonically non-decreasing. Only accept the polled response if it has at least as many moves as the local state.

```ts
setMoves((prev) => (incoming.length >= prev.length ? incoming : prev))
```

This preserves resync when the relay legitimately has more moves (opponent played), but ignores stale shorter responses. The replay effect's full SAN-equality check in `GameClient.tsx` is the safety net for content divergence.

### 2. Bot move timeout cleanup ✅
**Bug:** `setTimeout` in `executeMove` (bot path) fires 1.2s after a move; if the user navigates away in between, `setGame`/`setMoveHistory` run on an unmounted component (React warning, no crash, but unclean).

**Fix:** Track timeout id in a ref and clear it on unmount.

### 3. Pawn promotion UI ✅
**Gap:** `executeMove` hardcoded `promotion: 'q'`, so under-promotion (rook/bishop/knight) was impossible — a real feature gap, not just polish. Knight promotion in particular is sometimes the only winning move.

**Fix:**
- New `src/components/ui/PromotionModal.tsx` — a centered modal styled to match the project aesthetic (`ClayCard` glass, accent glow, 3D `PieceView` previews of each option).
- `executeMove` now detects promotion moves via `chess.js`'s verbose move list and defers application until the user picks a piece.
- Modal supports keyboard shortcuts (Q / R / B / N) plus Escape to cancel.
- Color of the rendered preview pieces matches the side that's promoting.
- Cancel reverts cleanly — no move is applied, board stays at the pre-move position (because `executeMove` returns true to satisfy react-chessboard's drop handler but only applies state once a piece is selected).

## Progress

- [x] Audit complete — identified one real race + one minor cleanup
- [x] Fix 1: monotonic guard
- [x] Fix 2: bot timeout cleanup
- [x] Fix 3: pawn promotion modal + under-promotion support
- [x] Type-check verified on changed files
- [x] Pushed to `origin/main`
