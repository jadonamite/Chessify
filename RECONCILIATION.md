# Chessify ↔ playchessify Reconciliation

On-disk file-by-file comparison (NOT git). Goal: bring both repos to the same intricate state.

## Inventory (src/ only)
- 58 files only in **playchessify** (training/coach/analysis stack, landing-v2, new game+ui components)
- 13 files only in **Chessify** (Base/Stacks chain connectors)
- 61 files in both with differing content
- 18 identical

## ⚠️ Architectural conflict (must resolve before merging)
The repos diverged in **opposite directions**:

- **Chessify** = multi-chain: Celo + Base + Stacks.
- **playchessify** = Celo-only, MiniPay-specialized: dropped Base+Stacks, added MiniPay injected connector, USDm/Mento fee currency, Alfajores rehearsal, oracle token model.

"Same state" therefore needs a decision per concern:
- **Chain support**: union (playchessify regains Base+Stacks) OR keep playchessify Celo-only?
- **Token/settlement model**: Chessify legacy player-submitted vs playchessify oracle-settled.

---

## Layer notes

### config/ — DONE
| File | Chessify | playchessify | Reconcile |
|---|---|---|---|
| `abis.ts` | 4 ABIs: CHESS_TOKEN, CHESS_GAME (legacy Celo), BASE_CHESS_GAME, EVM_CHESS_ORACLE, EVM_CHESS_TOKEN | 2 ABIs: CHESS_TOKEN (+oracle fields lastFaucetClaim/mintTo/minter/FaucetCooldown), single oracle CHESS_GAME | playchessify = pruned-to-live oracle model. Chessify keeps multi-chain ABIs for Base/Stacks. **Superset lives in Chessify.** |
| `contracts.ts` | CONTRACT_ADDRESS, STACKS_CONTRACTS, CELO+BASE addrs, per-chain block times, HIRO_API | Celo-only, +USDM_ADDRESS, +Alfajores toggle (IS_TESTNET), FAUCET_COOLDOWN 17280, BLOCK_TIME 5 | Chessify missing: USDm, Alfajores toggle. playchessify missing: Base+Stacks+per-chain block times. **True merge needed.** |
| `wagmi.ts` | chains celo+mainnet+base | chains celo+celoAlfajores+mainnet, +injected() MiniPay connector | playchessify added Alfajores + MiniPay injected; dropped base. **True merge needed.** |
| `app/providers.tsx` | PrivyProvider supportedChains [celo,base], builder-code `dataSuffix` (Divvi referral), logo Piece.svg, no smart wallets | +`SmartWalletsProvider` (ERC-4337/Pimlico), supportedChains [celo] only, +discord login, logo chessify.png, removed dataSuffix | playchessify AHEAD on account-abstraction; Chessify AHEAD on base + Divvi builder code. **True merge.** |
| `components/wallet-provider.tsx` | multi-chain: ActiveChain celo/base/stacks, Stacks session, isWrongChain/switchToCelo, tier minipay\|eoa (smart dormant) | Celo-only but FAR ahead on EVM identity: smart-account `playerAddress` pinning, `identityReady`/`isReady` gating (fixes dual-identity split), MiniPay injected auto-connect, `smartTimedOut` self-heal | **Hardest merge in repo.** playchessify's identity model is the correct one; must re-add Stacks/Base session handling on top of it. |

**Net:** playchessify is ahead on EVM account-abstraction & MiniPay/identity correctness; Chessify is ahead on multi-chain breadth (Base+Stacks) & Divvi builder code. Neither is a strict superset.

### hooks/ — DONE
Two clean sub-patterns:

**(a) Multi-chain dispatchers — Chessify ahead, playchessify pruned to Celo:**
| File | Chessify | playchessify | Reconcile |
|---|---|---|---|
| `useHistory.ts` | 242L, aggregates celo+base+stacks | 48L, celo-only | Chessify is superset; playchessify intentionally dropped other chains |
| `useLobby.ts` | 153L, celo+base+stacks | 72L, celo-only | same |
| `useLeaderboard.ts` | 120L, multi-chain merge | 45L, celo-only | same |
| `usePlayerHistory.ts` | 96L | 39L celo-only | same |
| `useBatchProfiles.ts` | normalizeAddress (multi-chain addrs) | 0x-only | minor; follows profile-address split |
| `useProfile.ts` | isValidProfileAddress/normalizeAddress, publicKey in claim/update | 0x-only, no publicKey | Chessify keeps Stacks pubkey path |

