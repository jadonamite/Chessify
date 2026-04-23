'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWallet } from '@/components/wallet-provider'
import GlowButton from '@/components/ui/GlowButton'
import ClayCard from '@/components/ui/ClayCard'
import StatBadge from '@/components/ui/StatBadge'
import { useStacksRead } from '@/hooks/useStacksRead'
import { useStacksChess } from '@/hooks/useStacksChess'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/landing/Hero'
import { TOKEN_DECIMALS } from '@/config/contracts'


export default function LobbyPage() {
  const { 
    isConnected, isStacksConnected, activeChain, stacksAddress
  } = useWallet()
  
  const { createGame } = useStacksChess()
  const { getTokenBalance, getPlayerStats } = useStacksRead()
  const router = useRouter()
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [wager, setWager] = useState(100)
  const [balance, setBalance] = useState<string>('0.00')
  const [rating, setRating] = useState<number>(1200)

  // Fetch real stats
  useEffect(() => {
    if (activeChain === 'stacks' && stacksAddress) {
      getTokenBalance().then(b => {
        const formatted = (Number(b) / Math.pow(10, TOKEN_DECIMALS)).toFixed(2)
        setBalance(formatted)
      })
      getPlayerStats().then(s => {
        if (s) setRating(Number(s.rating.value))
      })
    }
  }, [activeChain, stacksAddress, getTokenBalance, getPlayerStats])


  // Mock data for lobby
  const openGames = [
    { id: 101, creator: 'SP2...X14', wager: 50, chain: 'stacks', elo: 1200 },
    { id: 202, creator: '0x4...a21', wager: 250, chain: 'celo', elo: 1850 },
    { id: 105, creator: 'SP3...A99', wager: 100, chain: 'stacks', elo: 1420 },
  ]

  const handleCreateGame = async () => {
    setIsPending(true)
    try {
      if (activeChain === 'stacks') {
        const res = await createGame(wager)
        console.log('Game create broadcasted:', res)
        setIsCreateModalOpen(false)
      } else {
        alert('Celo integration coming soon!')
      }
    } catch (err) {
      console.error('Create game failed:', err)
    } finally {
      setIsPending(false)
    }
  }

  if (!isConnected && !isStacksConnected) {
    return (
      <main className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-6">
        <Navbar />
        <ClayCard className="max-w-md w-full p-10 text-center mt-20">
          <h2 className="text-2xl font-bold text-[var(--t1)] mb-4">Connection Required</h2>
          <p className="text-[var(--t2)] mb-8">Please connect your wallet to enter the Chessify Lobby.</p>
          <GlowButton onClick={() => router.push('/')} variant="brand">Return Home</GlowButton>
        </ClayCard>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--t1)] overflow-x-hidden">
      <Navbar />
      
      {/* Ambient background effects */}
      <div className="fixed inset-0 pointer-events-none opacity-30">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[var(--c)] blur-[120px] rounded-full opacity-20" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#783cdc] blur-[120px] rounded-full opacity-10" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-12 pt-32">
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter mb-4 leading-none">
              Game <span className="text-[var(--c)]">Lobby</span>
            </h1>
            <div className="flex gap-4">
              <StatBadge label="ACTIVE NETWORK" value={activeChain?.toUpperCase() || 'NONE'} accent={true} />
              <StatBadge label="RATING" value={`${rating} ELO`} />
            </div>

          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex gap-4"
          >
            <GlowButton parallelogram variant="brand" size="lg" onClick={() => setIsCreateModalOpen(true)}>
              CREATE NEW MATCH
            </GlowButton>
          </motion.div>
        </header>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Open Matches List */}
          <div className="lg:col-span-2 space-y-6">
            <h3 className="text-xs font-bold tracking-[0.2em] text-[var(--t3)] uppercase mb-4">Open Challenges</h3>
            
            <div className="space-y-4">
              {openGames.filter(g => g.chain === activeChain).map((game, idx) => (
                <motion.div
                  key={game.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <ClayCard className="flex items-center justify-between p-6 hover:bg-[rgba(255,255,255,0.02)] transition-colors cursor-pointer group">
                    <div className="flex items-center gap-6">
                      <div className="w-12 h-12 bg-[var(--b1)] rounded-xl flex items-center justify-center font-bold text-[var(--c)] border border-[var(--b2)]">
                        {game.elo}
                      </div>
                      <div>
                        <div className="text-xs text-[var(--t3)] mb-1">CHALLENGER</div>
                        <div className="font-bold">{game.creator}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-10">
                      <div className="text-right">
                        <div className="text-xs text-[var(--t3)] mb-1">WAGER</div>
                        <div className="font-black text-[var(--c)]">{game.wager} CHESS</div>
                      </div>
                      <GlowButton size="sm" variant="ghost">JOIN</GlowButton>
                    </div>
                  </ClayCard>
                </motion.div>
              ))}

              {openGames.filter(g => g.chain === activeChain).length === 0 && (
                <div className="py-20 text-center border-2 border-dashed border-[var(--b1)] rounded-3xl">
                  <p className="text-[var(--t3)]">No open matches on {activeChain}. Create one!</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <h3 className="text-xs font-bold tracking-[0.2em] text-[var(--t3)] uppercase mb-4">Profile Stats</h3>
            
            <ClayCard className="p-8 space-y-6">
              <div>
                <div className="text-xs text-[var(--t3)] mb-2 uppercase tracking-wider">CHESS Balance</div>
                <div className="text-4xl font-black text-[var(--t1)]">
                  {balance} <span className="text-[var(--c)] text-sm">CHESS</span>
                </div>
              </div>

              
              <div className="pt-6 border-t border-[var(--b1)] grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] text-[var(--t3)] uppercase mb-1">Wins</div>
                  <div className="text-xl font-bold">14</div>
                </div>
                <div>
                  <div className="text-[10px] text-[var(--t3)] uppercase mb-1">Losses</div>
                  <div className="text-xl font-bold">8</div>
                </div>
              </div>

              <div className="pt-6">
                <GlowButton fullWidth variant="ghost" size="sm">History</GlowButton>
              </div>
            </ClayCard>

            <ClayCard className="p-6 bg-gradient-to-br from-[rgba(0,204,255,0.05)] to-transparent border-[rgba(0,204,255,0.1)]">
              <h4 className="font-bold mb-2">Need CHESS?</h4>
              <p className="text-xs text-[var(--t2)] mb-4">Get free tokens to start playing on {activeChain}.</p>
              <GlowButton fullWidth variant="brand" size="sm" onClick={() => router.push('#faucet')}>Visit Faucet</GlowButton>
            </ClayCard>
          </div>
        </div>
      </div>

      {/* Create Match Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md"
            >
              <ClayCard className="p-10">
                <h3 className="text-2xl font-black mb-6 uppercase italic">Create Match</h3>
                
                <div className="space-y-6 mb-10">
                  <div>
                    <label className="block text-xs font-bold text-[var(--t3)] uppercase tracking-widest mb-3">Wager Amount (CHESS)</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[50, 100, 250, 500, 1000, 2500].map(amt => (
                        <button
                          key={amt}
                          onClick={() => setWager(amt)}
                          className={`py-3 rounded-xl border font-bold transition-all ${
                            wager === amt 
                              ? 'bg-[var(--c)] text-black border-[var(--c)] shadow-[0_0_20px_rgba(0,204,255,0.3)]' 
                              : 'bg-[var(--b1)] text-[var(--t2)] border-[var(--b2)] hover:border-[var(--t3)]'
                          }`}
                        >
                          {amt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <GlowButton fullWidth variant="brand" onClick={handleCreateGame} disabled={isPending}>
                    {isPending ? 'BROADCASTING...' : 'INITIALIZE GAME'}
                  </GlowButton>
                </div>
              </ClayCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  )
}
