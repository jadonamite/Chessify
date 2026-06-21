'use client'
import { useMemo } from 'react';
import dynamic from 'next/dynamic'

const loadGameClient = () => dynamic(() => import('@/components/game/GameClient'), { ssr: false })

const useGameClient = () => {
  return useMemo(() => loadGameClient(), [])
}

export default function GamePage() {
  const GameClient = useGameClient()
  return <GameClient />
}