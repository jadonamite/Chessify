'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWallet } from '@/components/wallet-provider'
import GlowButton from '@/components/ui/GlowButton'
import ClayCard from '@/components/ui/ClayCard'
// import StatBadge from '@/components/ui/StatBadge'
import { useStacksRead } from '@/hooks/useStacksRead'
import { useStacksChess } from '@/hooks/useStacksChess'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/landing/Hero'
import { CELO_CONTRACTS, TOKEN_DECIMALS } from '@/config/contracts'
import { useCeloChess } from '@/hooks/useCeloChess'
// @ts-expect-error - intentional unused variable
import { useReadContract, useAccount } from 'wagmi'
import { CHESS_GAME_ABI, CHESS_TOKEN_ABI } from '@/config/abis'
import { formatUnits } from 'viem'


export default function LobbyContent() {
  const {
    isConnected, isStacksConnected, activeChain, stacksAddress, address: celoAddress
  } = useWallet()

  const { createGame: createStacksGame, joinGame: joinStacksGame } = useStacksChess()
  // @ts-expect-error - intentional unused isCeloPending
  const { createGame: createCeloGame, joinGame: joinCeloGame, isPending: isCeloPending } = useCeloChess()
  const { getTokenBalance: getStacksBalance, getPlayerStats: getStacksStats } = useStacksRead()
  const router = useRouter()

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [wager, setWager] = useState(100)
  const [balance, setBalance] = useState<string>('0.00')
  const [rating, setRating] = useState<number>(1200)

  // Fetch Celo Stats via Wagmi
  const { data: celoBalance } = useReadContract({
    address: CELO_CONTRACTS.token as `0x${string}`,
    abi: CHESS_TOKEN_ABI,
    functionName: 'balanceOf',
    args: [celoAddress as `0x${string}`],
    query: { enabled: activeChain === 'celo' && !!celoAddress }
  })

  const { data: celoStats } = useReadContract({
    address: CELO_CONTRACTS.game as `0x${string}`,
    abi: CHESS_GAME_ABI,
    functionName: 'playerStats',
    args: [celoAddress as `0x${string}`],
    query: { enabled: activeChain === 'celo' && !!celoAddress }
  })

  // Fetch real stats
  useEffect(() => {
    if (activeChain === 'stacks' && stacksAddress) {
      getStacksBalance().then(b => {
        const formatted = (Number(b) / Math.pow(10, TOKEN_DECIMALS)).toFixed(2)
        setBalance(formatted)
      })
      getStacksStats(stacksAddress).then(s => {
        if (s) setRating(Number(s.rating.value))
      })
    } else if (activeChain === 'celo' && celoAddress) {
       if (celoBalance !== undefined) {
         setBalance(formatUnits(celoBalance as bigint, TOKEN_DECIMALS))
       }
       if (celoStats) {
         setRating(Number((celoStats as any)[3])) // rating is 4th field
       }
    }
  }, [activeChain, stacksAddress, celoAddress, getStacksBalance, getStacksStats, celoBalance, celoStats])


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
        const res: any = await createStacksGame(wager)
        console.log('Stacks Game broadcasted:', res)
        setIsCreateModalOpen(false)
      } else {
        const tx = await createCeloGame(wager)
        console.log('Celo Game broadcasted:', tx)
        setIsCreateModalOpen(false)
      }
    } catch (err) {
      console.error('Create game failed:', err)
    } finally {
      setIsPending(false)
    }
  }

  const handleJoinGame = async (gameId: number, matchWager: number) => {
    setIsPending(true)
    try {
      if (activeChain === 'stacks') {
        const res: any = await joinStacksGame(gameId, matchWager)
        console.log('Stacks Join broadcasted:', res)
        router.push(`/app/game/${gameId}`)
      } else {
        const tx = await joinCeloGame(gameId, matchWager)
        console.log('Celo Join broadcasted:', tx)
        router.push(`/app/game/${gameId}`)
      }
    } catch (err) {
      console.error('Join game failed:', err)
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
    <main className="min-h-screen bg-[var(--bg)] text-[var(--t1)] overflow-x-hidden relative flex flex-col">
      <Navbar />

      {/* Ambient background effects & Grid from Hero */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 65% 55% at 50% 40%,rgba(0,204,255,.07) 0%,transparent 60%),radial-gradient(ellipse 35% 35% at 18% 80%,rgba(120,60,220,.05) 0%,transparent 60%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(var(--grid-line) 1px,transparent 1px),linear-gradient(90deg,var(--grid-line) 1px,transparent 1px)', backgroundSize: '52px 52px', pointerEvents: 'none', WebkitMaskImage: 'radial-gradient(ellipse 90% 90% at 50% 50%,black 30%,transparent 80%)', maskImage: 'radial-gradient(ellipse 90% 90% at 50% 50%,black 30%,transparent 80%)' }} />

      <div className="relative z-10 w-full max-w-[1400px] mx-auto px-6 py-12 pt-32 flex-1 flex flex-col">
        {/* Unified Dashboard Header */}
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-12 pb-6 border-b border-[var(--b1)] border-opacity-40">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col gap-4"
          >
            <h1 className="text-4xl md:text-[56px] font-black uppercase tracking-tighter leading-none" style={{ fontFamily: 'var(--fd)', textShadow: 'var(--hero-text-shadow)' }}>
              Game <span style={{ color: 'var(--c)', textShadow: 'var(--king-text-shadow)' }}>Lobby</span>
            </h1>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 bg-[var(--b1)] py-1.5 px-3 rounded-full border border-[var(--b2)] shadow-[0_0_12px_rgba(0,204,255,0.15)]">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--c)]" style={{ animation: 'pulseDot 2s ease-in-out infinite' }} />
                <span className="text-[11px] tracking-[0.2em] font-bold text-[var(--c)]" style={{ fontFamily: 'var(--fd)' }}>
                  {activeChain?.toUpperCase() || 'NONE'}
                </span>
              </div>
              <div className="flex items-center gap-2.5 px-3 py-1.5 bg-black/20 rounded-full border border-white/5">
                <span className="text-[10px] tracking-[0.15em] uppercase font-bold text-[var(--t2)]" style={{ fontFamily: 'var(--fd)' }}>
                  RATING
                </span>
                <span className="text-sm tracking-widest font-black text-[var(--t1)]">
                  {rating} <span className="text-[10px] text-[var(--c)] opacity-80">ELO</span>
                </span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center mt-4 md:mt-0"
          >
            <GlowButton parallelogram variant="brand" size="lg" onClick={() => setIsCreateModalOpen(true)}>
              CREATE NEW MATCH
            </GlowButton>
          </motion.div>
        </header>

        {/* Main Grid System */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 flex-1 content-start">
          {/* Open Matches List */}
          <div className="lg:col-span-8 flex flex-col gap-5">
            <h3 className="text-xs font-bold tracking-[0.25em] text-[var(--c)] opacity-80 uppercase pl-1" style={{ fontFamily: 'var(--fd)' }}>Open Challenges</h3>

            <div className="flex flex-col gap-4">
              {openGames.filter(g => g.chain === activeChain).map((game, idx) => (
                <motion.div
                  key={game.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <ClayCard className="clay-dark-card transition-all duration-300 hover:border-[var(--c)] hover:shadow-[0_4px_30px_rgba(0,204,255,0.15)] group" padding="md">
                    <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-6">
                      
                      {/* ELO Block */}
                      <div className="w-14 h-14 rounded-xl flex flex-col items-center justify-center font-bold text-[var(--c)] bg-black/40 border border-[var(--c)] border-opacity-20 shadow-inner">
                        <span className="text-[9px] uppercase tracking-widest opacity-60">ELO</span>
                        <span className="text-sm leading-none mt-0.5">{game.elo}</span>
                      </div>
                      
                      {/* Player Info */}
                      <div className="flex flex-col justify-center">
                        <span className="text-[10px] tracking-[0.2em] text-[var(--t3)] uppercase font-bold mb-1" style={{ fontFamily: 'var(--fd)' }}>CHALLENGER</span>
                        <span className="font-bold tracking-wide text-base text-white">{game.creator}</span>
                      </div>

                      {/* Wager amount */}
                      <div className="flex flex-col justify-center text-right pr-4 border-r border-white/10">
                        <span className="text-[10px] tracking-[0.2em] text-[var(--t3)] uppercase font-bold mb-1" style={{ fontFamily: 'var(--fd)' }}>WAGER</span>
                        <div className="font-black text-[var(--c)] text-lg leading-none">{game.wager} <span className="text-[10px] opacity-70">CHESS</span></div>
                      </div>

                      {/* Action */}
                      <div className="pl-2">
                        <GlowButton
                          size="md"
                          variant="brand"
                          onClick={() => handleJoinGame(game.id, game.wager)}
                          disabled={isPending}
                          className="opacity-90 group-hover:opacity-100 min-w-[120px]"
                        >
                          {isPending ? 'JOINING...' : 'JOIN MATCH'}
                        </GlowButton>
                      </div>

                    </div>
                  </ClayCard>
                </motion.div>
              ))}

              {openGames.filter(g => g.chain === activeChain).length === 0 && (
                <div className="py-24 text-center border-2 border-dashed border-[var(--b1)] rounded-3xl bg-[rgba(0,0,0,0.2)]">
                  <p className="text-sm font-medium text-[var(--t2)] tracking-wider">NO OPEN MATCHES ON {activeChain?.toUpperCase()}</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar / Profile Stats */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <h3 className="text-xs font-bold tracking-[0.25em] text-[var(--c)] opacity-80 uppercase pl-1" style={{ fontFamily: 'var(--fd)' }}>Profile Stats</h3>

            <ClayCard className="clay-cyan-card flex flex-col relative" padding="lg">
              {/* Top Accent Line */}
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[var(--c)] to-transparent opacity-80" />
              
              <div className="flex flex-col gap-2 mb-8">
                <span className="text-[10px] text-[var(--t2)] uppercase tracking-[0.25em] font-bold" style={{ fontFamily: 'var(--fd)' }}>CHESS Balance</span>
                <div className="text-4xl font-black text-white flex items-baseline gap-2 leading-none" style={{ fontFamily: 'var(--fd)' }}>
                  {balance} <span className="text-[var(--c)] text-sm tracking-widest font-bold">CHESS</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 pt-6 pb-8 border-t border-[var(--nav-border)]">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] text-[var(--t2)] uppercase tracking-[0.2em] font-bold" style={{ fontFamily: 'var(--fd)' }}>Wins</span>
                  <span className="text-2xl font-black text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.2)] leading-none">14</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] text-[var(--t2)] uppercase tracking-[0.2em] font-bold" style={{ fontFamily: 'var(--fd)' }}>Losses</span>
                  <span className="text-2xl font-bold text-[var(--t2)] leading-none">8</span>
                </div>
              </div>

              <div className="mt-auto">
                <GlowButton fullWidth variant="ghost" size="sm">VIEW HISTORY</GlowButton>
              </div>
            </ClayCard>

            <ClayCard className="clay-dark-card border-[rgba(0,204,255,0.1)] flex flex-col gap-4" padding="md">
              <div className="flex flex-col gap-1">
                <h4 className="font-bold text-sm tracking-wide text-white" style={{ fontFamily: 'var(--fd)' }}>Need CHESS?</h4>
                <p className="text-xs text-[var(--t2)] leading-relaxed">Top up your wallet with testnet tokens to start playing on {activeChain}.</p>
              </div>
              <GlowButton fullWidth variant="brand" size="md" onClick={() => router.push('#faucet')}>
                VISIT FAUCET
              </GlowButton>
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
                          className={`py-3 rounded-xl border font-bold transition-all ${wager === amt
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