**(b) EVM identity/gas — playchessify AHEAD, Chessify behind:**
| File | Chessify | playchessify | Reconcile |
|---|---|---|---|
| `useCeloChess.ts` | 339L, plain `writeContractAsync` | 503L: per-tier `sponsoredWrite` — smart=Pimlico paymaster userOp, minipay=USDm `feeCurrency` legacy tx, gas-drip via /api/gas/sponsor, retry, GasStatus | **playchessify wins**; Chessify must adopt sponsorship model |
| `useMoveSigner.ts` | activeChain-based, Stacks=no-sign, returns `{sign,publicKey,canSign}` | walletTier-based: smart=EIP-1271 smartClient.signMessage, eoa=signMessage, minipay=null; returns `{signMove,canSign}` | **playchessify wins** for EVM; re-add Stacks branch when merging |

**Chessify-only connector hooks (13-file bucket):** `useBaseChess`, `useBaseLeaderboard`, `useStacksChess`, `useStacksLeaderboard`, `useStacksRead`, `useSignProfileMessage` — these have **no playchessify counterpart by design** (it dropped Base+Stacks). Keep in Chessify; only port to playchessify if multi-chain is re-added.

⚠️ **Protocol divergence:** `useGameMoves` move-signing message prefix differs — Chessify `canonicalMoveMessage` (in settlement.ts) vs playchessify inline `playchessify:move`. Signatures won't cross-verify; must align before sharing a relay/server.
### lib/ — DONE
| File | Direction | Notes |
|---|---|---|
| `settlement.ts` | ⚠️ conflict | Same logic, but **canonical message prefix `chessify:move` vs `playchessify:move`**, and Chessify uses `addrEq`/`normalizeAddress` (multi-chain) vs playchessify `.toLowerCase()` (EVM). Must unify prefix or signatures break. |
| `settle-game.ts` | Chessify ahead (breadth) | Chessify dispatches celo+base+stacks settlement; playchessify celo-only (101L) |
| `chess-engine.ts` | playchessify ahead | +`getCaptureSummary`, `getCoachMove`, `CaptureSummary` (training/coach) |
| `moves-store.ts` | playchessify ahead | +`repairGameHistory` (TOCTOU append-race fix), celo-only typing |
| `profile-store.ts` | playchessify ahead | +`getProfileDirect`, `linkProfileAlias` (alias self-heal for smart-account/EOA split + streak/link) |
| `avatar.ts` | Chessify ahead | 63 vs 52L, multi-chain addr handling |
| `game-index.ts`,`audio.ts`,`chessPieces.tsx` | minor | small diffs, reconcile by hand |
| `index.ts` | cosmetic | "built on Stacks" vs "built on Celo" tagline |

**Counterpart (renamed) pair — NOT unique-by-design:**
- Chessify `lib/evm-server.ts` ⇄ playchessify `lib/celo-server.ts`: same core (getOnchainGame, settleOnChain, mintChessTo, verifyWalletSignature) but Chessify generalized to EVM (`sponsorNative`/`sponsorUsdm`, native+chess+usdm balances → celo+base) while playchessify specialized to Celo (`sponsorCelo`, `celoBalanceOf`, `sponsorGas`). **Reconcile as one file**, ideally Chessify's EVM-generic with Celo as a case.

