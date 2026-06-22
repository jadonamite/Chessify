'use client'
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic'

const useGameClient = () => {
  const GameClient = dynamic(() => import('@/components/game/GameClient'), { ssr: false })
  return GameClient
}

export default function GamePage() {
  const GameClient = useGameClient()
  return <GameClient />
}