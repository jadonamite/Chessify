# Chessify ⇐ playchessify Port — Handover

**Goal:** bring the original multi-chain **Chessify** (Stacks + Celo + Stellar) up to date with all the UI/UX, features, and architecture introduced in **playchessify** (the Celo-only redesign) — **with Stacks as the first-class chain** in every chain-aware decision.

**Last updated:** 2026-05-27 · **Repo:** github.com/jadonamite/Chessify (branch `main`)

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
