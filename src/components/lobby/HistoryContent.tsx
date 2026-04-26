'use client'

import React, { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Float, Environment, Text, MeshDistortMaterial } from '@react-three/drei'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { GlowButton } from '@/components/ui/GlowButton'
import { useHistory, HistoryItem } from '@/hooks/useHistory'
import { useWallet } from '@/components/wallet-provider'

function KingPiece() {
  return (
    <Float speed={1.5} rotationIntensity={0.5} floatIntensity={0.5}>
      <mesh scale={1.8} rotation={[0, Math.PI / 4, 0]}>
        <octahedronGeometry args={[1, 0]} />
        <MeshDistortMaterial
          color="#00ccff"
          speed={2}
          distort={0.4}
          radius={1}
          emissive="#00ccff"
          emissiveIntensity={0.5}
        />
      </mesh>
    </Float>
  )
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={1.5} color="#00ccff" />
      <pointLight position={[-10, 5, -10]} intensity={1} color="#6a0dad" />
      <Environment preset="city" />
      <KingPiece />
    </>
  )
}

export function HistoryContent() {
  const router = useRouter()
  const { history, isLoading } = useHistory()
  const { activeChain } = useWallet()

  return (
    <main className="relative min-h-screen w-full bg-[#06060f] text-[#eeeeff] overflow-x-hidden flex flex-col font-body">
      {/* ── BACKGROUND ── */}
      <div className="fixed inset-0 z-0 h-screen w-full pointer-events-none">
        <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
          <Suspense fallback={null}>
            <Scene />
          </Suspense>
        </Canvas>
      </div>

      {/* ── GRID OVERLAY ── */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(var(--grid-line) 1px,transparent 1px),linear-gradient(90deg,var(--grid-line) 1px,transparent 1px)', backgroundSize: '52px 52px', pointerEvents: 'none', zIndex: 0, opacity: 0.4 }} />

      <div className="relative z-10 flex-1 flex flex-col items-center w-full max-w-full box-border px-4 md:px-8 py-12 md:py-24">
        <div className="w-full max-w-4xl mx-auto flex flex-col gap-8">
          
          {/* Header Row */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <GlowButton variant="ghost" size="sm" onClick={() => router.push('/app/lobby')}>
                ← BACK TO LOBBY
              </GlowButton>
            </motion.div>
            
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center md:text-right">
              <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter" style={{ fontFamily: 'var(--fd)', textShadow: 'var(--hero-text-shadow)' }}>
                Game <span style={{ color: 'var(--c)', textShadow: 'var(--king-text-shadow)' }}>History</span>
              </h1>
              <p className="text-[11px] font-bold tracking-[0.3em] text-[var(--t3)] uppercase mt-2">Verified On-Chain Architecture</p>
            </motion.div>
          </div>

          {/* History List */}
          <div className="rounded-[32px] border border-white/10 bg-slate-900/60 backdrop-blur-xl shadow-2xl overflow-hidden">
            <div className="p-1 md:p-2">
              <div className="flex flex-col">
                {isLoading ? (
                  <div className="py-32 flex flex-col items-center justify-center gap-4">
                    <div className="w-12 h-12 border-4 border-[var(--c)] border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-bold tracking-[0.2em] text-[var(--c)]">SCANNING BLOCKCHAIN...</span>
                  </div>
                ) : history.length === 0 ? (
                  <div className="py-32 text-center">
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">No matches found on-chain</p>
                    <p className="text-[10px] text-gray-600 mt-2">Deploy your first challenge to see it here</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {history.map((item, idx) => (
                      <motion.div 
                        key={item.id + item.timestamp}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="p-6 md:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 hover:bg-white/[0.02] transition-colors"
                      >
                        <div className="flex items-center gap-6 w-full sm:w-auto">
                          <div className={`w-12 h-12 shrink-0 rounded-xl flex items-center justify-center font-bold border ${item.chain === 'celo' ? 'text-green-400 bg-green-950/20 border-green-500/20' : 'text-orange-400 bg-orange-950/20 border-orange-500/20'}`}>
                            {item.chain === 'celo' ? 'C' : 'S'}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-white/10 text-white/50">
                                {item.role}
                              </span>
                              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest truncate max-w-[150px]">
                                vs {item.opponent.slice(0, 8)}...
                              </span>
                            </div>
                            <span className="font-black text-xl text-white tracking-tight">
                              MATCH #{item.id}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between w-full sm:w-auto sm:gap-12 shrink-0">
                          <div className="flex flex-col sm:text-right">
                            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">Wager</span>
                            <span className="text-lg font-black text-cyan-400">
                              {item.wager} <span className="text-[10px] opacity-60">CHESS</span>
                            </span>
                          </div>
                          
                          <div className="flex flex-col text-right">
                            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">Status</span>
                            <div className="flex items-center gap-2 justify-end">
                              <div className={`w-1.5 h-1.5 rounded-full ${item.status === 'Active' ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
                              <span className={`text-sm font-black uppercase italic ${item.status === 'Active' ? 'text-green-400' : 'text-gray-300'}`}>
                                {item.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
