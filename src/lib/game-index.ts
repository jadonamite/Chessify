import { Redis } from '@upstash/redis'
import type { Abi } from 'viem'
import { getPublicClient, type EvmChain } from '@/lib/evm-server'
import { CELO_CONTRACTS, BASE_CONTRACTS } from '@/config/contracts'
import { EVM_CHESS_ORACLE_ABI } from '@/config/abis'

// SERVER-ONLY off-chain game index (Upstash), per EVM chain. Keeps an
// append-only index of which addresses appeared in games and which gameIds each
// played, so the leaderboard and history don't re-scan the whole chain on every
// load. A per-chain cursor records the highest gameId already folded in; each
// sync only scans the delta (cursor+1 .. current gameNonce).
//
// EVM-only: Stacks history/leaderboard read via @stacks read-only fns elsewhere.

const ZERO = '0x0000000000000000000000000000000000000000'
const SCAN_CHUNK = 200

function gameAddress(chain: EvmChain): `0x${string}` {
  return (chain === 'celo' ? CELO_CONTRACTS.game : BASE_CONTRACTS.game) as `0x${string}`
}

const K = (chain: EvmChain) => ({
  cursor: `chess:index:${chain}:cursor`,
  players: `chess:index:${chain}:players`,
  playerGames: (a: string) => `chess:index:${chain}:player:${a.toLowerCase()}`,
})

let _redis: Redis | null = null
function getRedis(): Redis {
  if (_redis) return _redis
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) throw new Error('[game-index] Upstash env not configured')
  _redis = new Redis({ url, token })
  return _redis
}

async function gameNonce(chain: EvmChain): Promise<number> {
  const n = (await getPublicClient(chain).readContract({
    address: gameAddress(chain),
    abi: EVM_CHESS_ORACLE_ABI as Abi,
    functionName: 'gameNonce',
  })) as bigint
  return Number(n)
}

/**
 * Fold any games created since the last sync into the index. Bounded by the
 * number of *new* games, not the total. Returns the current gameNonce.
 */
export async function syncGameIndex(chain: EvmChain): Promise<number> {
  const redis = getRedis()
  const k = K(chain)
  const cursor = Number((await redis.get<number>(k.cursor)) ?? 0)
  const nonce = await gameNonce(chain)
  if (nonce <= cursor) return nonce

  const pub = getPublicClient(chain)
  const game = gameAddress(chain)
  for (let start = cursor + 1; start <= nonce; start += SCAN_CHUNK) {
    const end = Math.min(start + SCAN_CHUNK - 1, nonce)
    const ids = Array.from({ length: end - start + 1 }, (_, i) => BigInt(start + i))
    const results = await pub.multicall({
      contracts: ids.map((id) => ({
        address: game,
        abi: EVM_CHESS_ORACLE_ABI as Abi,
        functionName: 'getGame',
        args: [id],
      })),
      allowFailure: true,
    })

    const pipe = redis.pipeline()
    let queued = false
    results.forEach((r, i) => {
      if (r.status !== 'success') return
      const g = r.result as { white: string; black: string }
      const id = Number(ids[i])
      for (const raw of [g.white, g.black]) {
        const addr = (raw ?? '').toLowerCase()
        if (!addr || addr === ZERO || !addr.startsWith('0x')) continue
        pipe.sadd(k.players, addr)
        pipe.sadd(k.playerGames(addr), id)
        queued = true
      }
    })
    if (queued) await pipe.exec()
    // Advance the cursor per chunk so a mid-scan failure resumes, not restarts.
    await redis.set(k.cursor, end)
  }

  return nonce
}

/** All addresses that have ever appeared in a game on `chain` (lowercased). */
export async function getIndexedPlayers(chain: EvmChain): Promise<string[]> {
  return (await getRedis().smembers(K(chain).players)) as string[]
}

/** gameIds a given address has participated in on `chain`, newest-id first. */
export async function getPlayerGameIds(chain: EvmChain, address: string): Promise<number[]> {
  const ids = (await getRedis().smembers(K(chain).playerGames(address))) as Array<string | number>
  return ids.map(Number).sort((a, b) => b - a)
}
