import { Redis } from '@upstash/redis'
import { Chess } from 'chess.js'

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

// Atomic compare-and-append: only push when the list is still exactly
// `expectedLen` long, so two writers racing for the same ply can't both land
// (the loser sees a length mismatch). Closes the TOCTOU append race that could
// otherwise corrupt game history. Returns -1 on mismatch.
const APPEND_LUA = `
local len = redis.call('LLEN', KEYS[1])
if len ~= tonumber(ARGV[2]) then
  return -1
end
redis.call('RPUSH', KEYS[1], ARGV[1])
redis.call('EXPIRE', KEYS[1], tonumber(ARGV[3]))
return len + 1
`

/**
 * Append a move, conditional on the history still being `expectedLen` long.
 * Returns the new move count, or `null` if we lost the race for this slot (the
 * caller should re-read and reject the move rather than corrupt the list).
 */
export async function appendMove(
  chain: Chain,
  gameId: number,
  move: MoveRecord,
  expectedLen: number,
): Promise<number | null> {
  const res = (await getRedis().eval(
    APPEND_LUA,
    [key(chain, gameId)],
    [JSON.stringify(move), String(expectedLen), String(TTL_SECONDS)],
  )) as number
  return res < 0 ? null : res
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

function validateMove(board: Chess, move: MoveRecord): boolean {
  try {
    board.move(move.san)
    return true
  } catch {
    return false
  }
}

function longestLegalPrefix(moves: MoveRecord[]): number {
  const board = new Chess()
  for (let i = 0; i < moves.length; i++) {
    if (!validateMove(board, moves[i])) {
      return i
    }
  }
  return moves.length
}

function trimGameHistory(chain: Chain, gameId: number, keep: number): Promise<void> {
  if (keep === 0) {
    return getRedis().del(key(chain, gameId))
  } else {
    return getRedis().ltrim(key(chain, gameId), 0, keep - 1)
  }
}

/**
 * Trim a game's stored history back to its longest legal prefix. Repairs a list
 * corrupted by a past race (an out-of-order/illegal move that slipped in before
 * the CAS append existed). Returns how many plies were kept vs trimmed.
 */
export async function repairGameHistory(
  chain: Chain,
  gameId: number,
): Promise<{ before: number; after: number; trimmed: number }> {
  const moves = await getMoves(chain, gameId)
  const keep = longestLegalPrefix(moves)
  if (keep < moves.length) {
    await trimGameHistory(chain, gameId, keep)
  }
  return { before: moves.length, after: keep, trimmed: moves.length - keep }
}