**Chessify-only lib (keep; multi-chain infra):** `builder-code.ts` (Divvi suffix), `onchain-read.ts` (multi-chain read aggregator), `profile-address.ts` (multi-chain normalize), `stacks-server.ts`, `verify-signature.ts`.
**playchessify-only lib (training stack — port to Chessify):** `analysis/engine.ts`, `coach/client.ts`, `coach/lines.ts`, `coach/voice.ts`, `streak-store.ts`, `train-store.ts`.
### api/ — DONE
| Route | Direction | Notes |
|---|---|---|
| `gas/sponsor` | Chessify ahead (breadth) | Identical logic; Chessify is chain-generic (celo+base, `EvmChain`, scoped redis keys, `sponsorUsdm`/`sponsorNative`); playchessify Celo-specialized (`sponsorGas`/`sponsorCelo`). Chessify version is the superset. |
| `games/[chain]/[id]/moves` (relay) | ⚠️ true merge | **playchessify ahead:** `appendMove(chain,id,record,existing.length)` CAS append = TOCTOU race fix; one-clock move-timeout. **Chessify ahead:** Stacks `publicKey` signature verification, celo+base+stacks. Merge both. |
| `games/[chain]/[id]/settle` | Chessify ahead | multi-chain settle dispatch |
| `cron/settle` | Chessify ahead | multi-chain auto-settle |
| `history` | Chessify ahead | celo+base vs celo-only |
| `leaderboard` | Chessify ahead | celo+base vs celo-only |
| `profile/[address]`,`profile/claim` | playchessify ahead | +alias linking / streak fields (489/83L vs 75L) |
| `profile/name/[username]`,`profile/batch` | minor | small diffs |

**playchessify-only routes (port to Chessify — training/streak/alias):** `coach/explain`, `profile/link`, `profile/streak`, `train/[address]`, `admin/relay/repair`.
**Chessify-only route (keep — Stacks):** `stacks/sponsor`.
### app pages — DONE
| Page | Direction | Notes |
|---|---|---|
| `app/layout.tsx` | playchessify ahead (SEO) | Full OG/twitter/robots/keywords metadata, metadataBase `celo.playchessify.xyz`, icon `playchessify.svg`. ⚠️ **`talentapp:project_verification` token differs per-project — do NOT copy.** Chessify-only: `base:app_id` meta (Base mini-app) — keep. |
| `app/page.tsx` | playchessify ahead | renders `landing/v2/ChessifyLanding`; Chessify still old Hero/Features/CTAFooter |
| `app/profile/[identifier]` | playchessify ahead | +streak UI, alias linking (489 vs 418L) |
| `app/settings` | playchessify ahead | +coach selection, elo (398 vs 363L) |
| `faucet`, `game/[id]`, `leaderboard` pages | cosmetic | import-style / formatting only |
| `not-found.tsx` | cosmetic | trivial |

**playchessify-only pages (port to Chessify):** `app/layout.tsx` (training nav shell), `app/train/*` (coach/[id], game, lesson/[id], placement, page), `landing-v2/page.tsx`.
### components — DONE
**Architecture refactor (key insight):** playchessify **decomposed** the monolithic `game/GameClient.tsx` (Chessify 1043L, multi-chain) into 8 presentational sub-components — `AmbientBackground, GameHeader, BoardPanel, GameSidebar, GameActionBar, GameResultOverlay, MatchIntro, JoinRoom` (+`MoveLog, CapturedTray, types.ts`) — and slimmed GameClient to 702L (Celo-only). Merge = adopt playchessify's decomposition, re-inject Chessify's celo/base/stacks logic into the slimmed container.

**Big UI redesigns — playchessify newer design, Chessify multi-chain wiring (careful manual merge):**
| File | Diff | Notes |
|---|---|---|
| `lobby/LobbyContent.tsx` | 1043L diff | largest UI delta; playchessify 815 vs 696L redesign, celo-only |
| `lobby/LeaderboardContent.tsx` | 543L | playchessify 603 vs 576 |
| `faucet/FaucetContent.tsx` | 473L | playchessify 411 vs 446 (Chessify multi-chain faucet) |
| `ui/Navbar.tsx` | 431L | playchessify 525 vs 508 (train nav links) |
| `lobby/HistoryContent.tsx` | 145L | |
| `ui/ChainSelectModal.tsx` | 129L | Chessify ahead — multi-chain selector (302 vs 334); playchessify trimmed to celo |
| `ui/ChessModels.tsx`, `ui/FaucetResultModal.tsx` | 119L each | |

**Smaller component diffs (manual reconcile):** `ClaimModal, ComingSoonOverlay, GlowButton, PromotionModal, GameStatusModal, landing/Hero, landing/Features` — cosmetic-to-moderate.

