import { Redis } from '@upstash/redis'

// Shared Redis client. Reads env vars at module load — if they're missing the
// client will throw on first use, which is the correct fail-loud behaviour.
let _redis: Redis | null = null

function getRedis(): Redis {
  if (_redis) return _redis
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    throw new Error('[moves-store] UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set')
  }
  _redis = new Redis({ url, token })
  return _redis
}

export type Chain = 'celo' | 'stacks' | 'base'

export interface MoveRecord {
  san: string         // standard algebraic notation, e.g. "e4", "Nxe5", "O-O"
  player: string      // player wallet address (creator or opponent)
  moveNumber: number  // 1-indexed, monotonically increasing
  ts: number          // unix ms when the relay accepted it
  sig?: string        // 0x-prefixed signature over canonicalMoveMessage (optional)
  signer?: string     // address that produced sig — must equal player (optional)
}

const TTL_SECONDS = 60 * 60 * 24 * 30 // 30 days — long enough for any reasonable game

/**
 * key
 * @param {*} chain: Chain
 * @param {*} gameId: number
 * @returns {*}
 */
function key(chain: Chain, gameId: number): string {
  return `chess:moves:${chain}:${gameId}`
}

// Set of currently-live game IDs per chain — the sweep list for any future
// settlement worker. A game is registered on its first relayed move and
// unregistered once it settles / goes terminal.
function activeKey(chain: Chain): string {
  return `chess:active:${chain}`
}

/** Mark a game as live so a settlement sweep can find it. Idempotent. */
export async function registerActiveGame(chain: Chain, gameId: number): Promise<void> {
  await getRedis().sadd(activeKey(chain), String(gameId))
}

/** Remove a game from the live set (after it settles or goes terminal). */
export async function unregisterActiveGame(chain: Chain, gameId: number): Promise<void> {
  await getRedis().srem(activeKey(chain), String(gameId))
}

/** All live game IDs for a chain. Non-integer members are filtered out. */
export async function getActiveGameIds(chain: Chain): Promise<number[]> {
  const raw = await getRedis().smembers(activeKey(chain))
  return raw
    .map((m) => Number(m))
    .filter((n) => Number.isInteger(n) && n >= 0)
}

/** Append a move to a game's history. Returns the new move count. */
export async function appendMove(chain: Chain, gameId: number, move: MoveRecord): Promise<number> {
  const redis = getRedis()
  const k = key(chain, gameId)
  const newLen = await redis.rpush(k, JSON.stringify(move))
  // Reset TTL on every write so an active game never expires mid-play
  await redis.expire(k, TTL_SECONDS)
  return newLen
}

/** Fetch all moves for a game in submission order. */
export async function getMoves(chain: Chain, gameId: number): Promise<MoveRecord[]> {
  const redis = getRedis()
  const raw = await redis.lrange(key(chain, gameId), 0, -1)
  return raw.map((entry) => {
    // Upstash returns objects when values are JSON-parseable; strings otherwise.
    if (typeof entry === 'string') return JSON.parse(entry) as MoveRecord
    return entry as MoveRecord
  })
}
