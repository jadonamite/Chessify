'use client'

import dynamic from 'next/dynamic'

// TODO: add error boundary here
const GameClient = dynamic(
  () => import('@/components/game/GameClient'),
  { ssr: false }
)

export default function GamePage() {
  return <GameClient />
}
