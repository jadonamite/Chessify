'use client'

import { useState, useEffect, Suspense, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWallet } from '@/components/wallet-provider'
import GlowButton from '@/components/ui/GlowButton'
import ClayCard from '@/components/ui/ClayCard'
import ComingSoonOverlay from '@/components/ui/ComingSoonOverlay'
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
import { Canvas } from '@react-three/fiber'
import { useGLTF, Float, Environment } from '@react-three/drei'
import * as THREE from 'three'

// STRICT RULE: Preload all 3D assets outside the component tree
useGLTF.preload('/models/King.glb')
useGLTF.preload('/models/QueenChess.glb')
useGLTF.preload('/models/Rook.glb')
useGLTF.preload('/models/pawn.glb')

// 3D Background Component Setup with Custom Materials
function LiveBackgroundPieces() {
  const king = useGLTF('/models/King.glb')
  const queen = useGLTF('/models/QueenChess.glb')
  const rook = useGLTF('/models/Rook.glb')
  const pawn = useGLTF('/models/pawn.glb')

  // SENIOR FIX: Mutate materials so they match the app's cyberpunk aesthetic
  const cyanMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#00ccff', emissive: '#00ccff', emissiveIntensity: 0.4, roughness: 0.2, metalness: 0.8
  }), [])

  const slateMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#0f172a', roughness: 0.4, metalness: 0.6
  }), [])

  const applyMaterial = (scene: THREE.Group, material: THREE.Material) => {
    const clone = scene.clone()
    clone.traverse((child: any) => { if (child.isMesh) child.material = material })
    return clone
  }

  const coloredQueen = useMemo(() => applyMaterial(queen.scene, cyanMaterial), [queen.scene, cyanMaterial])
  const coloredKing = useMemo(() => applyMaterial(king.scene, cyanMaterial), [king.scene, cyanMaterial])
  const coloredRook = useMemo(() => applyMaterial(rook.scene, slateMaterial), [rook.scene, slateMaterial])
  const coloredPawn = useMemo(() => applyMaterial(pawn.scene, slateMaterial), [pawn.scene, slateMaterial])

  return (
    <>
      <ambientLight intensity={1.5} />
      <directionalLight position={[10, 10, 5]} intensity={2} color="#00ccff" />
      <directionalLight position={[-10, -10, -5]} intensity={1} color="#6a0dad" />
      <Environment preset="city" />

      {/* Structured LIVE 2x2 layout, strictly framed in the background */}
      <Float speed={0.8} rotationIntensity={0.2} floatIntensity={0.4} position={[-5, 3, -3]}>
        <primitive object={coloredQueen} scale={1.3} rotation={[0.1, 0.4, 0.1]} />
      </Float>

      <Float speed={1.0} rotationIntensity={0.3} floatIntensity={0.5} position={[5, 4, -5]}>
        <primitive object={coloredKing} scale={1.5} rotation={[-0.1, -0.2, 0.2]} />
      </Float>

      <Float speed={0.9} rotationIntensity={0.15} floatIntensity={0.3} position={[-4.5, -3, -2]}>
        <primitive object={coloredRook} scale={1.1} rotation={[0.1, 0.2, -0.1]} />
      </Float>

      <Float speed={0.7} rotationIntensity={0.25} floatIntensity={0.4} position={[4.5, -4, -1]}>
        <primitive object={coloredPawn} scale={1.0} rotation={[-0.2, -0.1, 0.3]} />
      </Float>
    </>
  )
}

