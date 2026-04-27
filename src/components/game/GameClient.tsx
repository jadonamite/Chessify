'use client'

import { useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Chess } from 'chess.js'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useWallet } from '@/components/wallet-provider'
import { useStacksChess } from '@/hooks/useStacksChess'
import { useStacksRead } from '@/hooks/useStacksRead'
import { useCeloChess } from '@/hooks/useCeloChess'
// @ts-ignore - intentional unused variable
import { useAccount, useReadContract } from 'wagmi'
import { CHESS_GAME_ABI } from '@/config/abis'
import { CELO_CONTRACTS } from '@/config/contracts'
import ClayCard from '@/components/ui/ClayCard'
import GlowButton from '@/components/ui/GlowButton'
import StatBadge from '@/components/ui/StatBadge'
import LoadingState from '@/components/ui/LoadingState'
import { Navbar } from '@/components/landing/Hero'
import { getBestMove } from '@/lib/chess-engine'

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
  const isBotGame = params?.id === 'bot'
  const gameId = isBotGame ? 0 : Number(params?.id ?? 0)

  // @ts-ignore - intentional
  const { stacksAddress, isStacksConnected, activeChain, address: celoAddress, isConnected, connectWallet } = useWallet()
  const { submitMove: submitStacksMove, resign: resignStacks, reportWin: reportStacksWin } = useStacksChess()
  // @ts-ignore - intentional
  const { getGame: getStacksGame, getPlayerStats: getStacksStats } = useStacksRead()
  
  // @ts-ignore - intentional unused variable
  const { 
    submitMove: submitCeloMove, 
    resign: resignCelo, 
    reportWin: reportCeloWin,
    isPending: isCeloPending 
  } = useCeloChess()

  const [game, setGame] = useState(() => new Chess())
  const [gameData, setGameData] = useState<GameData | null>(null)
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null)
  const [moveHistory, setMoveHistory] = useState<string[]>([])
  const [txPending, setTxPending] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)

  // Fetch Celo Game Data
  const { data: celoGameData } = useReadContract({
    address: CELO_CONTRACTS.game as `0x${string}`,
    abi: CHESS_GAME_ABI,
    functionName: 'getGame',
    args: [BigInt(gameId)],
    query: { enabled: activeChain === 'celo' && !!gameId }
  })

  // Lazy-load game + player data once on mount
  const loadData = useCallback(() => {
    if (dataLoaded) return
    setDataLoaded(true)
    
    if (activeChain === 'stacks') {
      if (gameId) {
        void getStacksGame(gameId).then(d => { if (d) setGameData(d as GameData) })
      }
      if (stacksAddress) {
        void getStacksStats(stacksAddress).then(s => { if (s) setPlayerStats(s as PlayerStats) })
      }
    } else if (activeChain === 'celo' && celoGameData) {
      const gd = celoGameData as any
      setGameData({
        player1: gd.white,
        player2: gd.black,
        wager: gd.wager.toString(),
        status: gd.status.toString()
      })
    }
  }, [dataLoaded, gameId, stacksAddress, activeChain, getStacksGame, getStacksStats, celoGameData])

  // Trigger on first render (no useEffect needed — called from onLoad ref below)
  // We use a ref callback on the wrapper div to fire once after mount.
  const onMountRef = useCallback((el: HTMLDivElement | null) => {
    if (el) loadData()
  }, [loadData])

  // ── board interaction ────────────────────────────────────────────────────

  const onDrop = useCallback(({ sourceSquare, targetSquare }: { sourceSquare: string, targetSquare: string }): boolean => {
    try {
      const next = new Chess(game.fen())
      const move = next.move({ from: sourceSquare, to: targetSquare, promotion: 'q' })
      
      if (!move) return false

      // Update state
      setGame(next)
      setMoveHistory(h => [...h, move.san])
      
      // If bot game, trigger bot move after a short delay
      if (isBotGame && !next.isGameOver()) {
        setTimeout(() => {
          const gameCopy = new Chess(next.fen())
          const botMove = getBestMove(gameCopy, 3)
          if (botMove) {
            next.move(botMove)
            setGame(new Chess(next.fen()))
            setMoveHistory(h => [...h, botMove.san])
          }
        }, 1200)
      }
      
      return true
    } catch (e) {
      console.error('Move failed:', e)
      return false
    }
  }, [game, isBotGame])

  // ── tx helpers ───────────────────────────────────────────────────────────

  const withTx = useCallback(async (fn: () => Promise<unknown> | undefined) => {
    if (txPending) return
    setTxPending(true)
    try { await fn() } catch (e) { console.error('[GameClient] tx error:', e) } finally { setTxPending(false) }
  }, [txPending])

  // ── derived ──────────────────────────────────────────────────────────────

  const canAct = (isBotGame || isStacksConnected || isConnected) && !txPending
  const gameOver = game.isGameOver()
  const turn = game.turn() // 'w' | 'b'

  const handleMoveSubmit = async () => {
    await withTx(async () => {
       if (activeChain === 'stacks') await submitStacksMove(gameId)
       else await submitCeloMove(gameId)
    })
  }

  const handleResign = async () => {
    await withTx(async () => {
       if (activeChain === 'stacks') await resignStacks(gameId)
       else await resignCelo(gameId)
    })
  }

  const handleReportWin = async () => {
    await withTx(async () => {
       if (activeChain === 'stacks') await reportStacksWin(gameId)
       else await reportCeloWin(gameId)
    })
  }

  // ── render ───────────────────────────────────────────────────────────────

  return (
    <div ref={onMountRef} className="min-h-screen bg-[var(--bg)] text-[var(--t1)]">
      <Navbar />
      
      {/* Ambient background effects */}
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div className="absolute top-[10%] right-[10%] w-[30%] h-[30%] bg-[var(--c)] blur-[120px] rounded-full opacity-20" />
        <div className="absolute bottom-[10%] left-[10%] w-[30%] h-[30%] bg-[#783cdc] blur-[120px] rounded-full opacity-10" />
      </div>

      {!isBotGame && !gameData ? (
        <div className="min-h-screen flex items-center justify-center">
          <LoadingState message={`RETRIEVING MATCH DATA #${gameId}`} />
        </div>
      ) : (
        <main className="relative z-10 max-w-7xl mx-auto px-6 py-12 pt-32">
        {/* ── header ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter">
              {isBotGame ? (
                <>AI <span className="text-[var(--c)]">Training</span></>
              ) : (
                <>Match <span className="text-[var(--c)]">#{gameId}</span></>
              )}
            </h1>
            {isBotGame ? (
              <div className="flex gap-4 mt-4">
                <StatBadge label="MODE" value="SINGLE PLAYER" accent />
                <StatBadge label="OPPONENT" value="SYSTEM BOT" />
              </div>
            ) : gameData && (
              <div className="flex gap-4 mt-4">
                <StatBadge label="WAGER" value={`${gameData.wager} CHESS`} accent />
                <StatBadge label="STATUS" value={gameData.status.toUpperCase()} />
              </div>
            )}
          </div>
          <Link href="/app/lobby">
            <GlowButton variant="ghost" size="sm" parallelogram>← BACK TO LOBBY</GlowButton>
          </Link>
        </div>

        {/* ── grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Board Area */}
          <div className="lg:col-span-8">
            <ClayCard className="p-4 md:p-8 relative overflow-hidden">
               {/* Watermark Piece */}
               <div className="absolute -right-10 -bottom-10 opacity-[0.03] rotate-12 pointer-events-none">
                 <svg width="300" height="300" viewBox="0 0 24 24" fill="currentColor">
                   <path d="M19,22H5V20H19V22M17,10C17,8.9 16.1,8 15,8V7C15,5.34 13.66,4 12,4C10.34,4 9,5.34 9,7V8C7.9,8 7,8.9 7,10V11H17V10M15,13H9V18H15V13Z" />
                 </svg>
               </div>

              <div className="max-w-[600px] mx-auto aspect-square">
                <Chessboard
                  // @ts-ignore
                  id="BasicBoard"
                  position={game.fen()}
                  // @ts-ignore
                  onPieceDrop={(sourceSquare, targetSquare) => {
                    if (!targetSquare) return false;
                    return onDrop({ sourceSquare, targetSquare });
                  }}
                  boardOrientation={activeChain === 'stacks' ? 'white' : 'white'}
                  arePiecesDraggable={canAct && !gameOver}
                  customDarkSquareStyle={{ backgroundColor: '#161636' }}
                  customLightSquareStyle={{ backgroundColor: '#2a2a5a' }}
                  customBoardStyle={{
                    borderRadius: '12px',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                  }}
                />
              </div>

              {/* Turn Indicator */}
              <div className="mt-8 text-center flex flex-col items-center gap-2">
                {gameOver ? (
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="px-6 py-3 rounded-2xl bg-[var(--c)]/10 border border-[var(--c)]/30 text-[var(--c)] font-black uppercase italic tracking-widest text-lg"
                  >
                    {game.isCheckmate() ? 'CHECKMATE' : 'GAME OVER'}
                  </motion.div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full animate-pulse ${turn === 'w' ? 'bg-white shadow-[0_0_10px_white]' : 'bg-gray-600'}`} />
                    <span className="text-sm font-bold tracking-widest text-[var(--t3)] uppercase">
                      {turn === 'w' ? 'White to move' : 'Black to move'}
                    </span>
                  </div>
                )}
              </div>
            </ClayCard>
          </div>

          {/* Sidebar Area */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Player Stats */}
            <ClayCard variant="inset" className="p-6">
              <h3 className="text-[10px] font-black tracking-[0.2em] text-[var(--t3)] uppercase mb-4">Commander Stats</h3>
              <div className="grid grid-cols-2 gap-3">
                {/* @ts-ignore - intentional fullWidth */}
                <StatBadge label="ELO" value={playerStats?.rating || 1200} accent fullWidth />
                {/* @ts-ignore - intentional fullWidth */}
                <StatBadge label="W/L" value={`${playerStats?.wins || 0}/${playerStats?.losses || 0}`} fullWidth />
              </div>
            </ClayCard>

            {/* Actions */}
            <ClayCard className="p-6">
              <h3 className="text-[10px] font-black tracking-[0.2em] text-[var(--t3)] uppercase mb-4">Operations</h3>
              <div className="space-y-3">
                <GlowButton
                  variant="brand"
                  fullWidth
                  parallelogram
                  disabled={!canAct || gameOver || isBotGame}
                  loading={txPending}
                  onClick={handleMoveSubmit}
                >
                  {isBotGame ? 'BOT SESSION ACTIVE' : 'BROADCAST MOVE'}
                </GlowButton>
                
                <div className="grid grid-cols-2 gap-3">
                  <GlowButton
                    variant="ghost"
                    size="sm"
                    disabled={!canAct || gameOver}
                    loading={txPending}
                    onClick={handleReportWin}
                  >
                    REPORT WIN
                  </GlowButton>
                  <GlowButton
                    variant="ghost"
                    size="sm"
                    disabled={!canAct || gameOver}
                    loading={txPending}
                    className="text-red-400 !border-red-500/20 hover:!bg-red-500/10"
                    onClick={handleResign}
                  >
                    RESIGN
                  </GlowButton>
                </div>
              </div>
            </ClayCard>

            {/* History */}
            <ClayCard variant="inset" className="p-6">
              <h3 className="text-[10px] font-black tracking-[0.2em] text-[var(--t3)] uppercase mb-4">Move Log</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                {moveHistory.map((san, i) => (
                  <div key={i} className={`flex items-center gap-2 text-xs font-mono p-2 rounded-lg ${i % 2 === 0 ? 'bg-white/5' : ''}`}>
                    <span className="text-[var(--t3)] w-4 text-left">{Math.floor(i/2) + 1}.</span>
                    <span className={i % 2 === 0 ? 'text-[var(--t1)]' : 'text-[var(--t2)]'}>{san}</span>
                  </div>
                ))}
                {moveHistory.length === 0 && (
                  <p className="col-span-2 text-center text-xs text-[var(--t3)] py-4">Waiting for first strike...</p>
                )}
              </div>
            </ClayCard>

            {/* Network Sync */}
            {(!isConnected && !isStacksConnected) && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 text-center flex flex-col gap-3 items-center"
              >
                <span className="text-yellow-200/70 text-[10px] uppercase font-bold tracking-widest">
                  Connection required for tactical input
                </span>
                <GlowButton variant="brand" size="sm" onClick={connectWallet}>
                  CONNECT WALLET
                </GlowButton>
              </motion.div>
            )}
          </div>

        </div>
      </main>
      )}
    </div>
  )
}
