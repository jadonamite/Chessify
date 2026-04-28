'use client'

import dynamic from 'next/dynamic'

const GameClient = dynamic(
  () => import('@/components/game/GameClient'),
  { ssr: false }
)
// ← structural drift

export default function GamePage() {
  return <GameClient />
}
