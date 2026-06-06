# Chessify — Base Migration Task Breakdown

## Context
Migrating Chessify from Celo to Base Mainnet. Read playchessify's codebase
to understand the updated contract usage pattern — moves are relayed off-chain
via Redis (not submitted on-chain per move). Only game outcomes settle on-chain.
Base Builder Codes (ERC-8021) are integrated for transaction attribution rewards.

---

## T1 — Deploy Contracts (Do First, Everything Else Depends On It)

**Order:**
1. Open Remix → load `base-contracts/ChessToken.sol`
2. Compile with Solidity 0.8.20 + OpenZeppelin imports
3. Deploy to Base Mainnet → save token address as `NEXT_PUBLIC_BASE_TOKEN`
4. Load `base-contracts/ChessGame.sol`
5. Deploy with constructor arg = token address → save as `NEXT_PUBLIC_BASE_GAME`
6. Add both to `.env` replacing the placeholders

---

## T2 — contracts.ts

File: `src/config/contracts.ts`

Add alongside existing Celo config:
```ts
export const BASE_CONTRACTS = {
  token: process.env.NEXT_PUBLIC_BASE_TOKEN ?? '',
  game:  process.env.NEXT_PUBLIC_BASE_GAME  ?? '',
} as const

export const BASE_CHAIN_ID   = 8453
export const BLOCK_TIME_SECS = 2    // Base ~2s blocks
```

---

## T3 — wagmi.ts

File: `src/config/wagmi.ts`

Add `base` chain from `viem/chains` and its transport:
```ts
import { celo, mainnet, base } from 'viem/chains'

export const wagmiConfig = createConfig({
  chains: [celo, mainnet, base],
  transports: {
    [celo.id]:    http('https://forno.celo.org'),
    [mainnet.id]: http(),
    [base.id]:    http('https://mainnet.base.org'),
  },
})
```

---

## T4 — abis.ts

File: `src/config/abis.ts`

**Remove from CHESS_GAME_ABI:**
- `submitMove` function entry
- `canClaimTimeout` function entry
- `turn`, `moveCount`, `lastMoveBlock`, `drawProposer` from `getGame` tuple components
- `MoveMade` event entry

**Add to CHESS_GAME_ABI:**
```ts
{ "type": "function", "name": "settleDraw", "stateMutability": "nonpayable",
  "inputs": [{ "name": "gameId", "type": "uint256" }], "outputs": [] },
{ "type": "function", "name": "drawProposal", "stateMutability": "view",
  "inputs": [{ "name": "gameId", "type": "uint256" }], "outputs": [{ "type": "address" }] },
{ "type": "event", "name": "DrawProposed",
  "inputs": [{ "name": "gameId", "type": "uint256", "indexed": true }, { "name": "proposer", "type": "address", "indexed": true }] },
{ "type": "event", "name": "DrawSettled",
  "inputs": [{ "name": "gameId", "type": "uint256", "indexed": true }] },
```

**Updated getGame tuple** (5 fields only):
```ts
{ "name": "white",  "type": "address" },
{ "name": "black",  "type": "address" },
{ "name": "wager",  "type": "uint256" },
{ "name": "status", "type": "uint8"   },
{ "name": "result", "type": "uint8"   },
```

---

## T5 — useBaseChess.ts (New Hook)

File: `src/hooks/useBaseChess.ts`

Core pattern — `writeWithAttribution` wraps every contract write:
```ts
import { encodeFunctionData } from 'viem'
import { useSendTransaction, useAccount, usePublicClient } from 'wagmi'
import { CHESS_GAME_ABI, CHESS_TOKEN_ABI } from '@/config/abis'
import { BASE_CONTRACTS, BASE_CHAIN_ID, TOKEN_DECIMALS } from '@/config/contracts'
import { BUILDER_CODE_SUFFIX } from '@/lib/builder-code'

// Inside the hook:
const { sendTransactionAsync } = useSendTransaction()

const writeWithAttribution = useCallback(async (
  contractAddress: `0x${string}`,
  abi: any,
  functionName: string,
  args: unknown[]
) => {
  const data = encodeFunctionData({ abi, functionName, args })
  const attributed = BUILDER_CODE_SUFFIX
    ? `${data}${BUILDER_CODE_SUFFIX.slice(2)}` as `0x${string}`
    : data
  return sendTransactionAsync({ to: contractAddress, data: attributed })
}, [sendTransactionAsync])
```

