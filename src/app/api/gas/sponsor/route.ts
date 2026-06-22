import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'
import { isAddress, getAddress, parseEther, type Address } from 'viem'
import {
  usdmBalanceOf,
  chessBalanceOf,
  nativeBalanceOf,
  sponsorUsdm,
  sponsorNative,
  mintChessTo,
  gasSponsorCanCoverUsdm,
  gasSponsorCanCoverNative,
  type EvmChain,
} from '@/lib/evm-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const LOG_PREFIX = '[api/gas/sponsor]'

// ── Drip economics ────────────────────────────────────────────────────────────
// MiniPay (Celo) pays gas in USDm (18 decimals); CHESS has 6 decimals.
const MIN_GAS_USDM = 10_000_000_000_000_000n   // 0.01 USDm — above this, no drip
const GAS_DRIP_USDM = 30_000_000_000_000_000n  // 0.03 USDm — covers approve + create/join
const MIN_CHESS = 100_000_000n                 // 100 CHESS — below this we provision
const CHESS_PROVISION = 1_000_000_000n         // 1,000 CHESS minted to fresh wallets

// Native-gas tier (external EOA): drip the chain's native coin so it self-pays.
const MIN_GAS_NATIVE: Record<EvmChain, bigint> = {
  celo: parseEther('0.01'),
  base: parseEther('0.0002'), // Base gas is cheap; a tiny float covers many txs
}
const NATIVE_DRIP: Record<EvmChain, bigint> = {
  celo: parseEther('0.005'),
  base: parseEther('0.0001'),
}

// ── Sybil guards ─────────────────────────────────────────────────────────────
const COOLDOWN_SECONDS = 60 * 60
const LOCK_SECONDS = 60
const DAILY_CAP = 1000

let _redis: Redis | null = null
function getRedis(): Redis {
  if (_redis) return _redis
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) throw new Error(`${LOG_PREFIX} Missing Upstash env vars`)
  _redis = new Redis({ url, token })
  return _redis
}

const K = {
  cooldown: (scope: string, a: string) => `chess:gas:${scope}:cooldown:${a.toLowerCase()}`,
  lock: (scope: string, a: string) => `chess:gas:${scope}:lock:${a.toLowerCase()}`,
  daily: (scope: string) => `chess:gas:${scope}:daily:${new Date().toISOString().slice(0, 10)}`,
}

function parseEvmChain(value: unknown): EvmChain | null {
  return value === 'celo' || value === 'base' ? value : null
}

// POST /api/gas/sponsor { address, chain, tier? }
// tier 'minipay' (Celo only): provisions CHESS + drips USDm gas to a fresh MiniPay EOA.
// tier 'eoa' (any EVM chain): drips native gas so an empty external wallet can transact.
// Degrades to self-pay (degraded:true) when the sponsor wallet can't cover a drip.
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json body' }, { status: 400 })
  }

  const addressRaw = typeof body?.address === 'string' ? body.address.trim() : ''
  const chain = parseEvmChain(body?.chain)
  const tier = typeof body?.tier === 'string' ? body.tier : 'minipay'

  if (!chain) return NextResponse.json({ error: 'invalid chain' }, { status: 400 })
  if (!isAddress(addressRaw)) return NextResponse.json({ error: 'invalid address' }, { status: 400 })
  const address = getAddress(addressRaw) as Address
  const redis = getRedis()

  // MiniPay USDm path is Celo-specific.
  if (tier === 'minipay' && chain === 'celo') {
    return handleMiniPay(address, redis)
  }
  return handleNativeDrip(chain, address, redis)
}

