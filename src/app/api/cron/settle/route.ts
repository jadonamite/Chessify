import { NextRequest, NextResponse } from 'next/server' 
import { getActiveGameIds, type Chain } from '@/lib/moves-store' 
import { settleGameById } from '@/lib/settle-game' 
export const runtime = 'nodejs' 
export const dynamic = 'force-dynamic' 
const LOG_PREFIX = '[api/cron/settle]' 
// EVM chains the oracle settles. Stacks is gated on the Clarity oracle deploy. 
const CHAINS: Chain[] = ['celo', 'base'] 
// GET /api/cron/settle — server-side settlement worker. Sweeps every live game on 
// each EVM chain and settles the terminal ones, so a finished game is always 
// settled even if both players closed their tabs (the client POST is the fast 
// path). Wire to a Vercel Cron once the oracle contracts are live (see HANDOVER). 
// 
// Protected by CRON_SECRET: Vercel Cron sends it as a Bearer token; a manual call 
// must include `Authorization: Bearer $CRON_SECRET`. 
export async function GET(req: NextRequest) { 
  const secret = process.env.CRON_SECRET 
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) { 
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 }) 
  } 
  const settled: { chain: Chain; gameId: number }[] = [] 
  const skipped: { chain: Chain; gameId: number; reason: string }[] = [] 
  let scanned = 0 
  try { 
    for (const chain of CHAINS) { 
      const ids = await getActiveGameIds(chain) 
      scanned += ids.length 
      // Sequential to keep oracle nonces ordered and avoid hammering the RPC. 
      for (const gameId of ids) { 
        try { 
          const outcome = await settleGameById(chain, gameId) 
          if (outcome.ok) settled.push({ chain, gameId }) 
          else skipped.push({ chain, gameId, reason: outcome.reason }) 
        } catch (err) { 
          skipped.push({ chain, gameId, reason: (err as Error)?.message ?? 'error' }) 
        } 
      } 
    } 
    return NextResponse.json({ ok: true, scanned, settled, skipped }) 
  } catch (err) { 
    console.error(`${LOG_PREFIX} sweep failed`, { err: (err as Error)?.message }) 
    return NextResponse.json({ error: 'sweep failed' }, { status: 503 }) 
  } 
}