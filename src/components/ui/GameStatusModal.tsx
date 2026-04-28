'use client'

import { Suspense, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Canvas } from '@react-three/fiber'
import { Environment } from '@react-three/drei'
import { King, Pawn, Knight } from './ChessModels'
import GlowButton from './GlowButton'

// Re-using same style as FaucetResultModal
const KEYFRAMES = `
@keyframes pulse-glow {
  0%, 100% { filter: drop-shadow(0 0 15px rgba(255, 68, 102, 0.6)); }
  50%      { filter: drop-shadow(0 0 35px rgba(255, 68, 102, 1)); }
}
`

function WarningScene() {
  return (
    <>
      <ambientLight intensity={1} />
      <pointLight position={[10, 10, 10]} intensity={2} color="#ffb400" />
      <Environment preset="sunset" />
      <Pawn color="#ffb400" emissive="#ffb400" emissiveIntensity={0.4} position={[0, -0.6, 0]} floatSpeed={1} floatIntensity={0.5} rotationIntensity={0.2} />
    </>
  )
}

function CheckScene() {
  return (
    <>
      <ambientLight intensity={1.5} />
      <pointLight position={[10, 10, 10]} intensity={3} color="#ff4466" />
      <Environment preset="night" />
      <Knight color="#ff4466" emissive="#ff4466" emissiveIntensity={0.6} position={[0, -0.5, 0]} floatSpeed={1.5} floatIntensity={1} rotationIntensity={0.8} />
    </>
  )
}

function CheckmateScene() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={3} color="#6a0dad" />
      <pointLight position={[-10, -5, 5]} intensity={2} color="#ff4466" />
      <Environment preset="night" />
      <King color="#111111" emissive="#ff4466" emissiveIntensity={0.2} position={[0, -0.5, 0]} floatSpeed={0.2} floatIntensity={0.2} rotationIntensity={0} />
    </>
  )
}

function StalemateScene() {
  return (
    <>
      <ambientLight intensity={1.5} />
      <pointLight position={[10, 10, 10]} intensity={2} color="#00ccff" />
      <Environment files="/textures/environment/city.hdr" />
      <King color="#00ccff" emissive="#00ccff" emissiveIntensity={0.4} position={[0, -0.5, 0]} floatSpeed={0.8} floatIntensity={0.4} rotationIntensity={0.15} />
    </>
  )
}

export type GameStatusType = 'invalid_move' | 'check' | 'checkmate' | 'draw' | null

interface GameStatusModalProps {
  type: GameStatusType
  message?: string
  onClose: () => void
}

const STATUS_CONFIG = {
  invalid_move: {
    badge: '⚠ INVALID',
    badgeColor: '#ffb400',
    title: 'ILLEGAL',
    titleAccent: 'MOVE',
    accentColor: '#ffb400',
    description: 'That maneuver violates protocol directives. Try a different tactical approach.',
    buttonText: 'ACKNOWLEDGE',
    buttonVariant: 'ghost' as const,
    Scene: WarningScene,
  },
  check: {
    badge: '⚔ THREAT DETECTED',
    badgeColor: '#ff4466',
    title: 'KING IN',
    titleAccent: 'CHECK',
    accentColor: '#ff4466',
    description: 'Your King is under direct assault. You must parry or evade!',
    buttonText: 'DEFEND',
    buttonVariant: 'brand' as const,
    Scene: CheckScene,
  },
  checkmate: {
    badge: '☠ CRITICAL FAILURE',
    badgeColor: '#6a0dad',
    title: 'CHECK',
    titleAccent: 'MATE',
    accentColor: '#ff4466',
    description: 'The King has fallen. End of line.',
    buttonText: 'ACCEPT DEFEAT',
    buttonVariant: 'brand' as const,
    Scene: CheckmateScene,
  },
  draw: {
    badge: '🤝 STALEMATE',
    badgeColor: '#00ccff',
    title: 'MATCH',
    titleAccent: 'DRAWN',
    accentColor: '#00ccff',
    description: 'Tactical deadlock achieved. Neither commander can proceed.',
    buttonText: 'FINISH',
    buttonVariant: 'ghost' as const,
    Scene: StalemateScene,
  }
}

export default function GameStatusModal({ type, message, onClose }: GameStatusModalProps) {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null

  const config = type ? STATUS_CONFIG[type] : null

  return (
    <AnimatePresence>
      {type && config && (
        <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           exit={{ opacity: 0 }}
           className="fixed inset-0 z-50 flex items-center justify-center p-4 box-border"
           style={{ background: 'rgba(5, 5, 15, 0.9)', backdropFilter: 'blur(16px)' }}
        >
          <style>{KEYFRAMES}</style>
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'linear-gradient(var(--grid-line) 1px,transparent 1px),linear-gradient(90deg,var(--grid-line) 1px,transparent 1px)',
            backgroundSize: '52px 52px', pointerEvents: 'none',
            WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%,black 20%,transparent 70%)',
            maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%,black 20%,transparent 70%)',
            opacity: 0.3,
          }} />

          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="relative z-10 w-full max-w-sm md:max-w-md"
          >
             <div className="rounded-[32px] border border-white/10 bg-slate-950/70 shadow-[0_0_80px_rgba(255,68,102,0.15)] backdrop-blur-2xl overflow-hidden flex flex-col">
                <div className="w-full h-40 relative flex-shrink-0">
                  <Canvas camera={{ position: [0, 0, 5], fov: 40 }} gl={{ alpha: true }}>
                    <Suspense fallback={null}>
                      <config.Scene />
                    </Suspense>
                  </Canvas>
                  <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-slate-950/70 to-transparent" />
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: \`radial-gradient(circle at 50% 60%, \${config.accentColor}15, transparent 60%)\`,
                      animation: 'pulse-glow 3s ease-in-out infinite',
                    }}
                  />
                </div>

                <div className="px-8 pb-10 flex flex-col items-center text-center gap-4 relative z-10">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="flex items-center gap-2 py-1.5 px-4 rounded-full border shadow-inner"
                    style={{ borderColor: \`\${config.badgeColor}40\`, background: \`\${config.badgeColor}10\` }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: config.badgeColor }} />
                    <span className="text-[10px] tracking-[0.25em] font-bold uppercase" style={{ fontFamily: 'var(--fd)', color: config.badgeColor }}>
                      {config.badge}
                    </span>
                  </motion.div>

                  <h2 className="text-3xl font-black uppercase tracking-tighter text-white" style={{ fontFamily: 'var(--fd)' }}>
                    {config.title}<br/>
                    <span style={{ color: config.accentColor }}>{config.titleAccent}</span>
                  </h2>

                  <p className="text-xs text-gray-400 font-medium tracking-wide">
                    {message || config.description}
                  </p>

                  <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-2" />

                  <GlowButton variant={config.buttonVariant} size="md" onClick={onClose} fullWidth parallelogram>
                    {config.buttonText}
                  </GlowButton>
                </div>
             </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