export default function LobbyContent() {
  const { isConnected, isStacksConnected, activeChain, stacksAddress, address: celoAddress } = useWallet()
  const { createGame: createStacksGame, joinGame: joinStacksGame } = useStacksChess()
  // @ts-expect-error - intentional unused isCeloPending
  const { createGame: createCeloGame, joinGame: joinCeloGame, isPending: isCeloPending } = useCeloChess()
  const { getTokenBalance: getStacksBalance, getPlayerStats: getStacksStats } = useStacksRead()
  const router = useRouter()

  const [isComingSoonOpen, setIsComingSoonOpen] = useState(false)
  const MAINTENANCE_MODE = true

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

  useEffect(() => {
    if (activeChain === 'stacks' && stacksAddress) {
      getStacksBalance().then(b => setBalance((Number(b) / Math.pow(10, TOKEN_DECIMALS)).toFixed(2)))
      getStacksStats(stacksAddress).then(s => { if (s) setRating(Number(s.rating.value)) })
    } else if (activeChain === 'celo' && celoAddress) {
      if (celoBalance !== undefined) setBalance(formatUnits(celoBalance as bigint, TOKEN_DECIMALS))
      if (celoStats) setRating(Number((celoStats as any)[3]))
    }
  }, [activeChain, stacksAddress, celoAddress, getStacksBalance, getStacksStats, celoBalance, celoStats])

  const openGames = [
    { id: 101, creator: 'SP2...X14', wager: 50, chain: 'stacks', elo: 1200 },
    { id: 202, creator: '0x4...a21', wager: 250, chain: 'celo', elo: 1850 },
    { id: 105, creator: 'SP3...A99', wager: 100, chain: 'stacks', elo: 1420 },
  ]

  // Intercept handlers cleanly
  const handleCreateGame = async () => {
    if (MAINTENANCE_MODE) return setIsComingSoonOpen(true)
    setIsPending(true)
    try {
      if (activeChain === 'stacks') {
        await createStacksGame(wager)
        setIsCreateModalOpen(false)
      } else {
        await createCeloGame(wager)
        setIsCreateModalOpen(false)
      }
    } catch (err) {
      console.error('Create game failed:', err)
    } finally {
      setIsPending(false)
    }
  }

  const handleJoinGame = async (gameId: number, matchWager: number) => {
    if (MAINTENANCE_MODE) return setIsComingSoonOpen(true)
    setIsPending(true)
    try {
      if (activeChain === 'stacks') {
        await joinStacksGame(gameId, matchWager)
        router.push(`/app/game/${gameId}`)
      } else {
        await joinCeloGame(gameId, matchWager)
        router.push(`/app/game/${gameId}`)
      }
    } catch (err) {
      console.error('Join game failed:', err)
    } finally {
      setIsPending(false)
    }
  }

  const handleAction = (action: () => void) => MAINTENANCE_MODE ? setIsComingSoonOpen(true) : action()

  if (!isConnected && !isStacksConnected) {
    return (
      <main className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-6 relative overflow-hidden">
        <Navbar />
        <div className="absolute inset-0 pointer-events-none z-0 opacity-40">
          <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
            <Suspense fallback={null}><LiveBackgroundPieces /></Suspense>
          </Canvas>
        </div>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(var(--grid-line) 1px,transparent 1px),linear-gradient(90deg,var(--grid-line) 1px,transparent 1px)', backgroundSize: '52px 52px', pointerEvents: 'none', zIndex: 0, opacity: 0.5 }} />

        <ClayCard className="max-w-md w-full p-8 md:p-10 text-center mt-20 relative z-10 shadow-2xl">
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

      {/* 3D Background */}
      <div className="absolute inset-0 pointer-events-none z-0 opacity-50">
        <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
          <Suspense fallback={null}><LiveBackgroundPieces /></Suspense>
        </Canvas>
      </div>

      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(var(--grid-line) 1px,transparent 1px),linear-gradient(90deg,var(--grid-line) 1px,transparent 1px)', backgroundSize: '52px 52px', pointerEvents: 'none', zIndex: 0, opacity: 0.4 }} />

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center w-full px-4 md:px-8 py-12 md:py-24">

        {/* SENIOR FIX: items-start locks the top horizontal line perfectly */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-start w-full max-w-7xl">

          {/* LEFT COLUMN: Split into Modular Bento Cards */}
          <div className="lg:col-span-8 flex flex-col gap-6 md:gap-8 w-full">

            {/* Bento Card 1: Lobby Header */}
            <div className="rounded-[32px] border border-white/10 bg-slate-900/60 backdrop-blur-xl p-6 md:p-10 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-8">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
                <h1 className="text-4xl md:text-[52px] font-black uppercase tracking-tighter leading-none" style={{ fontFamily: 'var(--fd)', textShadow: 'var(--hero-text-shadow)' }}>
                  Game <span style={{ color: 'var(--c)', textShadow: 'var(--king-text-shadow)' }}>Lobby</span>
                </h1>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 bg-black/40 py-1.5 px-3 rounded-full border border-white/10 shadow-inner">
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--c)] animate-pulse" />
                    <span className="text-[11px] tracking-[0.2em] font-bold text-[var(--c)]" style={{ fontFamily: 'var(--fd)' }}>
                      {activeChain?.toUpperCase() || 'NONE'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 bg-black/20 rounded-full border border-white/5">
                    <span className="text-[10px] tracking-[0.15em] uppercase font-bold text-[var(--t2)]" style={{ fontFamily: 'var(--fd)' }}>RATING</span>
                    <span className="text-sm tracking-widest font-black text-white">{rating} <span className="text-[10px] text-[var(--c)] opacity-80">ELO</span></span>
                  </div>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                <GlowButton parallelogram variant="brand" size="lg" onClick={() => handleAction(() => setIsCreateModalOpen(true))} className="w-full md:w-auto">
                  CREATE NEW MATCH
                </GlowButton>
              </motion.div>
            </div>

            {/* Bento Card 2: Open Challenges */}
            <div className="rounded-[32px] border border-white/10 bg-slate-900/60 backdrop-blur-xl p-6 md:p-10 shadow-2xl flex flex-col gap-6">
              <h3 className="text-xs font-bold tracking-[0.25em] text-[var(--t3)] uppercase" style={{ fontFamily: 'var(--fd)' }}>Open Challenges</h3>

              <div className="flex flex-col gap-4">
                {openGames.filter(g => g.chain === activeChain).map((game, idx) => (
                  <motion.div key={game.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}>
                    <div className="rounded-2xl border border-white/5 bg-black/40 hover:bg-black/60 hover:border-white/10 transition-colors p-5 md:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 group">

                      <div className="flex items-center gap-5 w-full sm:w-auto">
                        <div className="w-14 h-14 shrink-0 rounded-xl flex flex-col items-center justify-center font-bold text-cyan-400 bg-cyan-950/30 border border-cyan-500/20">
                          <span className="text-[9px] uppercase tracking-widest opacity-60">ELO</span>
                          <span className="text-base leading-none mt-1">{game.elo}</span>
                        </div>
                        <div className="flex flex-col justify-center">
                          <span className="text-[10px] tracking-[0.2em] text-gray-500 uppercase font-bold mb-1" style={{ fontFamily: 'var(--fd)' }}>CHALLENGER</span>
                          <span className="font-bold tracking-wide text-base text-gray-200 truncate max-w-[150px] sm:max-w-none">{game.creator}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between w-full sm:w-auto sm:gap-8 border-t sm:border-t-0 border-white/5 pt-4 sm:pt-0">
                        <div className="flex flex-col justify-center sm:text-right">
                          <span className="text-[10px] tracking-[0.2em] text-gray-500 uppercase font-bold mb-1" style={{ fontFamily: 'var(--fd)' }}>WAGER</span>
                          <div className="font-black text-cyan-400 text-lg leading-none">{game.wager} <span className="text-[10px] text-cyan-700">CHESS</span></div>
                        </div>
                        <GlowButton size="md" onClick={() => handleJoinGame(game.id, game.wager)} disabled={isPending} className="min-w-[120px]">
                          {isPending ? '...' : 'JOIN MATCH'}
                        </GlowButton>
                      </div>

                    </div>
                  </motion.div>
                ))}

                {openGames.filter(g => g.chain === activeChain).length === 0 && (
                  <div className="py-20 text-center border border-dashed border-white/10 rounded-2xl bg-black/40">
                    <p className="text-sm font-medium text-gray-500 tracking-wider">NO OPEN MATCHES ON {activeChain?.toUpperCase()}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Profile & Faucet (h-auto and p-8 md:p-10 fixes border bleed) */}
          <div className="lg:col-span-4 flex flex-col gap-6 md:gap-8 h-auto w-full">

            <div className="rounded-[32px] border border-white/10 bg-slate-900/60 backdrop-blur-md p-6 md:p-10 flex flex-col shadow-2xl relative overflow-hidden">
              <h3 className="text-sm font-bold tracking-wider text-cyan-400 uppercase mb-8" style={{ fontFamily: 'var(--fd)' }}>Profile Stats</h3>

              {/* SENIOR FIX: Removed hacky translate-y, using strict items-baseline */}
              <div className="flex items-baseline gap-2 mb-10">
                <span className="text-5xl font-black text-white leading-none" style={{ fontFamily: 'var(--fd)' }}>{balance}</span>
                <span className="text-sm text-cyan-500 font-bold tracking-widest">CHESS</span>
              </div>

              <div className="flex justify-between items-center bg-black/40 p-5 rounded-2xl border border-white/5 mb-8">
                <div className="flex flex-col flex-1">
                  <span className="text-[11px] text-gray-500 font-bold tracking-widest uppercase mb-2">Wins</span>
                  <span className="text-2xl font-bold text-white leading-none">14</span>
                </div>
                <div className="w-[1px] h-10 bg-white/10 mx-4 shrink-0" />
                <div className="flex flex-col flex-1 text-right">
                  <span className="text-[11px] text-gray-500 font-bold tracking-widest uppercase mb-2">Losses</span>
                  <span className="text-2xl font-bold text-gray-300 leading-none">8</span>
                </div>
              </div>

              <div className="mt-auto pt-2">
                <GlowButton variant="ghost" fullWidth onClick={() => handleAction(() => console.log("History"))}>
                  VIEW HISTORY
                </GlowButton>
              </div>
            </div>

            <div className="rounded-[32px] border border-white/10 bg-slate-900/60 backdrop-blur-md p-6 md:p-10 flex flex-col shadow-2xl relative overflow-hidden">
              <div className="flex flex-col gap-3 mb-6">
                <h4 className="font-bold text-[15px] tracking-widest text-white uppercase" style={{ fontFamily: 'var(--fd)' }}>Need CHESS?</h4>
                <p className="text-[13px] text-gray-400 leading-relaxed">Top up your wallet with testnet tokens to start playing on {activeChain}.</p>
              </div>
              <div className="mt-auto">
                <GlowButton variant="brand" fullWidth onClick={() => handleAction(() => router.push('#faucet'))}>
                  VISIT FAUCET
                </GlowButton>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isCreateModalOpen && (
          // Modal code remains safe and clean
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCreateModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-md">
              <ClayCard className="p-8 md:p-10">
                <h3 className="text-2xl font-black mb-6 uppercase italic">Create Match</h3>
                <div className="space-y-6 mb-10">
                  <div>
                    <label className="block text-xs font-bold text-[var(--t3)] uppercase tracking-widest mb-3">Wager Amount (CHESS)</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[50, 100, 250, 500, 1000, 2500].map(amt => (
                        <button key={amt} onClick={() => setWager(amt)} className={`py-3 rounded-xl border font-bold transition-all ${wager === amt ? 'bg-[var(--c)] text-black border-[var(--c)] shadow-[0_0_20px_rgba(0,204,255,0.3)]' : 'bg-[var(--b1)] text-[var(--t2)] border-[var(--b2)] hover:border-[var(--t3)]'}`}>
                          {amt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <GlowButton fullWidth variant="brand" onClick={handleCreateGame} disabled={isPending}>{isPending ? 'BROADCASTING...' : 'INITIALIZE GAME'}</GlowButton>
                </div>
              </ClayCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ComingSoonOverlay isOpen={isComingSoonOpen} onClose={() => setIsComingSoonOpen(false)} />
    </main>
  )
}