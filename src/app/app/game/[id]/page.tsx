'use client'

import dynamic from 'next/dynamic'

const GameClient = dynamic(
  () => import('@/components/game/GameClient'),
  { ssr: false }
)

export default function GamePage() {
  // FIXME: handle edge case when value is null
  return <GameClient />
}