**playchessify-only components (port to Chessify — UI redesign + training):** game sub-components above; `landing/v2/*` (ChessifyLanding, MagicRings); `train/*` (TrainingBoard, TrainingGame, TrapButton); `ui/*` (BottomNav, CoachNavIcon, Confetti, HoldButton, icons/index, PageBackground, PlayCard, SceneBoundary, SideNav, StreakCelebration).
**Chessify-only component (keep — theming):** `ui/ThemeToggle.tsx`.
### One-sided stacks & non-src — DONE

**Dependencies (the cleanest summary of intent):**
- **Chessify-only deps:** all `@stacks/*`, `@reown/appkit*`, `@web3auth/*`, `@jadonamite/chessify-sdk`+`fundxagon-sdk`+`stacks-core`, `tsup`, `vitest`+`clarinet-sdk` → multi-chain + **SDK-publishing monorepo** + Clarity tests.
- **playchessify-only deps:** `openai` (AI coach), `permissionless` (ERC-4337 smart accounts), `stockfish` (analysis engine).

**Contracts:** Chessify has `contracts/`(Clarity), `base-contracts/`, `celo-contracts/`, `stellar-contracts/`. playchessify has **only** `celo-contracts/`.

**Top-level:** Chessify = protocol+SDK+ops monorepo (distribution/rebalance/topup scripts, `dist/`, Clarinet, deploy logs). playchessify = clean app repo.

**playchessify-only feature stack to port INTO Chessify (training/coach/streak/smart-wallet):**
- config: `coaches.ts`, `curriculum.ts`, `openings.ts`, `placement.ts`
- hooks: `useAnalysis`, `useCoachStore`, `useGameData`, `useLearner`, `usePlayerStats`, `useProfileLink`, `useStreak`
- lib: `analysis/engine.ts`, `coach/{client,lines,voice}.ts`, `streak-store.ts`, `train-store.ts`
- types: `training.ts`; deps: `openai`, `permissionless`, `stockfish`
- plus all UI/pages/components listed in their layers above
- `globals.css`: playchessify 455 vs 224L — full redesign + training styles (superset, port over)

**Chessify-only chain/infra to (optionally) port INTO playchessify — only if re-multichaining:**
- hooks: `useBaseChess`, `useBaseLeaderboard`, `useStacksChess`, `useStacksLeaderboard`, `useStacksRead`, `useSignProfileMessage`
- lib: `onchain-read`, `profile-address`, `stacks-server`, `verify-signature`, `builder-code`
- api: `stacks/sponsor`; contracts: `contracts/`(Clarity), `base-contracts/`, `stellar-contracts/`
- deps: `@stacks/*`, `@reown/*`, `@web3auth/*`

---

## Reconciliation strategy (recommendation)

These are **not** "one repo behind the other." They forked in opposite directions:
- **playchessify** = focused **Celo/MiniPay consumer product** — smart wallets (ERC-4337/Pimlico), AI coach (OpenAI), Stockfish training, redesigned decomposed UI, race-safe relay, alias/streak. It *deliberately stripped* Stacks/Base/SDK/ops.
- **Chessify** = **multi-chain protocol + SDK + ops monorepo** (Celo+Base+Stacks+Stellar, distribution scripts, published SDKs) with the *older* app UI and *simpler* EVM identity model.

A naive "make every file identical in both" would re-burden playchessify with everything it intentionally shed. So the realistic target is a **one-directional uplift, not symmetric identity**:

**Recommended: port playchessify's app-layer advances UP into Chessify**, keeping Chessify multi-chain:
1. Adopt in Chessify: smart-wallet identity model (`wallet-provider`, `providers`, `useMoveSigner`, `useCeloChess` sponsorship), race-safe relay (`appendMove` CAS), alias/streak (`profile-store`, profile routes), the whole training/coach/analysis stack, redesigned decomposed UI + `globals.css` + `landing/v2`.
2. Keep in Chessify: Base/Stacks connectors, multi-chain hooks/routes, SDK build, contracts dirs.
3. Resolve the ⚠️ conflicts deliberately: **canonical move prefix** (`chessify:` vs `playchessify:`), USDm/Alfajores config merge, `evm-server`⇄`celo-server` unification, per-project Talent verification token (do NOT copy).

