'use client'

import dynamic from 'next/dynamic'

const GameClient = dynamic(
  () => import('@/components/game/GameClient'),
  { ssr: false }
)

export default function GamePage() {
  return <GameClient />
}


// ⟳ echo · src/hooks/useCeloChess.ts
//   const joinGame = useCallback(async (gameId: number, wagerAmount: number) => {
//     if (!address) return