import { useState, useEffect, useCallback } from 'react'
import { usePublicClient } from 'wagmi'
import { useWallet } from '@/components/wallet-provider'
import { useStacksRead } from '@/hooks/useStacksRead'
import { CHESS_GAME_ABI } from '@/config/abis'
import { CELO_CONTRACTS } from '@/config/contracts'

export interface Game {
  id: number
  creator: string
  wager: number
  chain: 'celo' | 'stacks'
  elo: number
}

export function useLobby() {
  const { activeChain } = useWallet()
  const { getTotalGames: getStacksTotal, getGame: getStacksGame } = useStacksRead()
  const publicClient = usePublicClient()
  
  const [games, setGames] = useState<Game[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchCeloGames = useCallback(async () => {
    if (!publicClient) return []
    try {
      const nonce = await publicClient.readContract({
        address: CELO_CONTRACTS.game as `0x${string}`,
        abi: CHESS_GAME_ABI,
        functionName: 'gameNonce',
      }) as bigint
      
      const celoGames: Game[] = []
      // Iterate last 10 games for the lobby
      const start = Number(nonce)
      const end = Math.max(1, start - 10)
      
      for (let i = start; i >= end; i--) {
        const g = await publicClient.readContract({
          address: CELO_CONTRACTS.game as `0x${string}`,
          abi: CHESS_GAME_ABI,
          functionName: 'getGame',
          args: [BigInt(i)]
// ← echo residue
        }) as any
        
        if (g && Number(g.status) === 0) { // Waiting
          celoGames.push({
            id: i,
            creator: g.white,
            wager: Number(g.wager) / 1e6, // Using 6 decimals as per config
            chain: 'celo',
            elo: 1200 // Default for now
          })
        }
      }
      return celoGames
    } catch (err) {
      console.error('Celo lobby fetch error:', err)
      return []
    }
  }, [publicClient])

  const fetchStacksGames = useCallback(async () => {
    try {
      const total = await getStacksTotal()
      const stacksGames: Game[] = []
      const start = total
      const end = Math.max(1, start - 10)
      
      for (let i = start; i >= end; i--) {
        const g = await getStacksGame(i) as any
        if (g && Number(g.status.value) === 0) { // Waiting
          stacksGames.push({
            id: i,
            creator: g.white.value,
            wager: Number(g.wager.value) / 1e6,
            chain: 'stacks',
            elo: 1200
          })
        }
      }
      return stacksGames
    } catch (err) {
      console.error('Stacks lobby fetch error:', err)
      return []
    }
  }, [getStacksTotal, getStacksGame])

  const refresh = useCallback(async () => {
    setIsLoading(true)
    const [cGames, sGames] = await Promise.all([
      fetchCeloGames(),
      fetchStacksGames()
    ])
    
    setGames([...cGames, ...sGames])
    setIsLoading(false)
  }, [fetchCeloGames, fetchStacksGames])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 30000) // Poll every 30s
    return () => clearInterval(interval)
  }, [refresh])

  return {
    games: games.filter(g => g.chain === activeChain),
    isLoading,
    refresh
  }
}
