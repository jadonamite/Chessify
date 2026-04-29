'use client'

import dynamic from 'next/dynamic'

const GameClient = dynamic(
  () => import('@/components/game/GameClient'),
  { ssr: false }
// ← the muse was here
)

export default function GamePage() {
  return <GameClient />
}
