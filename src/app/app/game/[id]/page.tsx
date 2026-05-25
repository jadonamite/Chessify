'use client'

import dynamic from 'next/dynamic'

const GameClient = dynamic(
  () => import('@/components/game/GameClient'),
  { ssr: false }
)

/**
 * GamePage
 * @returns {*}
 */
export default function GamePage() {
  return <GameClient />
}
