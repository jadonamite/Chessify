# Chessify ⇐ playchessify Port — Handover

**Goal:** bring the original multi-chain **Chessify** (Stacks + Celo + Stellar) up to date with all the UI/UX, features, and architecture introduced in **playchessify** (the Celo-only redesign) — **with Stacks as the first-class chain** in every chain-aware decision.

**Last updated:** 2026-06-17 · **Repo:** github.com/jadonamite/Chessify (branch `main`)

---

## ⚡ 2026-06-17 (cont.) — Oracle settlement BACKEND ported (dormant, build-clean, uncommitted)

Read the full playchessify settlement stack one file at a time and ported it into
Chessify as **multi-chain, server-only, DORMANT** infrastructure. Nothing here runs
against the live (legacy) contracts and the frontend resolution path was **not**
touched, so live games are unaffected. `npm run build` clean (Turbopack, fresh
`.next`); `clarinet check` clean (7 contracts).

**Key structural finding driving the port:** the 2026-06-17 contract port *converged*
`celo-contracts/` and `base-contracts/` ChessGame.sol into ONE shape (byte-identical
except `EXPIRY_BLOCKS`). So the EVM surface collapses from two ABIs/hooks to one.

**New files (all additive — legacy ABIs/hooks/contracts untouched):**
- `src/config/abis.ts` → added `EVM_CHESS_ORACLE_ABI` (single converged 7-field
  getGame + settleGame/setOracle/oracle/reclaimExpired/canReclaim/proposeDraw/
  acceptDraw/events) and `EVM_CHESS_TOKEN_ABI` (adds `mintTo`/`setMinter`/`minter`).
  Legacy `CHESS_GAME_ABI` / `BASE_CHESS_GAME_ABI` left in place for the live frontend.
- `src/lib/evm-server.ts` (SERVER-ONLY) → playchessify `celo-server.ts` generalized to
  chain-parameterized (`celo`|`base`) oracle/minter/gas-sponsor signers + reads. Shared
  operator keys across both EVM chains. Lazy key loading (import is build-safe). Gas
  sponsorship: Celo USDm drip + native CELO; Base native ETH drip.
- `src/lib/settle-game.ts` (SERVER-ONLY) → `settleGameById(chain,gameId)`: replay +
  signed-move re-verification + Redis lock + oracle settle. EVM only; Stacks returns
  `unsupported-chain` until the Clarity oracle deploys. Reuses Chessify's already-superior
  `settlement.ts` (`addrEq`, Stacks-safe) and `moves-store.ts` (multi-chain active set).
- `src/lib/game-index.ts` (SERVER-ONLY) → per-chain Upstash index (cursor + players +
  player-games) for leaderboard/history; delta-scan via converged ABI multicall.
- Routes: `api/games/[chain]/[id]/settle` (celo|base|stacks→501), `api/cron/settle`
  (sweeps celo+base, CRON_SECRET-gated), `api/gas/sponsor` (MiniPay USDm + native EOA
  drip, Sybil guards), `api/history?address&chain`, `api/leaderboard?chain`.
- `contracts/chess-game-oracle.clar` → Stacks oracle model: `oracle` var + `set-oracle`
  (owner), `settle-game` (oracle-only, result 1/2/3), `reclaim-expired` backstop
  (EXPIRY-BLOCKS u144 ≈ 1 day). Drops submit-move/report-win/claim-timeout and the
  turn/move-count/last-move-block struct fields (mirrors EVM convergence). Keeps
  create/join/resign/propose-draw/accept-draw/cancel + Elo. Added to `Clarinet.toml`,
  passes `clarinet check`. Uses `.chess-token-v4 gateway-release` like v2.

**NOT done (still gated — irreversible / live-mainnet / needs Jadon):**
- **No deploys.** EVM oracle contracts + minter token, and `chess-game-oracle.clar`,
  are all undeployed. `evm-server`/`settle-game` target `settleGame`/`mintTo`, which
  the deployed legacy contracts don't expose → all settlement code is inert until deploy.
