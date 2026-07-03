'use client'
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic'

const useGameClient = () => {
  const [GameClient, setGameClient] = useState(null);

  useEffect(() => {
    const loadGameClient = async () => {
      const module = await import('@/components/game/GameClient');
      setGameClient(module.default);
    };
    loadGameClient();
  }, []);

  return GameClient;
}

export default function GamePage() {
  const GameClient = useGameClient();
  return GameClient ? <GameClient /> : null;
}