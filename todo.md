# Chessify — TODO

## Playchessify Oracle (Stacks) — Remaining (2026-06-26)

Contracts live + wired + frontend flipped (see `docs/PLAYCHESSIFY_ORACLE.md`). `tsc` clean.
Two items left to close the gasless oracle work:

- [ ] **Client sponsored-tx wiring** — make `useStacksChess` player actions use
  `openContractCall({ sponsored: true })` and POST the signed `txRaw` to
  `/api/stacks/sponsor` (backend already built). Gate behind `NEXT_PUBLIC_STACKS_GASLESS`
  (default off) so the self-pay path stays default until verified. **Needs a real
  browser + a 0-STX Leather/Xverse wallet to test** — sponsored support is wallet-dependent.
- [ ] **`npm run build`** — final gate on the flip + sponsor backend (tsc is clean; build
  catches Next route/runtime issues).

Env to set before the backend functions (server-side, not committed):
- [ ] `STACKS_ORACLE_PRIVATE_KEY` — settle route (value in gitignored `.env.oracle.local`, oracle `SP3AB4M3W69SXTBNVR09FGZ7HX0ESY222545SM914`)
- [ ] `STACKS_GAS_SPONSOR_PRIVATE_KEY` — sponsor route; **create + fund a dedicated sponsor wallet** with STX
- [ ] Fund the oracle wallet `SP3AB4…` with a little STX (it pays its own `settle-game` fees)

---

# Chessify — Base Migration TODO

## Done This Session
- [x] Integrated Base Builder Codes (ERC-8021) into Privy provider plugin
- [x] Created `src/lib/builder-code.ts` — ERC-8021 suffix utility
- [x] Wrote `base-contracts/ChessGame.sol` — lean contract, settleDraw, Base block constants
- [x] Wrote `base-contracts/ChessToken.sol` — Base block constants fixed
- [x] Fixed relay injection vulnerability in `GameClient.tsx` (player address check per move)

---

## Remaining

### Phase 1 — Deploy Contracts
- [ ] Deploy `ChessToken.sol` to Base Mainnet → copy token address
- [ ] Deploy `ChessGame.sol(tokenAddress)` to Base Mainnet → copy game address
- [ ] Add deployed addresses + real builder code to `.env`

### Phase 2 — Config & ABI
- [ ] `src/config/contracts.ts` — add `BASE_CONTRACTS`, `BASE_CHAIN_ID = 8453`, fix `BLOCK_TIME_SECS = 2`
- [ ] `src/config/wagmi.ts` — add `base` chain + transport
- [ ] `src/config/abis.ts` — strip dead entries, add `settleDraw` + `drawProposal` view + new events

### Phase 3 — Hook
- [ ] Create `src/hooks/useBaseChess.ts`
  - `createGame`, `joinGame`, `resign`, `reportWin`, `settleDraw`
  - `writeWithAttribution` wrapper (encodeFunctionData + ERC-8021 suffix + sendTransaction)
  - All writes attributed to builder code automatically

### Phase 4 — Relay
- [ ] `src/lib/moves-store.ts` — add `'base'` to `Chain` type
- [ ] `src/hooks/useGameMoves.ts` — add `'base'` to `Chain` type
- [ ] `src/app/api/games/[chain]/[id]/moves/route.ts` — accept `'base'` as valid chain

### Phase 5 — Frontend
- [ ] `src/components/game/GameClient.tsx`
  - Swap `useCeloChess` → `useBaseChess` for Base chain
  - Add `drawProposal` read (poll `drawProposal(gameId)` on-chain every 4s)
  - Add draw settlement UI (PROPOSE DRAW / ACCEPT DRAW buttons)
  - Update chain label references

### Phase 6 — Ship
- [ ] Build + verify locally
- [ ] Deploy to Vercel
- [ ] Set real `NEXT_PUBLIC_BASE_BUILDER_CODE` in Vercel env
- [ ] Verify attribution on base.dev dashboard after first transaction