This makes **Chessify a true superset**; playchessify stays the lean Celo cut.

---

## IMPLEMENTATION PROGRESS (uplift INTO Chessify; playchessify untouched)

Order in execution: **1 → 3 → 2** (UI consumes the new engine, so identity/protocol lands before UI).

### ✅ Phase 1 — training/coach/streak stack — DONE (tsc 0 errors)
Ported verbatim: `config/{coaches,curriculum,openings,placement}.ts`, `types/training.ts`, `lib/analysis/engine.ts`, `lib/coach/{client,lines,voice}.ts`, `lib/{streak,train}-store.ts`, `hooks/{useAnalysis,useCoachStore,useProfileLink,useLearner,useStreak}.ts`, `components/game/types.ts`, api `coach/explain` + `profile/streak` + `train/[address]`. Deps added: `openai`, `stockfish`. Stockfish worker assets copied to `public/engine/`.
- Wired: `useGameData.ts` + `usePlayerStats.ts` use `EVM_CHESS_ORACLE_ABI as CHESS_GAME_ABI` (live Celo game is the oracle model — same contract `0xf85f…` both repos).

### ✅ Phase 3 (server/identity, non-UI-breaking parts) — DONE (tsc 0 errors)
- `app/providers.tsx`: added `SmartWalletsProvider` (ERC-4337) + discord login. **Kept** base in supportedChains, builder-code `dataSuffix`, Piece.svg.
- `components/wallet-provider.tsx`: **merged** — playchessify smart-identity model (`playerAddress` pinned to smart account, `identityReady`/`isReady`, MiniPay injected auto-connect, `smartTimedOut` self-heal) **+ kept** Chessify multi-chain (Stacks session, Base, `activeChain`, `isWrongChain`/`switchToCelo`, chain-select modal).
- `config/wagmi.ts`: added `injected()` connector (kept base). `config/contracts.ts`: added `USDM_ADDRESS`.
- `lib/profile-store.ts`: added `getProfileDirect`, `linkProfileAlias`, `K.alias`.
- `lib/moves-store.ts`: added atomic CAS `appendMove(…, expectedLen)` (TOCTOU fix) + `repairGameHistory` + `longestLegalPrefix`. Kept multi-chain `Chain`.
- `api/games/[chain]/[id]/moves/route.ts`: append now uses CAS (`existing.length`), rejects lost races.
- Ported routes: `api/profile/link`, `api/admin/relay/repair`. Deps added: `permissionless`.

### ⏳ REMAINING — the atomic gameplay engine+UI chunk (Phase 3-engine + Phase 2)
Must land together (current GameClient consumes OLD hook signatures; new GameClient consumes NEW). Not yet started:
- **Engine hooks:** `useCeloChess.ts` (per-tier sponsorship via `evm-server` — map playchessify's celo-server calls to Chessify's EVM-generic `sponsorUsdm`/`sponsorNative`), `useMoveSigner.ts` (walletTier `signMove` smart/eoa + **keep Stacks no-sign branch**), `useGameMoves.ts` (new `submitMove(san,player,fen,sign)`, **keep multi-chain `Chain`**, import `canonicalMoveMessage` from settlement — do NOT inline `playchessify:move`).
- **Trap to honor:** keep `settlement.ts` prefix `chessify:move` (client+server already agree in Chessify); make ported `useGameMoves` use it.
- **UI (Phase 2):** decomposed `game/*` components (BoardPanel, GameSidebar, GameHeader, MoveLog, CapturedTray, GameActionBar, GameResultOverlay, MatchIntro, JoinRoom, AmbientBackground), slimmed `GameClient.tsx` with multi-chain logic re-injected, `landing/v2/*`, `globals.css` (455L), layout SEO (keep Chessify's own `talentapp` token + `base:app_id`), new `ui/*` (BottomNav, SideNav, Confetti, PlayCard, etc.), `train/*` components + `app/train/*` pages.
- Then `npm run build` + manual gameplay smoke test (touches live wagers — verify before any deploy).
