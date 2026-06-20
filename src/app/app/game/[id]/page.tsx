'use client'
import dynamic from 'next/dynamic'

const loadGameClient = () => dynamic(() => import('@/components/game/GameClient'), { ssr: false })

export const useGameClient = () => {
  const GameClient = loadGameClient()
  return GameClient
}

export default function GamePage() {
  const GameClient = useGameClient()
  return <GameClient />
}