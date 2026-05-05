import { Chess, Move } from 'chess.js'

// Piece values for material evaluation
const PIECE_VALUES: Record<string, number> = {
  p: 10,
  n: 30,
  b: 30,
  r: 50,
  q: 90,
  k: 900
}

// Simple positional evaluation tables (higher values favor the piece being in that square)
// Reversed for black
const PAWN_TABLE = [
  [0,  0,  0,  0,  0,  0,  0,  0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [5,  5, 10, 25, 25, 10,  5,  5],
  [0,  0,  0, 20, 20,  0,  0,  0],
  [5, -5,-10,  0,  0,-10, -5,  5],
  [5, 10, 10,-20,-20, 10, 10,  5],
  [0,  0,  0,  0,  0,  0,  0,  0]
]

const KNIGHT_TABLE = [
  [-50,-40,-30,-30,-30,-30,-40,-50],
  [-40,-20,  0,  0,  0,  0,-20,-40],
  [-30,  0, 10, 15, 15, 10,  0,-30],
  [-30,  5, 15, 20, 20, 15,  5,-30],
  [-30,  0, 15, 20, 20, 15,  0,-30],
  [-30,  5, 10, 15, 15, 10,  5,-30],
  [-40,-20,  0,  5,  5,  0,-20,-40],
  [-50,-40,-30,-30,-30,-30,-40,-50]
]

function evaluateBoard(game: Chess): number {
  let totalEvaluation = 0
  const board = game.board()

  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const piece = board[i][j]
      if (piece) {
        let value = PIECE_VALUES[piece.type] || 0
        
        // Add positional bonus
        if (piece.type === 'p') value += PAWN_TABLE[i][j]
        if (piece.type === 'n') value += KNIGHT_TABLE[i][j]
        
        totalEvaluation += (piece.color === 'w' ? value : -value)
      }
    }
  }
  return totalEvaluation
}

export function getBestMove(game: Chess, depth: number = 3): Move | null {
  const possibleMoves = game.moves({ verbose: true })
  if (game.isGameOver() || possibleMoves.length === 0) return null

  let bestMove = null
  let bestValue = Infinity // Black is the bot, so it wants to minimize (negative score)

  for (const move of possibleMoves) {
    game.move(move)
    const boardValue = minimax(game, depth - 1, -Infinity, Infinity, true)
    game.undo()
    
    if (boardValue < bestValue) {
      bestValue = boardValue
      bestMove = move
    }
  }

  return bestMove
}

function minimax(
  game: Chess,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizingPlayer: boolean
): number {
  if (depth === 0) return evaluateBoard(game)

  const possibleMoves = game.moves()

  if (isMaximizingPlayer) {
    let bestValue = -Infinity
    for (const move of possibleMoves) {
      game.move(move)
      bestValue = Math.max(bestValue, minimax(game, depth - 1, alpha, beta, !isMaximizingPlayer))
      game.undo()
      alpha = Math.max(alpha, bestValue)
      if (beta <= alpha) break
    }
    return bestValue
  } else {
    let bestValue = Infinity
    for (const move of possibleMoves) {
      game.move(move)
      bestValue = Math.min(bestValue, minimax(game, depth - 1, alpha, beta, !isMaximizingPlayer))
      game.undo()
      beta = Math.min(beta, bestValue)
      if (beta <= alpha) break
    }
    return bestValue
  }
}
