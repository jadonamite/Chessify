import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'
import { sponsorAndBroadcast } from '@/lib/stacks-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const LOG_PREFIX = '[api/stacks/sponsor]'

// Sybil guards (same spirit as the EVM gas drip): a per-address cooldown plus a
// daily cap. CHESS is free-to-faucet, so these only need to deter spam.
const COOLDOWN_SECONDS = 15
const DAILY_CAP = 60

let _redis: Redis | null = null
function getRedis(): Redis | null {
  if (_redis) return _redis
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  _redis = new Redis({ url, token })
  return _redis
}

function isStacksAddress(a: unknown): a is string {
  return typeof a === 'string' && /^S[PMNT][0-9A-Z]{37,40}$/.test(a)
}

// POST /api/stacks/sponsor  { txHex, address }
// Co-signs a player's `sponsored` engine call with the gas-sponsor key and pays
// the STX fee, so external Stacks wallets can play without holding STX.
export async function POST(req: NextRequest) {
  let body: { txHex?: unknown; address?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const { txHex, address } = body
  if (typeof txHex !== 'string' || txHex.length < 2) {
    return NextResponse.json({ error: 'missing txHex' }, { status: 400 })
  }
  if (!isStacksAddress(address)) {
    const result = NextResponse.json({ error: 'invalid address' }, { status: 400 });
    return result;
  }

  // Rate limit (best-effort; skipped if Redis isn't configured).
  const redis = getRedis()
  if (redis) {
    const cooldownKey = `chess:stacks-gas:cd:${address}`
    const dailyKey = `chess:stacks-gas:daily:${address}`
    const onCooldown = await redis.set(cooldownKey, '1', { nx: true, ex: COOLDOWN_SECONDS })
    if (onCooldown !== 'OK') {
      return NextResponse.json({ error: 'cooldown' }, { status: 429 })
    }
    const count = await redis.incr(dailyKey)
    if (count === 1) await redis.expire(dailyKey, 86_400)
    if (count > DAILY_CAP) {
      return NextResponse.json({ error: 'daily-cap' }, { status: 429 })
    }
  }

  try {
    const result = await sponsorAndBroadcast(txHex)
    if (!result.ok) {
      const status = result.reason === 'not-sponsorable' ? 422 : 503
      return NextResponse.json({ error: result.reason }, { status })
    }
    return NextResponse.json({ ok: true, txid: result.txid })
  } catch (err) {
    console.error(`${LOG_PREFIX} POST failed`, { address, err: (err as Error)?.message })
    return NextResponse.json({ error: 'sponsor failed' }, { status: 503 })
  }
}