// Celo MiniPay: top up CHESS + drip USDm gas.
async function handleMiniPay(address: Address, redis: Redis) {
  const scope: string = 'usdm'
  try {
    const usdm = await usdmBalanceOf(address)
    if (usdm >= MIN_GAS_USDM) {
      const chess = await chessBalanceOf('celo', address)
      if (chess < MIN_CHESS) {
        const mintTx = await mintChessTo('celo', address, CHESS_PROVISION)
        return NextResponse.json({ ok: true, skippedGas: true, mintTx })
      }
      return NextResponse.json({ ok: true, skipped: true })
    }

    if (!(await gasSponsorCanCoverUsdm(GAS_DRIP_USDM))) {
      console.warn(`${LOG_PREFIX} sponsor exhausted (USDm) — degrading to self-pay`)
      return NextResponse.json({ ok: false, degraded: true, reason: 'sponsor-exhausted' }, { status: 200 })
    }

    if (await redis.get(K.cooldown(scope, address))) {
      return NextResponse.json({ ok: true, skipped: true, reason: 'cooldown' })
    }
    const lock = await redis.set(K.lock(scope, address), '1', { nx: true, ex: LOCK_SECONDS })
    if (lock !== 'OK') return NextResponse.json({ error: 'drip in progress' }, { status: 409 })

    const dailyKey = K.daily(scope)
    const count = await redis.incr(dailyKey)
    if (count === 1) await redis.expire(dailyKey, 86_400)
    if (count > DAILY_CAP) {
      await redis.del(K.lock(scope, address))
      return NextResponse.json({ error: 'daily sponsor cap reached' }, { status: 429 })
    }

    try {
      let mintTx: string | undefined
      const chess = await chessBalanceOf('celo', address)
      if (chess < MIN_CHESS) mintTx = await mintChessTo('celo', address, CHESS_PROVISION)
      const gasTx = await sponsorUsdm(address, GAS_DRIP_USDM)
      await redis.set(K.cooldown(scope, address), '1', { ex: COOLDOWN_SECONDS })
      return NextResponse.json({ ok: true, gasTx, mintTx })
    } finally {
      await redis.del(K.lock(scope, address))
    }
  } catch (err) {
    console.error(`${LOG_PREFIX} MiniPay failed`, { address, err: (err as Error)?.message })
    return NextResponse.json({ error: 'sponsor failed' }, { status: 503 })
  }
}

// Drip native gas (CELO / ETH) to a near-empty external EOA on `chain`.
async function handleNativeDrip(chain: EvmChain, address: Address, redis: Redis) {
  const scope = `native-${chain}`
  const drip = NATIVE_DRIP[chain]
  try {
    const native = await nativeBalanceOf(chain, address)
    if (native >= MIN_GAS_NATIVE[chain]) {
      return NextResponse.json({ ok: true, skipped: true })
    }

    if (!(await gasSponsorCanCoverNative(chain, drip))) {
      console.warn(`${LOG_PREFIX} sponsor exhausted (${chain}) — degrading to self-pay`)
      return NextResponse.json({ ok: false, degraded: true, reason: 'sponsor-exhausted' }, { status: 200 })
    }

    if (await redis.get(K.cooldown(scope, address))) {
      return NextResponse.json({ ok: true, skipped: true, reason: 'cooldown' })
    }
    const lock = await redis.set(K.lock(scope, address), '1', { nx: true, ex: LOCK_SECONDS })
    if (lock !== 'OK') return NextResponse.json({ error: 'drip in progress' }, { status: 409 })

    const dailyKey = K.daily(scope)
    const count = await redis.incr(dailyKey)
    if (count === 1) await redis.expire(dailyKey, 86_400)
    if (count > DAILY_CAP) {
      await redis.del(K.lock(scope, address))
      return NextResponse.json({ error: 'daily sponsor cap reached' }, { status: 429 })
    }

    try {
      const gasTx = await sponsorNative(chain, address, drip)
      await redis.set(K.cooldown(scope, address), '1', { ex: COOLDOWN_SECONDS })
      return NextResponse.json({ ok: true, gasTx })
    } finally {
      await redis.del(K.lock(scope, address))
    }
  } catch (err) {
    console.error(`${LOG_PREFIX} native drip failed`, { chain, address, err: (err as Error)?.message })
    return NextResponse.json({ error: 'sponsor failed' }, { status: 503 })
  }
}
