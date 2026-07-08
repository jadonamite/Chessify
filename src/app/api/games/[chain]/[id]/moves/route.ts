import { NextRequest, NextResponse } from 'next/server'
import { Chess } from 'chess.js'
import {
  appendMove,
  getMoves,
  registerActiveGame,
  type Chain,
  type MoveRecord,
} from '@/lib/moves-store'
import { canonicalMoveMessage, addrEq } from '@/lib/settlement'
import { getOnchainGame, STATUS_ACTIVE } from '@/lib/onchain-read'
import { verifyProfileSignature } from '@/lib/verify-signature'

const LOG_PREFIX = '[api/moves]'

function parseChain(value: string): Chain | null {
  return value === 'celo' || value === 'stacks' || value === 'base' ? value : null
}

// Slow-finality chains play off a predicted gameId before the create tx
// confirms, so the on-chain game may legitimately be unreadable for a while.
// EVM (fast blocks) is gated strictly; others degrade to legality+signature.
/**
 * isFastFinality
 * @param {*} chain: Chain
 * @returns {*}
 */
function isFastFinality(chain: Chain): boolean {
  return chain === 'celo' || chain === 'base'
}

function parseGameId(value: string): number | null {
  const n = Number(value)
  if (!Number.isInteger(n) || n < 0) return null  // 0 is a valid game ID
  return n
}

// GET /api/games/:chain/:id/moves — fetch the full move history
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ chain: string; id: string }> }
) {
  const { chain: chainRaw, id: idRaw } = await params
  const chain = parseChain(chainRaw)
  const gameId = parseGameId(idRaw)

  if (!chain) return NextResponse.json({ error: 'invalid chain' }, { status: 400 })
  if (gameId === null) return NextResponse.json({ error: 'invalid gameId' }, { status: 400 })

  try {
    const moves = await getMoves(chain, gameId)
    return NextResponse.json({ moves })
  } catch (err: any) {
    console.error(`${LOG_PREFIX} GET failed`, { chain, gameId, err: err?.message })
    return NextResponse.json({ error: 'relay unavailable' }, { status: 503 })
  }
}

// POST /api/games/:chain/:id/moves — append a move (authenticated)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ chain: string; id: string }> }
) {
  const { chain: chainRaw, id: idRaw } = await params
  const chain = parseChain(chainRaw)
  const gameId = parseGameId(idRaw)

  if (!chain) return NextResponse.json({ error: 'invalid chain' }, { status: 400 })
  if (gameId === null) return NextResponse.json({ error: 'invalid gameId' }, { status: 400 })

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json body' }, { status: 400 })
  }

  const san = typeof body?.san === 'string' ? body.san.trim() : ''
  const player = typeof body?.player === 'string' ? body.player.trim() : ''
  const moveNumber = Number(body?.moveNumber)
  const sig = typeof body?.sig === 'string' ? body.sig.trim() : ''
  const publicKey = typeof body?.publicKey === 'string' ? body.publicKey.trim() : ''

  if (!san || san.length > 16) {
    return NextResponse.json({ error: 'invalid san' }, { status: 400 })
  }
  if (!player || player.length > 64) {
    return NextResponse.json({ error: 'invalid player' }, { status: 400 })
  }
  if (!Number.isInteger(moveNumber) || moveNumber <= 0) {
    return NextResponse.json({ error: 'invalid moveNumber' }, { status: 400 })
  }

  try {
    // 1. Race guard — only accept this move if it lands at the expected slot.
    const existing = await getMoves(chain, gameId)
    if (existing.length >= moveNumber) {
      return NextResponse.json(
        { error: 'move number already recorded', moves: existing },
        { status: 409 }
      )
    }

    // 2. Legality (chain-agnostic): replay history, then apply the new move.
    //    An illegal sequence or illegal move is rejected before anything else.
    const board = new Chess()
    for (const m of existing) {
      try {
        if (!board.move(m.san)) {
          return NextResponse.json({ error: 'corrupt history' }, { status: 422 })
        }
      } catch {
        return NextResponse.json({ error: 'corrupt history' }, { status: 422 })
      }
    }
    const sideToMoveColor = board.turn() // 'w' | 'b' BEFORE this move
    let applied
    try {
      applied = board.move(san)
    } catch {
      applied = null
    }
    if (!applied) {
      return NextResponse.json({ error: 'illegal move' }, { status: 422 })
    }
    const fen = board.fen()

    // 3. On-chain binding (best-effort). On fast chains the game must be Active
    //    and the move must come from the side to move. On slow chains the game
    //    may not be confirmed yet, so a read failure is tolerated.
    try {
      const game = await getOnchainGame(chain, gameId)
      const terminal = game.status > STATUS_ACTIVE // Finished/Cancelled/Draw
      if (terminal) {
        return NextResponse.json({ error: 'game not active' }, { status: 409 })
      }
      if (isFastFinality(chain) && game.status !== STATUS_ACTIVE) {
        return NextResponse.json({ error: 'game not active' }, { status: 409 })
      }
      // Bind player → color only when both seats are known on-chain.
      if (game.white && game.black && !addrEq(game.white, game.black)) {
        const sideToMove = sideToMoveColor === 'w' ? game.white : game.black
        if (!addrEq(player, sideToMove)) {
          return NextResponse.json({ error: 'not your turn' }, { status: 403 })
        }
      }
    } catch (readErr: any) {
      if (isFastFinality(chain)) {
        console.error(`${LOG_PREFIX} on-chain read failed`, { chain, gameId, err: readErr?.message })
        return NextResponse.json({ error: 'game state unavailable' }, { status: 503 })
      }
      // slow chain, not yet confirmed — proceed on legality + signature only
    }

    // 4. Signature (optional but verified when present). Binds identity to the
    //    move via the canonical message; Stacks also needs the publicKey.
    let signer: string | undefined
    if (sig) {
      const message = canonicalMoveMessage({ chain, gameId, moveNumber, san: applied.san, fen })
      const ok = await verifyProfileSignature({ address: player, message, signature: sig, publicKey: publicKey || undefined })
      if (!ok) {
        return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
      }
      signer = player
    }

    // 5. Persist + register the game for any settlement sweep. The append is
    //    atomic and conditional on the history still being `existing.length`
    //    long — if another writer won this slot between our read and write, we
    //    reject rather than corrupt the history.
    const record: MoveRecord = { san: applied.san, player, moveNumber, ts: Date.now(), ...(signer ? { sig, signer } : {}) }
    const newLen = await appendMove(chain, gameId, record, existing.length)
    if (newLen === null) {
      const moves = await getMoves(chain, gameId)
      return NextResponse.json({ error: 'move number already recorded', moves }, { status: 409 })
    }
    await registerActiveGame(chain, gameId)
    return NextResponse.json({ ok: true, moveCount: newLen, move: record })
  } catch (err: any) {
    console.error(`${LOG_PREFIX} POST failed`, { chain, gameId, err: err?.message })
    return NextResponse.json({ error: 'relay unavailable' }, { status: 503 })
  }
}
