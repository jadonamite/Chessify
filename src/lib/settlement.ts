import { Chess } from 'chess.js'
import type { MoveRecord } from '@/lib/moves-store'
import { normalizeAddress } from '@/lib/profile-address'

// Shared, client-safe settlement helpers. Imported by BOTH the browser (to sign
// moves) and the server (to verify + replay). Keep this file free of any
// server-only imports (no private keys, no node-only deps) so the move signer
// in the browser and the relay verifier on the server stay byte-identical.

// Result enum values (mirror the per-chain GameResult: WhiteWins/BlackWins/Draw).
export const RESULT = {
  WhiteWins: 1,
  BlackWins: 2,
  Draw: 3,
} as const
export type ResultValue = (typeof RESULT)[keyof typeof RESULT]

// A side that hasn't moved within this window after the opponent's last move
// forfeits on time. Mirrors the in-game move clock.
export const MOVE_TIMEOUT_MS = 5 * 60 * 1000

// Chain-aware address equality: EVM is case-insensitive, Stacks/Stellar are not.
// normalizeAddress lowercases only 0x… addresses; everything else is preserved.
export function addrEq(a: string, b: string): boolean {
  return normalizeAddress(a) === normalizeAddress(b)
}

/**
 * The exact message a player signs to authenticate a move. Deterministic and
 * identical on client (signing) and server (verification): it binds the move to
 * this game, this ply, this SAN, and the resulting position, so a signature for
 * one move can never be replayed onto another.
 *
 * INVARIANT: must stay byte-identical to the message built in useMoveSigner /
 * useGameMoves on the client.
 */
export function canonicalMoveMessage(p: {
  chain: string
  gameId: number
  moveNumber: number
  san: string
  fen: string
}): string {
  return [
    'chessify:move',
    `chain:${p.chain}`,
    `game:${p.gameId}`,
    `n:${p.moveNumber}`,
    `san:${p.san}`,
    `fen:${p.fen}`,
  ].join('\n')
}

export type Terminal =
  | {
      kind: 'result'
      result: ResultValue
    }
  | {
      kind: 'not-terminal'
    }
  | {
      kind: 'illegal'
    }

function isCheckmate(chess: Chess): boolean {
  return chess.isCheckmate()
}

function isDraw(chess: Chess): boolean {
  return chess.isStalemate() || chess.isInsufficientMaterial() || chess.isDraw()
}

function isTimeoutForfeit(moves: MoveRecord[], white: string, black: string, chess: Chess): boolean {
  if (moves.length === 0) return false
  const last = moves[moves.length - 1]
  if (Date.now() - last.ts > MOVE_TIMEOUT_MS) {
    const winnerIsWhite = chess.turn() !== 'w'
    const winnerAddr = winnerIsWhite ? white : black
    return addrEq(last.player, winnerAddr)
  }
  return false
}

/**
 * Replay the authoritative move list and decide the result. NEVER trusts the
 * client — the SAN list is replayed move-by-move with chess.js, and an illegal
 * sequence is rejected.
 */
export function deriveResult(moves: MoveRecord[], white: string, black: string): Terminal {
  const chess = new Chess()
  for (const m of moves) {
    try {
      const applied = chess.move(m.san)
      if (!applied) return { kind: 'illegal' }
    } catch {
      return { kind: 'illegal' }
    }
  }

  if (isCheckmate(chess)) {
    const loserIsWhite = chess.turn() === 'w'
    return {
      kind: 'result',
      result: loserIsWhite ? RESULT.BlackWins : RESULT.WhiteWins,
    }
  }

  if (isDraw(chess)) {
    return { kind: 'result', result: RESULT.Draw }
  }

  if (isTimeoutForfeit(moves, white, black, chess)) {
    const winnerIsWhite = chess.turn() !== 'w'
    return {
      kind: 'result',
      result: winnerIsWhite ? RESULT.WhiteWins : RESULT.BlackWins,
    }
  }

  return { kind: 'not-terminal' }
}

/**
 * Whose turn is it after replaying `moves`, expressed as the player address.
 * Returns null if the sequence is illegal. Used by the relay to enforce that a
 * submitted move actually comes from the side to move.
 */
export function sideToMoveAddress(moves: MoveRecord[], white: string, black: string): string | null {
  const chess = new Chess()
  for (const m of moves) {
    try {
      if (!chess.move(m.san)) return null
    } catch {
      return null
    }
  }
  return chess.turn() === 'w' ? white : black
}