- **No frontend flip.** `config/contracts.ts` addresses, `useCeloChess`/`useBaseChess`,
  `GameClient`, and the live `CHESS_GAME_ABI`/`BASE_CHESS_GAME_ABI` are unchanged. The
  EVM-path unification (fold `useBaseChess` into one oracle hook, drop dead
  submitMove/claimTimeout/reportWin writes, repoint to `EVM_CHESS_ORACLE_ABI`) happens
  *with* the deploy, atomically — see drift notes below.
- **No Vercel Cron wired.** `api/cron/settle` exists but `vercel.json` has no schedule —
  adding it is the activation switch (do it post-deploy).

**Env to add at activation (server-side; NOT committed):**
`ORACLE_PRIVATE_KEY`, `MINTER_PRIVATE_KEY`, `GAS_SPONSOR_PRIVATE_KEY` (operators per
memory: oracle `0x4d68`, minter `0x4548`, gas-sponsor `0xc26f` — must be set as
oracle/minter on each redeployed contract + funded with native gas per chain),
`CRON_SECRET`, optional `CELO_RPC_URL`/`BASE_RPC_URL`/`NEXT_PUBLIC_FEE_CURRENCY`.
`UPSTASH_REDIS_REST_URL`/`_TOKEN` already used by the relay.

**⚠️ Frontend↔contract drift to fix at the flip (verified, file:line):** deployed Celo
`getGame` is a 10-field tuple in `CHESS_GAME_ABI` (turn/moveCount/lastMoveBlock at
abis.ts:21-24) — the oracle struct is 7-field, so positional decode breaks; Base's
`settleDraw`+`drawProposal` (abis.ts:43,59; `useBaseChess.settleDraw`; GameClient:182
poll) is replaced by propose/accept; `submitMove`/`claimTimeout`/`reportWin` are gone.
These only bite once the new contracts are live and reads/writes repoint to the oracle ABI.

---

## ⚡ 2026-06-17 — Oracle settlement port: EVM contracts done, rewire gated (uncommitted)

Full read of the **playchessify** source tree + its live env confirmed playchessify is now
**ahead on settlement architecture** (and Celo-only), while Chessify is ahead on multi-chain.
playchessify runs a **live oracle settlement system** that Chessify lacked:

- Live playchessify Celo deploy (from `.env.production`): **game `0xb378…`**, **minter token `0x3f7e…`**,
  plus `ORACLE_PRIVATE_KEY`, `MINTER_PRIVATE_KEY`, `GAS_SPONSOR_PRIVATE_KEY` hot keys. The
  playchessify README's "old / pre-oracle" addresses are **stale** — oracle is live there.
- Chessify's deployed contracts (all chains) still run the **legacy player-submitted `reportWin`**.

**Done this session (source only — reversible, NO deploys, NO commits):**
- `celo-contracts/ChessGame.sol` → **oracle model**: `settleGame(gameId,result)` + `onlyOracle`,
  `setOracle`, `reclaimExpired` backstop, `GameSettled`/`OracleUpdated` events. EXPIRY_BLOCKS 17_280.
  Dropped legacy `reportWin`/`claimTimeout`/`submitMove`/`timeoutBlocks`. Verbatim port of
  playchessify's compiling source, Celo-titled.
- `base-contracts/ChessGame.sol` → same, EXPIRY_BLOCKS **43_200** (Base ~2s blocks), Base-titled.
- `celo-contracts/ChessToken.sol` + `base-contracts/ChessToken.sol` → added the **minter role**:
  `minter`, `setMinter`, `mintTo` (`onlyMinter`), `NotMinter`/`MinterUpdated`. Faucet cooldowns
  preserved (Celo 17_280 / Base 43_200).
- Each `ChessGame` carries a `⚠️ UPGRADE TARGET` header: deployed bytecode still runs the old
  model — do NOT point the frontend at this source until redeployed + `setOracle` called.
- `README.md` → settlement section rewritten to the oracle model; new **"🔀 Migration Status"**
  section enumerates the gated remainder; deployed addresses relabelled "legacy player-model".

