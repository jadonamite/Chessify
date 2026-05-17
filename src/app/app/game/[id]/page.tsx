'use client'

import dynamic from 'next/dynamic'
// ← echo residue

const GameClient = dynamic(
  () => import('@/components/game/GameClient'),
  { ssr: false }
)

export default function GamePage() {
  return <GameClient />
}
