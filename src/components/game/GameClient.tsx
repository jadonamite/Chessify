'use client'

import { useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Chess } from 'chess.js'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useWallet } from '@/components/wallet-provider'
import { useStacksChess } from '@/hooks/useStacksChess'
import { useStacksRead } from '@/hooks/useStacksRead'
import ClayCard from '@/components/ui/ClayCard'
import GlowButton from '@/components/ui/GlowButton'
import StatBadge from '@/components/ui/StatBadge'
import { Navbar } from '@/components/landing/Hero'

// Dynamically import Chessboard to avoid SSR issues
const Chessboard = dynamic(() => import('react-chessboard').then(mod => mod.Chessboard), { ssr: false })

// ─── types ─────────────────────────────────────────────────────────────────

interface GameData {
  player1: string
  player2: string
  wager: string
  status: string
}

interface PlayerStats {
  wins: number
  losses: number
  rating: number
}

// ─── component ─────────────────────────────────────────────────────────────

export default function GameClient() {
  const params = useParams()
  const gameId = Number(params?.id ?? 0)

  const { stacksAddress, isStacksConnected, activeChain } = useWallet()
  const { submitMove, resign, reportWin } = useStacksChess()
  const { getGame, getPlayerStats } = useStacksRead()

  const [game, setGame] = useState(() => new Chess())
  const [gameData, setGameData] = useState<GameData | null>(null)
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null)
  const [moveHistory, setMoveHistory] = useState<string[]>([])
  const [txPending, setTxPending] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)

  // Lazy-load game + player data once on mount
  const loadData = useCallback(() => {
    if (dataLoaded) return
    setDataLoaded(true)
    if (gameId) {
      void getGame(gameId).then(d => { if (d) setGameData(d as GameData) })
    }
    if (stacksAddress) {
      void getPlayerStats(stacksAddress).then(s => { if (s) setPlayerStats(s as PlayerStats) })
    }
  }, [dataLoaded, gameId, stacksAddress, getGame, getPlayerStats])

  // Trigger on first render (no useEffect needed — called from onLoad ref below)
  // We use a ref callback on the wrapper div to fire once after mount.
  const onMountRef = useCallback((el: HTMLDivElement | null) => {
    if (el) loadData()
  }, [loadData])

  // ── board interaction ────────────────────────────────────────────────────

  const onDrop = useCallback(({ sourceSquare, targetSquare }: { sourceSquare: string, targetSquare: string }): boolean => {
    try {
      const next = new Chess(game.fen())
      const mv = next.move({ from: sourceSquare, to: targetSquare, promotion: 'q' })
      if (!mv) return false
      setGame(next)
      setMoveHistory(h => [...h, mv.san])
      return true
    } catch {
      return false
    }
  }, [game])

  // ── tx helpers ───────────────────────────────────────────────────────────

  const withTx = useCallback(async (fn: () => Promise<unknown> | undefined) => {
    if (txPending) return
    setTxPending(true)
    try { await fn() } catch (e) { console.error('[GameClient] tx error:', e) } finally { setTxPending(false) }
  }, [txPending])

  // ── derived ──────────────────────────────────────────────────────────────

  const canAct = isStacksConnected && activeChain === 'stacks' && !txPending
  const gameOver = game.isGameOver()
  const turn = game.turn() // 'w' | 'b'

  // ── render ───────────────────────────────────────────────────────────────

  return (
    <div ref={onMountRef} style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--t1)' }}>
      <Navbar />

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>

        {/* ── header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--fd)', fontWeight: 900, fontSize: 28, margin: 0 }}>
              Game <span style={{ color: 'var(--c)' }}>#{gameId}</span>
            </h1>
            {gameData && (
              <p style={{ fontFamily: 'var(--fd)', fontSize: 11, color: 'var(--t3)', marginTop: 5, marginBottom: 0 }}>
                Wager: {gameData.wager} CHESS &nbsp;·&nbsp; Status: {gameData.status}
              </p>
            )}
          </div>
          <Link href="/app/lobby">
            <GlowButton variant="ghost" size="sm">← Lobby</GlowButton>
          </Link>
        </div>

        {/* ── grid ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1fr) 296px',
          gap: 20,
          alignItems: 'start',
        }}>

          {/* Board */}
          <ClayCard padding="md">
            <div style={{ width: '100%', maxWidth: 520, margin: '0 auto' }}>
              <Chessboard
                options={{
                  id: "BasicBoard",
                  position: game.fen(),
                  onPieceDrop: ({ sourceSquare, targetSquare }) => onDrop({ sourceSquare, targetSquare }),
                  allowDragging: canAct && !gameOver,
                  boardStyle: { borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,.55)' },
                  darkSquareStyle: { backgroundColor: '#161636' },
                  lightSquareStyle: { backgroundColor: '#2a2a5a' }
                }}
              />
            </div>

            {/* Turn / game-over indicator */}
            <div style={{ marginTop: 14, textAlign: 'center' }}>
              {gameOver ? (
                <span style={{
                  display: 'inline-block', padding: '8px 20px', borderRadius: 8,
                  background: 'rgba(0,204,255,.08)', border: '1px solid rgba(0,204,255,.2)',
                  fontFamily: 'var(--fd)', fontWeight: 800, color: 'var(--c)', fontSize: 13,
                }}>
                  {game.isCheckmate()
                    ? `${turn === 'w' ? 'Black' : 'White'} wins by checkmate`
                    : 'Game drawn'}
                </span>
              ) : (
                <span style={{
                  fontFamily: 'var(--fd)', fontSize: 11, color: 'var(--t3)', letterSpacing: '.08em',
                }}>
                  {turn === 'w' ? '⬜ White' : '⬛ Black'} to move
                </span>
              )}
            </div>
          </ClayCard>

          {/* Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Stats */}
            {playerStats && (
              <ClayCard padding="sm" variant="inset">
                <p style={{ fontFamily: 'var(--fd)', fontSize: 9, letterSpacing: '.12em', color: 'var(--t3)', margin: '0 0 10px' }}>
                  YOUR STATS
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                  <StatBadge label="ELO"    value={playerStats.rating} accent size="sm" />
                  <StatBadge label="WINS"   value={playerStats.wins}   size="sm" />
                  <StatBadge label="LOSSES" value={playerStats.losses} size="sm" />
                </div>
              </ClayCard>
            )}

            {/* Actions */}
            <ClayCard padding="sm">
              <p style={{ fontFamily: 'var(--fd)', fontSize: 9, letterSpacing: '.12em', color: 'var(--t3)', margin: '0 0 10px' }}>
                ACTIONS
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <GlowButton
                  variant="brand" size="sm" fullWidth
                  loading={txPending}
                  disabled={!canAct || gameOver}
                  onClick={() => void withTx(() => submitMove(gameId))}
                >
                  Submit Move On-Chain
                </GlowButton>
                <GlowButton
                  variant="ghost" size="sm" fullWidth
                  loading={txPending}
                  disabled={!canAct || gameOver}
                  onClick={() => void withTx(() => reportWin(gameId))}
                >
                  Report Win
                </GlowButton>
                <GlowButton
                  variant="ghost" size="sm" fullWidth
                  loading={txPending}
                  disabled={!canAct || gameOver}
                  style={{ color: 'rgba(255,80,80,.75)' }}
                  onClick={() => void withTx(() => resign(gameId))}
                >
                  Resign
                </GlowButton>
              </div>
            </ClayCard>

            {/* Move history */}
            {moveHistory.length > 0 && (
              <ClayCard padding="sm" variant="inset">
                <p style={{ fontFamily: 'var(--fd)', fontSize: 9, letterSpacing: '.12em', color: 'var(--t3)', margin: '0 0 8px' }}>
                  MOVES
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxHeight: 148, overflowY: 'auto' }}>
                  {moveHistory.map((san, i) => (
                    <span key={i} style={{
                      fontFamily: 'var(--fd)', fontSize: 11,
                      padding: '2px 7px', borderRadius: 4,
                      background: 'rgba(255,255,255,.04)',
                      color: i % 2 === 0 ? 'var(--t1)' : 'var(--t2)',
                    }}>
                      {i % 2 === 0 && (
                        <span style={{ color: 'var(--t3)', marginRight: 2 }}>
                          {Math.floor(i / 2) + 1}.
                        </span>
                      )}
                      {san}
                    </span>
                  ))}
                </div>
              </ClayCard>
            )}

            {/* Wallet warning */}
            {!isStacksConnected && (
              <ClayCard padding="sm" variant="inset">
                <p style={{ fontSize: 12, color: 'var(--t2)', textAlign: 'center', lineHeight: 1.65, margin: 0 }}>
                  Connect your Stacks wallet to interact with this game.
                </p>
              </ClayCard>
            )}

          </div>
        </div>
      </main>
    </div>
  )
}
