'use client'

import { useState, useEffect } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import { motion, AnimatePresence } from 'framer-motion'
import { useWallet } from '@/components/wallet-provider'
import { useStacksChess } from '@/hooks/useStacksChess'
import { useParams, useRouter } from 'next/navigation'
import ClayCard from '@/components/ui/ClayCard'
import GlowButton from '@/components/ui/GlowButton'
import StatBadge from '@/components/ui/StatBadge'
import { Navbar } from '@/components/landing/Hero'

export default function GamePage() {

  const { id } = useParams()
  const router = useRouter()
  const { activeChain, stacksAddress, address } = useWallet()
  const { submitMove, resign } = useStacksChess()
  
  const [game, setGame] = useState(new Chess())
  const [isPending, setIsPending] = useState(false)

  // Sync board with contract state (Mocked for now)
  useEffect(() => {
    // In a real app, we'd poll the contract or use a WebSocket
    console.log(`Loading game ${id} on ${activeChain}`)
  }, [id, activeChain])

  function onDrop({ sourceSquare, targetSquare }: any) {
    if (!targetSquare) return false
    try {
      const gameCopy = new Chess(game.fen())
      const move = gameCopy.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q', // always promote to queen for simplicity
      })


      if (move === null) return false

      setGame(gameCopy)
      
      // Trigger contract transaction
      handleMoveSubmission()
      return true
    } catch (e) {
      return false
    }
  }


  const handleMoveSubmission = async () => {
    setIsPending(true)
    try {
      if (activeChain === 'stacks') {
        const res = await submitMove(Number(id))
        console.log('Move broadcasted:', res)
      } else {
        // Celo submission logic...
      }
    } catch (err) {
      console.error('Move failed:', err)
      // Revert local state if needed
    } finally {
      setIsPending(false)
    }
  }

  const handleResign = async () => {
    if (!window.confirm('Are you sure you want to resign?')) return
    setIsPending(true)
    try {
      await resign(Number(id))
      router.push('/app/lobby')
    } catch (err) {
      console.error('Resign failed:', err)
    } finally {
      setIsPending(false)
    }
  }

  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--t1)] py-12 px-6">
      <Navbar />
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12">

        
        {/* Left Column: Board */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <ClayCard className="p-4 bg-[#0a0a0a] border-[var(--b1)] overflow-hidden">
            <div className="aspect-square w-full max-w-[600px] mx-auto">
              <Chessboard 
                options={{
                  position: game.fen(), 
                  onPieceDrop: onDrop,
                  boardOrientation: "white",
                  darkSquareStyle: { backgroundColor: '#1a1a2e' },
                  lightSquareStyle: { backgroundColor: '#2a2a4e' }
                }}
              />

            </div>
          </ClayCard>

          <div className="flex justify-between items-center bg-[var(--b1)] p-4 rounded-2xl border border-[var(--b2)]">
            <div className="flex gap-4">
              <StatBadge size="sm" label="WAGER" value="100 CHESS" accent />
              <StatBadge size="sm" label="TURN" value={game.turn() === 'w' ? 'WHITE' : 'BLACK'} />
            </div>
            <div className="flex gap-2">
              <GlowButton variant="ghost" size="sm" onClick={() => setGame(new Chess())}>RESET LOCAL</GlowButton>
              <GlowButton variant="brand" size="sm" onClick={handleResign} disabled={isPending}>RESIGN</GlowButton>
            </div>
          </div>
        </div>

        {/* Right Column: Game Info & Chat */}
        <div className="lg:col-span-5 space-y-6">
          <header className="mb-8">
            <div className="text-xs font-bold text-[var(--c)] tracking-[0.2em] uppercase mb-2">Match Instance #{id}</div>
            <h1 className="text-4xl font-black uppercase tracking-tighter italic">Live Gameplay</h1>
          </header>

          <ClayCard className="p-6 space-y-4">
            <div className="flex items-center justify-between p-3 bg-[var(--b1)] rounded-xl border border-[rgba(255,255,255,0.05)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-white to-gray-400" />
                <div>
                  <div className="text-[10px] text-[var(--t3)] uppercase font-bold">White</div>
                  <div className="text-sm font-bold truncate max-w-[120px]">{stacksAddress || address || 'You'}</div>
                </div>
              </div>
              <div className="text-xl font-mono font-black italic">14:52</div>
            </div>

            <div className="flex items-center justify-between p-3 bg-[rgba(0,204,255,0.03)] rounded-xl border border-[rgba(0,204,255,0.1)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#121212] to-[#2a2a2a] border border-white/10" />
                <div>
                  <div className="text-[10px] text-[var(--t3)] uppercase font-bold text-[var(--c)]">Black (Opponent)</div>
                  <div className="text-sm font-bold truncate max-w-[120px]">SP3...X99</div>
                </div>
              </div>
              <div className="text-xl font-mono font-black italic text-[var(--c)]">15:00</div>
            </div>
          </ClayCard>

          <ClayCard className="p-6">
            <h4 className="text-xs font-bold text-[var(--t3)] uppercase tracking-widest mb-4">Move History</h4>
            <div className="h-48 overflow-y-auto space-y-1 pr-2 custom-scrollbar">
              {game.history().map((move, i) => (
                <div key={i} className="flex justify-between py-2 border-b border-[rgba(255,255,255,0.03)] text-sm">
                  <span className="text-[var(--t3)] w-8">{Math.floor(i/2) + 1}.</span>
                  <span className="font-bold flex-1">{move}</span>
                  <span className="text-[10px] text-[var(--t3)]">BLOCK #4,192</span>
                </div>
              ))}
              {game.history().length === 0 && (
                <div className="text-center py-10 text-[var(--t3)] italic text-xs">No moves recorded yet.</div>
              )}
            </div>
          </ClayCard>

          <AnimatePresence>
            {isPending && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-4 bg-[var(--c)] text-black font-bold text-center rounded-xl shadow-[0_0_30px_rgba(0,204,255,0.2)]"
              >
                BROADCASTING TRANSACTION...
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>
  )
}
