'use client'

import dynamic from 'next/dynamic'

// Dynamically import the Game to avoid SSR issues with wallet SDKs
const GameContent = dynamic(
  () => import('@/components/game/GameContent'),
  { ssr: false }
)

export default function GamePage() {
  return <GameContent />
}
