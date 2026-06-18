'use client'
import { Suspense, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Canvas } from '@react-three/fiber'
import { Environment } from '@react-three/drei'
import { King, Queen, Pawn } from './ChessModels'
import GlowButton from './GlowButton'
/* ── KEYFRAMES ── */
const KEYFRAMES = ` 
  @keyframes confetti-fall { 
    0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; } 
    100% { transform: translateY(110vh) rotate(720deg); opacity: 0; } 
  } 
  @keyframes coin-glow { 
    0%, 100% { filter: drop-shadow(0 0 15px rgba(0,204,255,0.6)); } 
    50% { filter: drop-shadow(0 0 35px rgba(0,204,255,1)); } 
  } 
`;
/* ── Confetti Particles ── */
function Confetti() {
  const particles = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 2}s`,
    duration: `${2 + Math.random() * 3}s`,
    size: 4 + Math.random() * 6,
    color: ['#00ccff', '#6a0dad', '#35ee66', '#ffb400', '#ff4466'][Math.floor(Math.random() * 5)],
  }));
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {particles.map((p) => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: p.left,
            top: -10,
            width: p.size,
            height: p.size,
            borderRadius: p.size > 7 ? '2px' : '50%',
            background: p.color,
            animation: `confetti-fall ${p.duration} ${p.delay} linear infinite`,
            opacity: 0.8,
          }}
        />
      ))}
    </div>
  );
}
/* ── 3D Scene: Success ── */
function SuccessScene() {
  return (
    <>
      <ambientLight intensity={2} />
      <pointLight position={[10, 10, 10]} intensity={3} color="#00ccff" />
      <pointLight position={[-10, -5, 5]} intensity={2} color="#35ee66" />
      <Environment files="/textures/environment/city.hdr" />
      <Queen
        color="#35ee66"
        emissive="#35ee66"
        emissiveIntensity={0.6}
        position={[0, -0.5, 0]}
        floatSpeed={2}
        floatIntensity={1.5}
        rotationIntensity={0.8}
      />
    </>
  );
}
/* ── 3D Scene: Error ── */
function ErrorScene() {
  return (
    <>
      <ambientLight intensity={1} />
      <pointLight position={[10, 10, 10]} intensity={2} color="#ff4466" />
      <pointLight position={[-10, -5, 5]} intensity={1.5} color="#6a0dad" />
      <Environment preset="night" />
      <Pawn
        color="#ff4466"
        emissive="#ff4466"
        emissiveIntensity={0.6}
        position={[0, -0.6, 0]}
        floatSpeed={1}
        floatIntensity={0.5}
        rotationIntensity={0.2}
      />
    </>
  );
}
/* ── 3D Scene: Cooldown ── */
function CooldownScene() {
  return (
    <>
      <ambientLight intensity={1.2} />
      <pointLight position={[10, 10, 10]} intensity={2} color="#ffb400" />
      <Environment preset="sunset" />
      <King
        color="#ffb400"
        emissive="#ffb400"
        emissiveIntensity={0.4}
        position={[0, -0.5, 0]}
        floatSpeed={0.8}
        floatIntensity={0.4}
        rotationIntensity={0.15}
      />
    </>
  );
}
/* ── Types ── */
export type FaucetResultType = 'success' | 'error' | 'cooldown' | 'timeout' | null;
interface FaucetResultModalProps {
  type: FaucetResultType;
  onClose: () => void;
  txHash?: string;
  amount?: string;
  errorMessage?: string;
  cooldownRemaining?: string;
  chain?: 'celo' | 'stacks' | 'base';
}
/* ── RESULT CONFIGS ── */
const RESULT_CONFIG = {
  success: {
    badge: '✓ CLAIMED',
    badgeColor: '#35ee66',
    title: 'TOKENS',
    titleAccent: 'RECEIVED',
    accentColor: '#35ee66',
    description: 'Your CHESS tokens have been successfully deposited into your wallet.',
    buttonText: 'CONTINUE',
    buttonVariant: 'brand' as const,
    Scene: SuccessScene,
    showConfetti: true,
  },
  error: {
    badge: '✕ FAILED',
    badgeColor: '#ff4466',
    title: 'CLAIM',
    titleAccent: 'FAILED',
    accentColor: '#ff4466',
    description: 'The transaction was rejected by the network. Please check your wallet and try again.',
    buttonText: 'DISMISS',
    buttonVariant: 'ghost' as const,
    Scene: ErrorScene,
    showConfetti: false,
  },
  timeout: {
    badge: '⏱ TIMEOUT',
    badgeColor: '#ffb400',
    title: 'REQUEST',
    titleAccent: 'TIMED OUT',
    accentColor: '#ffb400',
    description: 'The network took too long to respond. Your tokens may still arrive — check your balance shortly.',
    buttonText: 'OK, GOT IT',
    buttonVariant: 'ghost' as const,
    Scene: ErrorScene,
    showConfetti: false,
  },
  cooldown: {
    badge: '⏳ COOLDOWN',
    badgeColor: '#ffb400',
    title: 'FAUCET',
    titleAccent: 'LOCKED',
    accentColor: '#ffb400',
    description: 