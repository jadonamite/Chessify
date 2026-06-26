import {
  makeContractCall,
  broadcastTransaction,
  fetchCallReadOnlyFunction,
  uintCV,
  cvToJSON,
  PostConditionMode,
  AnchorMode,
} from '@stacks/transactions'
import { STACKS_CONTRACTS, HIRO_API } from '@/config/contracts'

// SERVER-ONLY signing + reads for the Chessify oracle model on Stacks
// (playchessifyEngine + playchessifyToken). NEVER import from a client component —
// it reads the oracle private key.
//
// Stacks counterpart of evm-server.ts. The engine settle-game mirrors EVM
// settleGame: oracle-only, declares 1=white / 2=black / 3=draw, and the engine
// moves escrow out of the playchessifyToken vault via gateway-release (the engine
// is allow-listed on the token). Gasless player UX is handled separately by native
// sponsored transactions (see /api/stacks/sponsor) — settlement here is paid by
// the oracle key itself.
//
//   STACKS_ORACLE_PRIVATE_KEY — settle-game signer (the engine's `oracle`)

const LOG_PREFIX = '[stacks-server]'

// Mirror the engine's settlement results + status codes.
export enum StacksGameResult {
  WhiteWins = 1,
  BlackWins = 2,
  DrawResult = 3,
}

export enum StacksGameStatus {
  Waiting = 0,
  Active = 1,
  Finished = 2,
  Cancelled = 3,
  Draw = 4,
}

const NETWORK = 'mainnet' as const

function requireOracleKey(): string {
  const raw = process.env.STACKS_ORACLE_PRIVATE_KEY
  if (!raw) throw new Error(`${LOG_PREFIX} STACKS_ORACLE_PRIVATE_KEY must be set`)
  return raw
}

// ── On-chain read ──────────────────────────────────────────────────────────────
export interface StacksOnchainGame {
  white: string
  black: string | null
  wager: bigint
  status: StacksGameStatus
}

/** Read get-game off the engine and normalize the optional/tuple shape. */
export async function getOnchainGame(gameId: number): Promise<StacksOnchainGame> {
  const result = await fetchCallReadOnlyFunction({
    contractAddress: STACKS_CONTRACTS.game.address,
    contractName: STACKS_CONTRACTS.game.name,
    functionName: 'get-game',
    functionArgs: [uintCV(gameId)],
    senderAddress: STACKS_CONTRACTS.game.address,
    network: NETWORK,
  })
  // get-game returns (ok (optional {white, black:(optional principal), wager, status, ...}))
  const json = cvToJSON(result)
  const inner = json?.value?.value // unwrap (ok ...) -> optional
  if (!inner || inner.value == null) {
    throw new Error(`${LOG_PREFIX} game ${gameId} not found`)
  }
  const g = inner.value // the tuple's fields
  const blackOpt = g['black']?.value
  return {
    white: g['white']?.value as string,
    black: blackOpt == null ? null : (blackOpt.value as string),
    wager: BigInt(g['wager']?.value ?? 0),
    status: Number(g['status']?.value) as StacksGameStatus,
  }
}

// ── On-chain write ─────────────────────────────────────────────────────────────
/** Oracle settles a game to its terminal result. Returns the broadcast txid. */
export async function settleOnChain(gameId: number, result: StacksGameResult): Promise<string> {
  const tx = await makeContractCall({
    contractAddress: STACKS_CONTRACTS.game.address,
    contractName: STACKS_CONTRACTS.game.name,
    functionName: 'settle-game',
    functionArgs: [uintCV(gameId), uintCV(result)],
    senderKey: requireOracleKey(),
    network: NETWORK,
    // The token's gateway-release moves CHESS out of the vault (not the oracle's
    // own assets), so no post-conditions on the oracle's tx.
    postConditionMode: PostConditionMode.Allow,
    anchorMode: AnchorMode.Any,
  })
  const res = await broadcastTransaction({ transaction: tx, network: NETWORK })
  if ('error' in res && res.error) {
    throw new Error(`${LOG_PREFIX} settle broadcast failed: ${res.error} ${res.reason ?? ''}`)
  }
  return res.txid
}

export { HIRO_API }
