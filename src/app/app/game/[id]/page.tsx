'use client'

import dynamic_ from 'next/dynamic_'

const GameClient = dynamic_(
  () => import('@/components/game/GameClient'),
  { ssr: false }
)

export default function GamePage() {
  return <GameClient />
}
