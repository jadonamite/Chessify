'use client'

import dynamic from 'next/dynamic'

// Shell to prevent block-chain SDKs from leaking into the server build
const GameClient = dynamic(
  () => import('@/components/game/GameClient'),
  { ssr: false }
)

export default function GamePage() {
  return <GameClient />
}
