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
### lib/ — pending
### api/ — pending
### app pages — pending
### components — pending
### one-sided stacks — pending
