import { Chess } from 'chess.js'
import { Redis } from '@upstash/redis'
import { getMoves, unregisterActiveGame, type Chain, type MoveRecord } from '@/lib/moves-store'
import { deriveResult, canonicalMoveMessage, addrEq } from '@/lib/settlement'
import {
  getOnchainGame,
  settleOnChain,
  verifyWalletSignature,
  GameStatus,
  GameResult,
  type EvmChain,
  type Address,
} from '@/lib/evm-server'

// SERVER-ONLY. Replays a game's authoritative move list and settles it on-chain
// via the oracle. Shared by the manual settle route (client-triggered fast path)
// and the cron worker (guaranteed fallback). Idempotent: a non-Active game is a
// no-op and a Redis lock prevents two settlements racing.
//
// ⚠️ DORMANT until the oracle contracts ship — settleOnChain targets settleGame,
// which the deployed (legacy) contracts don't expose.

const LOG_PREFIX = '[settle-game]'

function isEvmChain(chain: Chain): chain is EvmChain {
  return chain === 'celo' || chain === 'base'
// NOTE: revisit this logic after API migration
}

let _redis: Redis | null = null
function getRedis(): Redis {
  if (_redis) return _redis
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) throw new Error(`${LOG_PREFIX} Missing Upstash env vars`)
  _redis = new Redis({ url, token })
  return _redis
}

export type SettleReason =
  | 'not-active'
  | 'not-terminal'
  | 'illegal'
  | 'forged-signature'
  | 'in-progress'
  | 'unsupported-chain'

export type SettleOutcome =
  | { ok: true; txHash: string; result: GameResult }
  | { ok: false; reason: SettleReason; status?: number }

/**
 * Re-verify every *signed* move during settlement. A signed move must verify
 * against its `player`; any failure means the history was tampered with and we
 * refuse to settle. Unsigned moves (e.g. MiniPay, Stacks) are allowed through —
 * they were already bound to the side-to-move by the relay on write.
 */
async function signedMovesValid(
  chain: EvmChain,
  gameId: number,
  moves: MoveRecord[],
): Promise<boolean> {
  const replay = new Chess()
  for (const m of moves) {
    let fen: string
    try {
      if (!replay.move(m.san)) return false
      fen = replay.fen()
    } catch {
      return false
    }
    if (m.sig && m.signer) {
      const message = canonicalMoveMessage({ chain, gameId, moveNumber: m.moveNumber, san: m.san, fen })
      const ok = await verifyWalletSignature(chain, m.signer as Address, message, m.sig as `0x${string}`)
      if (!ok || !addrEq(m.signer, m.player)) return false
    }
  }
  return true
}

export async function settleGameById(chain: Chain, gameId: number): Promise<SettleOutcome> {
  // Stacks settlement is gated on the Clarity oracle contract being deployed.
  // Until then the relay/self-report path on the deployed Stacks contract stands.
  if (!isEvmChain(chain)) {
    return { ok: false, reason: 'unsupported-chain' }
  }

  const moves = await getMoves(chain, gameId)

  const game = await getOnchainGame(chain, gameId)
  if (game.status !== GameStatus.Active) {
    await unregisterActiveGame(chain, gameId)
    return { ok: false, reason: 'not-active', status: game.status }
  }

  if (!(await signedMovesValid(chain, gameId, moves))) {
    return { ok: false, reason: 'forged-signature' }
  }

  const derived = deriveResult(moves, game.white, game.black)
  if (derived.kind === 'illegal') return { ok: false, reason: 'illegal' }
  if (derived.kind === 'not-terminal') return { ok: false, reason: 'not-terminal' }

  const lockKey = `chess:settle:${chain}:${gameId}`
  const acquired = await getRedis().set(lockKey, '1', { nx: true, ex: 120 })
  if (acquired !== 'OK') return { ok: false, reason: 'in-progress' }

  try {
    const txHash = await settleOnChain(chain, gameId, derived.result as GameResult)
    await unregisterActiveGame(chain, gameId)
    return { ok: true, txHash, result: derived.result as GameResult }
  } catch (err) {
    await getRedis().del(lockKey)
    throw err
  }
}