**Verification:** `reportWin` now appears only in a comment in both ChessGame files; both expose
`settleGame/onlyOracle/setOracle/reclaimExpired`, both tokens expose `mintTo/onlyMinter`. `forge`
is available locally; full compile happens in the deploy env (Chessify `*-contracts/` are loose
`.sol`, not a Foundry project — playchessify's `celo-contracts/` is the Foundry reference).

**GATED — remaining oracle migration (irreversible / live-mainnet escrow; needs Jadon):**
1. **Deploy** new oracle `ChessGame` + minter `ChessToken` on Celo + Base; `setOracle` / `setMinter`
   (needs operator keys + real gas — do not auto-run mainnet broadcasts).
2. **Stacks**: author the **Clarity** oracle/minter equivalent from scratch — no Solidity port
   applies; deployed Clarity is still player-model.
3. **Backend port** from playchessify (Celo-only → per-chain): `lib/celo-server.ts` (oracle/minter/
   sponsor signers), `lib/settle-game.ts`, `lib/game-index.ts`, and routes
   `api/games/[chain]/[id]/settle`, `api/cron/settle` (Vercel Cron, every min), `api/gas/sponsor`.
   Gas sponsorship is **Celo/MiniPay-specific** (USDm drip + ERC-4337 Pimlico) — degrade to self-pay
   on Base/Stacks.
4. **Frontend rewire**: repoint `config/contracts.ts` + `config/abis.ts` at new addresses/ABIs;
   switch resolution from player `reportWin` → oracle-triggered `settleGame`. **Flipping before
   redeploy breaks live games on the old contracts.**
5. **Operators**: fund + register oracle / minter / gas-sponsor keys per chain (cf. memory:
   playchessify operators oracle `0x4d68`, minter `0x4548`, gas-sponsor `0xc26f`).

**Also still un-ported from playchessify (safe/additive, gated on a build-verify pass):**
mobile UI — `ui/icons/index.tsx` (Solar duotone set), `ui/BottomNav.tsx`, `app/app/layout.tsx`;
decomposed game components (`game/BoardPanel|CapturedTray|GameActionBar|GameHeader|
GameResultOverlay|GameSidebar|MoveLog|AmbientBackground|types.ts` — Chessify's `GameClient` is
still monolithic); `api/history` + `api/leaderboard` routes; `hooks/useGameData.ts`.

---

## ⚡ 2026-06-10 — Relay hardening + Base completion (build-clean, uncommitted)

Two tracks landed bringing Chessify toward playchessify's newer backend:

**Relay hardening + signed moves (chain-agnostic).** The move relay used to only
race-guard `moveNumber`; it now validates server-side.
- `src/lib/settlement.ts` (NEW, client-safe): `canonicalMoveMessage`, `deriveResult`,
  `sideToMoveAddress`, `RESULT`, chain-aware `addrEq` (never lowercases Stacks).
- `src/lib/onchain-read.ts` (NEW, server-only, read-only): `getOnchainGame(chain,id)`
  dispatch — viem for celo/base (per-chain getGame ABI), Hiro read for stacks.
- `src/app/api/games/[chain]/[id]/moves/route.ts`: POST now enforces **legality**
  (chess.js replay) + **turn order** + **game-active** + **signature** (when present).
  Slow-finality chains (stacks) degrade to legality/sig when the game isn't confirmed yet.
- `MoveRecord` gained `sig?`/`signer?` (moves-store + useGameMoves). `chess:active:{chain}`
  set + register/unregister/getActiveGameIds added (sweep list for a future settle worker).
- `src/hooks/useMoveSigner.ts` (NEW): EVM signs each move silently (Privy); Stacks stays
  unsigned (avoids per-move wallet popups). `useGameMoves.submitMove` takes an optional
  signCtx and posts `sig`(+`publicKey` for stacks). Wired into `GameClient`.

**Base — frontend completion** (contracts already live on Base mainnet, see `deploy.log`:
token `0x6aab…e4e4`, game `0x309f…5ac3`). All frontend:
- `config/wagmi.ts` + `app/providers.tsx` add Base; `config/abis.ts` adds `BASE_CHESS_GAME_ABI`
  (5-field getGame tuple, `settleDraw` two-step, `drawProposal` view, draw events).
- `hooks/useBaseChess.ts` (NEW): create/join/resign/reportWin/settleDraw; `chainId` on every
  write. Builder-Code (ERC-8021) attribution stays global via the Privy `dataSuffix` plugin —
  do NOT re-append in the hook (double-suffix).
- Base wired through: `wallet-provider` (`activeChain` gains `'base'`, `connectBase`,
  EVM address shared with Celo), `GameClient` (base branch + `drawProposal` poll, no
  claimTimeout/submitMove/cancel — Base contract lacks them), `useLobby`, `LobbyContent`
  (create/join/balance/stats), `FaucetContent` (+claimBase), `useBaseLeaderboard` +
  `LeaderboardContent`, `useHistory`, `ChainSelectModal` (Base card), `Navbar` badge,
  `FaucetResultModal` (BaseScan link). `public/base-logo.svg` added.
- TODO before live: set real `NEXT_PUBLIC_BASE_BUILDER_CODE` (still `bc_placeholder`) in
  `.env` + Vercel.

`npm run build` clean (Turbopack) after clearing `.next`. Still needs a human browser pass
per chain (Privy + wallet popups can't be automated): connect Base via ChainSelect → faucet →
create/join → relay move sync → out-of-turn/illegal POST rejected (403/422) → reportWin/draw.

**Known minor gap (not fixed):** `app/profile/[identifier]/page.tsx` reads Celo `playerStats`
regardless of chain. For a Base/EVM address it shows Celo stats. Left as-is — which chain's
stats to show on a chain-agnostic `.chess` identity is a design decision, not a quick swap.

**Deferred (explicit, by Jadon):**
- **Stellar** — Soroban contract written (`stellar-contracts/.../lib.rs`, self-report +
  timeout) but NOT deployed and zero frontend. From-scratch: deploy (funded keys) + Freighter
  wallet dep + full frontend wiring. Tracked follow-up.
- **Oracle settlement + cron worker + gas sponsorship + `reclaimExpired`** — the rest of
  playchessify's backend. Needs contract redeploys on all chains (incl. live Base) and an
  EVM token minter role that doesn't exist. The Phase-1 signed-move relay is the prerequisite.
  **→ UPDATE 2026-06-17:** the EVM contract half is now ported (oracle `ChessGame` + minter
  `ChessToken` on both `celo-contracts/` and `base-contracts/`) — see the 2026-06-17 section
  at the top for what's done and the gated deploy/backend/frontend/Stacks remainder.

---

## ✅ PORT STATUS — Phases A–F complete (pushed to `main`)

All six phases of §4 are implemented and pushed. `npm run build` is clean (Turbopack);
`tsc` is clean except one pre-existing Privy `createOnLogin` type error (tolerated by
`next.config.ts` `ignoreBuildErrors`).

| Phase | What shipped | Commit |
|---|---|---|
| A | Chain-agnostic infra: settings/toast stores, audio + AudioManager, 5 piece sets, CenterToast, assets | `e2ce615` |
| B | Redesigned `ui/Navbar` (trapezoid links, music toggle, parallelogram wallet pill) multi-chain-adapted; Hero re-export; old inline nav removed | `0078c3e` |
| C | `/app/settings` (chain-aware signing) + `/app/leaderboard` (active-chain; Celo `useLeaderboard` + new `useStacksLeaderboard`) | `bb26f06` |
| D | Lobby `.chess` onboarding banner + ChessName/ChessAvatar rows in lobby & history | `0f0e910` |
| E | GameClient merge: piece sets, board themes, move hints, GET HINT (`getHintMove`), move chimes, AI depth, player headers | `8d0b025` |
| F | Build/type verification + this doc update | — |

**Deferred / not ported (intentional):**
- **Opponent turn countdown** (playchessify's cosmetic 5-min timer): skipped — it had no
  on-expiry enforcement in the source, and Chessify's **REPORT WIN** already handles timeout claims.
- **CapturedTray** (captured-pieces display via `getCaptureSummary`): not in the §4 scope; skip unless wanted.
- Two harmless `react-hooks/exhaustive-deps` warnings on the stable `getCtx` callback in GameClient.

**⚠️ STILL NEEDS A HUMAN:** browser-test both chains end-to-end (wallet connect, claim `.chess`,
leaderboard, in-game settings) on the Vercel preview — see §8. This could not be automated
(requires Privy login + Leather/Xverse signature popups). Also still pending from §1/§2:
swap the borrowed Privy app ID for a dedicated Chessify Privy app, and set Chessify's own
Talent Protocol `talentapp:project_verification` meta in `app/layout.tsx`.

---

## 0. Read this first — what went wrong, what's true now

The first pass treated this as a *backend port* and missed that playchessify is a **full UI/UX redesign**. The wallet migration and the `.chess` profile *backend* were ported correctly, but the **navigation, leaderboard, settings, audio, multi-piece-set board, and lobby onboarding were NOT** — so in the live app you currently see **no `.chess` identity surface and no leaderboard**, because those pages/components don't exist in Chessify yet.

**The correct mental model:** port playchessify's UI wholesale (Navbar, Settings, Leaderboard, stores, audio, piece system, onboarding), and at each chain-touching point adapt to Chessify's **multi-chain `useWallet`** instead of playchessify's Privy/Celo-only assumptions. Do NOT bolt fragments onto Chessify's old UI.

---

## 1. Current state (already done + pushed to `main`)

| Area | Status |
|---|---|
| **Wallet** — Privy for Celo/EVM + social, `@stacks/connect` kept for Stacks, `activeChain` toggle, `ChainSelectModal` | ✅ Done, **STX connect confirmed working live** |
| `reown.ts` / `web3auth.ts` / `web3auth-connector.ts` removed; `config/wagmi.ts` (Privy) added | ✅ |
| `NEXT_PUBLIC_PRIVY_APP_ID` in `.env` (reused playchessify's public client ID) | ✅ (swap for a dedicated Chessify Privy app + domains later) |
| **`.chess` profile backend** — 7 API routes, `profile-store.ts`, `useProfile`, `useBatchProfiles` | ✅ |
| **Stacks-first profile correctness** — see §6 | ✅ |
| `ChessName`, `ChessAvatar`, `ClaimModal`, `/app/profile/[identifier]` | ✅ ported |
| Minimal profile pill on the **old** inline Hero navbar | ⚠️ **To be replaced** by the real `ui/Navbar` (§4) |

**Reusable foundations already built (use these — don't reinvent):**
- `src/lib/profile-address.ts` — `detectChain()`, `normalizeAddress()` (lowercases EVM, **preserves Stacks case**), `isValidProfileAddress()`
- `src/lib/verify-signature.ts` — `verifyProfileSignature()`: viem for EVM, `verifyMessageSignatureRsv` + `getAddressFromPublicKey` for Stacks (round-trip verified against installed libs)
- `src/hooks/useSignProfileMessage.ts` — chain-aware signing: wagmi `signMessageAsync` (EVM) / `openSignatureRequestPopup` (Stacks). Returns `{ signature, publicKey? }`.

---

## 2. playchessify architecture (the new UI / build / "thought")

**Design language:** dark cyber-industrial. CSS variables in `globals.css` (`--c` cyan accent #00ccff, `--bg`, `--t1/t2/t3` text tiers, `--fd` display font, `--fb` body, `--grid-line`). Framer Motion throughout, glassmorphism (blur + borders), parallelogram/trapezoid clip-paths, ambient blobs + grid background on every page.

**Navigation (the keystone):** `src/components/ui/Navbar.tsx` is the single nav, and `Hero.tsx` **re-exports it**:
```ts
export { default as Navbar } from '@/components/ui/Navbar'
```
So every page does `import { Navbar } from '@/components/landing/Hero'` and gets the redesign. The navbar:
- Sticky, blur, logo left
- **Centered trapezoid** with links: **Leaderboard · History · Faucet · Settings**
- Music toggle (reads `useSettingsStore.soundEnabled`, calls `stopAmbient()`)
- **Parallelogram wallet pill**: pulse dot + `ChessAvatar` + `ChessName short` → `/app/profile/{address}`, divider, logout icon
- Mobile hamburger → animated drawer (same links + music + profile/disconnect)

**State stores (zustand):**
- `useSettingsStore` (persisted `chessify-settings`): `soundEnabled`, `boardTheme` (dark/forest/classic/midnight), `pieceSet` (5 sets), `aiDifficulty` (easy/med/hard → minimax depth 1–3 via `AI_DEPTH`), `showMoveHints`. Exports `BOARD_THEMES`, `PIECE_SETS`, `AI_DIFFICULTY_LABELS`.
- `useToastStore`: `showToast(msg, type)` where type ∈ success|error|info|invalid|check|checkmate|draw. Rendered by `ui/CenterToast.tsx`, mounted in `providers.tsx`.

**Audio (`lib/audio.ts` + `components/AudioManager.tsx`):** two looping MP3s (landing vs game) with volume fades + Web Audio API synthesized move sounds. API: `startAmbient` / `startGameTrack` / `stopAmbient` / `setMuted` / `playMoveSound(ctx, isOpponent)`. Gated by `soundEnabled`. Assets in `public/music/` (2 files).

**Board piece system (`lib/chessPieces.tsx`):** `piecePath(set, code)` and `buildPieces(set)` (memoized react-chessboard renderer). **5 SVG sets** in `public/pieces/{chessnut,caliente,maestro,fresca,cooke}`. `GameClient` selects via `buildPieces(useSettingsStore().pieceSet)`; board colors via `BOARD_THEMES[boardTheme]`.

**Settings page (`/app/settings`):** Sound toggle, AI Difficulty (3 buttons), Move Hints toggle, Board Theme grid (mini previews), Piece Set grid (SVG previews), Profile section (inline claim/edit, signs an update).

**Leaderboard (`/app/leaderboard` → `lobby/LeaderboardContent.tsx`):** podium top-3 (gold/silver/bronze medals + titles), ranked rows 4+, "YOUR POSITION" banner, `useLeaderboard` (Celo multicall scan of all games → unique players → `playerStats` → sort by rating) + `useBatchProfiles` for names/avatars.

**Lobby (`lobby/LobbyContent.tsx`):** `.chess` **onboarding banner** for a connected wallet with no profile (`useProfile(addr)` → null) → opens `ClaimModal`. Challenger rows render `ChessAvatar` + `ChessName asLink`.

**Landing (`Hero.tsx`):** badge "ON-CHAIN CHESS — MULTI-CHAIN", `TypingHeroText`, 3D `ChessModels`, redirects to `/app/lobby` when connected.

**Layout (`app/layout.tsx`):** mounts `Providers`; carries a Talent Protocol verification `<meta>` (`talentapp:project_verification`) — Chessify needs its OWN token value here, do not copy playchessify's.

---

## 3. Why you see nothing right now (the concrete gaps)

| Missing in Chessify | Effect |
|---|---|
| `ui/Navbar.tsx` (real redesign) + Hero re-export | No Leaderboard/Settings links, no proper profile pill → can't reach `.chess` |
| `/app/leaderboard` + `LeaderboardContent` + `useLeaderboard` | No leaderboard at all |
| `/app/settings` + `useSettingsStore` | No settings, no theme/piece/sound control |
| `useToastStore` + `CenterToast` | No toasts |
| `lib/audio.ts` + `AudioManager` + `public/music/*` | No music/sound |
| `lib/chessPieces.tsx` + `public/pieces/*` (5 sets) | No custom pieces / piece switching |
| Lobby `.chess` onboarding banner | No prompt to claim a name |
| `ChessName`/`ChessAvatar` in lobby/history/game lists | Raw addresses everywhere |

---

## 4. Corrected Stacks-first integration plan (for the new chat)

Order chosen so the visible surface returns fast, Stacks stays first-class, and risky merges come last.

**Phase A — Chain-agnostic infra (pure additions, low risk)**
1. Copy assets: `public/pieces/{chessnut,caliente,maestro,fresca,cooke}` and `public/music/*.mp3` from playchessify.
2. Port `hooks/useSettingsStore.ts`, `hooks/useToastStore.ts`, `ui/CenterToast.tsx`, `lib/audio.ts`, `components/AudioManager.tsx`, `lib/chessPieces.tsx` — all chain-agnostic, copy as-is.
3. Mount `CenterToast` + `AudioManager` in Chessify `providers.tsx` (next to `WalletProvider`).

**Phase B — The Navbar (unblocks all reachability)**
4. Port playchessify `ui/Navbar.tsx` into Chessify, then add `export { default as Navbar } from '@/components/ui/Navbar'` to Chessify's `Hero.tsx` and DELETE the old inline `Navbar` function there. All pages already import `{ Navbar } from '@/components/landing/Hero'`, so they pick it up automatically.
5. **Multi-chain adapt** the ported Navbar (see §5): use `connectWallet` (opens `ChainSelectModal`) not Privy `connect`; resolve the pill address as `activeChain==='stacks' ? stacksAddress : address`; show the active chain badge (CELO #35ee66 / STX #ff9900); keep `ChainSelectModal` rendered (it lives in the current Hero Navbar today — move it into `ui/Navbar`).

**Phase C — Settings + Leaderboard pages**
6. Port `/app/settings/page.tsx` — swap `useSignMessage` → `useSignProfileMessage` (already built); use active-chain address; pass `publicKey` to `updateProfile`.
7. Port `/app/leaderboard/page.tsx` + `LeaderboardContent` + `useLeaderboard` (Celo). Add a **Stacks ranking reader** using existing `useStacksRead` (`getTotalGames` → loop `getGame` → collect principals → `getPlayerStats`); show the leaderboard for the **active chain**. ⚠️ needs `chess-game.clar` Clarity response field names — read the contract.

**Phase D — Lobby onboarding + list identities**
8. Add the `.chess` onboarding banner to Chessify `LobbyContent` (use `useProfile(activeAddress)`); render `ChessAvatar`+`ChessName` in challenger rows; do the same in `HistoryContent`.

**Phase E — GameClient polish (the big, risky merge)**
9. Into Chessify's **multi-chain** `GameClient` (it branches `useCeloChess`/`useStacksChess` — preserve that), transplant from playchessify: `buildPieces(pieceSet)` + `BOARD_THEMES[boardTheme]`, legal-move highlights (gated by `showMoveHints`), GET HINT, promotion modal, opponent timeout, `playMoveSound`, player headers with `ChessName`/`ChessAvatar`. Do NOT overwrite the file — merge UX into the existing logic.

**Phase F — Verify + docs**
10. `npm run build`; browser-test BOTH chains; update `README`/this handover. Update `~/.claude/context.md` if status changes.

**Push after each phase** so it can be tested on the live (Vercel) preview.

---

## 5. Multi-chain adaptation cheatsheet (playchessify → Chessify `useWallet`)

playchessify's `useWallet` is Privy/Celo-only. Chessify's exposes:
`address` (EVM), `stacksAddress`, `isConnected` (EVM via Privy), `isStacksConnected`, `activeChain` ('celo'|'stacks'), `connectWallet()` (opens `ChainSelectModal`), `connect`/`connectStacks`/`connectSocial`, `disconnectAll`, `userSession`.

When porting any playchessify component, apply:
- `const active = activeChain === 'stacks' ? stacksAddress : address` — use `active` wherever playchessify used `address`.
- `connected = isConnected || isStacksConnected`.
- Replace Privy `connect` triggers in nav/landing with `connectWallet` (→ chain picker).
- Replace `useSignMessage()` with `useSignProfileMessage()` and forward `publicKey`.
- Anything reading Celo contracts (`useLeaderboard`, `usePlayerHistory`, `playerStats`) must be **gated to `detectChain(addr)==='celo'`** and given a Stacks sibling via `useStacksRead`.

---

## 6. Solved Stacks gotchas (already handled — keep them)

- **Address case:** Stacks `SP…` is case-sensitive; EVM is not. `normalizeAddress` lowercases only `0x…`. Never `.toLowerCase()` a Stacks address used as a Redis key.
- **Signature verification:** EVM = `viem.verifyMessage`. Stacks = `verifyMessageSignatureRsv({message,signature,publicKey})` **AND** `getAddressFromPublicKey(publicKey, network) === address` (network from `SP/SM`=mainnet, `ST/SN`=testnet). The publicKey must travel in the request body — `ClaimModal`/settings already send it via `useSignProfileMessage`.
- **"My address" bug:** `useWallet().address` is EVM-only. For Stacks users use the active-chain address (the profile page already does this).
- **Avatar:** `lib/avatar.ts` uses real hex bytes for EVM, a rolling hash for Stacks base32 (so `parseInt` doesn't NaN).

---

## 7. File inventory (playchessify → Chessify)

✅ done · ✗ missing (port) · ⚠️ diverged (merge) · ＝ chain-agnostic copy

```
api/profile/* (7 routes) ............ ✅ ported + Stacks-extended
api/games/[chain]/[id]/moves ........ Chessify has (multi-chain moves relay)
app/profile/[identifier]/page ....... ✅ ported (active-chain aware)
app/leaderboard/page ................ ✗ port  (+ Stacks ranking reader)
app/settings/page ................... ✗ port  (chain-aware signing)
ui/Navbar.tsx ....................... ✗ port + multi-chain adapt (KEYSTONE)
landing/Hero.tsx .................... ⚠️ add Navbar re-export, drop inline nav
lobby/LeaderboardContent ............ ✗ port
lobby/LobbyContent .................. ⚠️ add onboarding banner + ChessName rows
lobby/HistoryContent ................ ⚠️ ChessName/ChessAvatar rows
faucet/FaucetContent ................ ⚠️ minor (toast/identity polish)
game/GameClient ..................... ⚠️ MERGE polish into multi-chain version
components/AudioManager ............. ✗ port (＝)
ui/CenterToast ...................... ✗ port (＝)
ui/ChessName, ui/ChessAvatar ........ ✅ ported
ui/ClaimModal ....................... ✅ ported (chain-aware signing)
ui/ChainSelectModal ................. Chessify has (multi-chain, keep)
ui/{GlowButton,ClayCard,LoadingState,PromotionModal,GameStatusModal,
     FaucetResultModal,StatBadge,ThemeToggle,TypingHeroText,
     ChessModels,ComingSoonOverlay} . Chessify has (verify parity when used)
hooks/useSettingsStore .............. ✗ port (＝)
hooks/useToastStore ................. ✗ port (＝)
hooks/useLeaderboard ................ ✗ port (Celo) + Stacks sibling
hooks/usePlayerHistory .............. ✅ ported (Celo; Stacks later)
hooks/useProfile, useBatchProfiles .. ✅ ported
hooks/{useCeloChess,useLobby,useHistory,useGameMoves} . ⚠️ diverged (Chessify multi-chain)
hooks/useStacksChess, useStacksRead . Chessify-only (Stacks reads/writes — use for rankings)
lib/audio ........................... ✗ port (＝)
lib/chessPieces ..................... ✗ port (＝, 5 sets)
lib/avatar, profile-store, profile-address, verify-signature . ✅ (last two are NEW Chessify)
lib/{chess-engine,moves-store,index} . Chessify has
types/profile ....................... ✅ ported
public/pieces/{5 sets}, public/music/{2 mp3} . ✗ copy assets
```

---

## 8. Test checklist (browser, both chains)
- Connect Celo (Privy) and Stacks (Leather/Xverse) via `ChainSelectModal`; chain switch persists.
- Claim a `.chess` name on **Stacks** (signature popup → server verifies RSV + address match) and on **Celo**.
- Nav pill shows avatar + `.chess` name; links to profile; edit profile on both chains.
- Leaderboard renders for the active chain; settings (theme/piece/sound/hints) apply in-game.

---

## 9. Notes
- `playchessify` is **non-commercial** (dummy in-game token) → CC-BY-NC piece assets are fine to reuse.
- Commits: **no `Co-Authored-By` trailer** (Jadon's preference).
- Chessify `.env` is gitignored (57KB of distribution keys) — never stage it.