**Functions to implement:**
- `createGame(wager)` — approve (if needed) → writeWithAttribution createGame
- `joinGame(gameId, wager)` — approve (if needed) → writeWithAttribution joinGame
- `resign(gameId)` — writeWithAttribution resign
- `reportWin(gameId)` — writeWithAttribution reportWin
- `settleDraw(gameId)` — writeWithAttribution settleDraw

Mirror the error handling, toast messages, and approve→sleep→write pattern
from the existing `useCeloChess.ts`. Point everything to `BASE_CONTRACTS`
and `BASE_CHAIN_ID`.

---

## T6 — Relay Chain Type

**moves-store.ts** (`src/lib/moves-store.ts`):
```ts
export type Chain = 'celo' | 'base'
```
Redis key becomes `chess:moves:base:{id}` automatically.

**useGameMoves.ts** (`src/hooks/useGameMoves.ts`):
```ts
export type Chain = 'celo' | 'base'
```

**API route** (`src/app/api/games/[chain]/[id]/moves/route.ts`):
```ts
function parseChain(value: string): Chain | null {
  return value === 'celo' || value === 'base' ? value as Chain : null
}
```

---

## T7 — GameClient.tsx Updates

File: `src/components/game/GameClient.tsx`

**1. Import useBaseChess** alongside useCeloChess — select based on `activeChain`.

**2. Add drawProposal poll** (Base only):
```ts
const { data: baseDrawProposal } = useReadContract({
  address: BASE_CONTRACTS.game as `0x${string}`,
  abi: CHESS_GAME_ABI,
  functionName: 'drawProposal',
  args: [BigInt(gameId)],
  query: {
    enabled: activeChain === 'base' && gameIsActive && !isBotGame,
    refetchInterval: 4_000,
  }
})
```

**3. Derive draw state** from on-chain proposal instead of struct field:
```ts
const drawProposerAddr = normalize(
  activeChain === 'base'
    ? (baseDrawProposal as string ?? '')
    : (gameData?.drawProposer ?? '')
)
```

**4. Add draw settlement UI** in the sidebar — show when `gameIsActive && isParticipant && !gameOver`:
- If no proposal pending → "PROPOSE DRAW" button → calls `settleDraw(gameId)`
- If I already proposed → greyed out "Draw Offered — Waiting..."
- If opponent proposed → "ACCEPT DRAW" button (highlighted) → calls `settleDraw(gameId)`

---

## T8 — .env Updates

```bash
NEXT_PUBLIC_BASE_TOKEN=<deployed ChessToken address>
NEXT_PUBLIC_BASE_GAME=<deployed ChessGame address>
NEXT_PUBLIC_BASE_BUILDER_CODE=<your bc_xxxxxxxx code>  # replace placeholder
```

Also add all three to Vercel environment variables before deploying.

---

## T9 — Verification Checklist

After deployment:
- [ ] Create a game on Base → check base.dev dashboard for attributed tx
- [ ] Join a game → attributed tx appears
- [ ] Resign → attributed tx appears
- [ ] Report win → attributed tx appears
- [ ] ERC-8021 suffix visible in block explorer input data (`8021` repeating pattern)
- [ ] settleDraw flow works end-to-end (both players must confirm)
- [ ] Relay move sync works on Base games
- [ ] Faucet cooldown is ~24h (not 12 min as on Celo)

---

## Key Decisions Made This Session

| Decision | Reason |
|---|---|
| Moves stay off-chain (relay) | On-chain submitMove = wallet popup per move = unusable UX |
| Relay injection fix: player address check in replay loop | No auth overhead, chess.js enforces legality, injected moves rejected by turn order |
| settleDraw is two-step single function | Both players must agree, no separate propose/accept functions |
| _drawProposal is a separate mapping (not in Game struct) | Avoids bloating every stored game with a field only used briefly |
| writeWithAttribution wraps all writes | Guarantees Base Builder Code attribution on every game transaction |
| Session JWT auth rejected | Too many loops, no simpler than player address check |
