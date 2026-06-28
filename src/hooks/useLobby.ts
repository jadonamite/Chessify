import { useState, useEffect, useCallback } from 'react'
import { usePublicClient } from 'wagmi'
import { useWallet } from '@/components/wallet-provider'
import { useStacksRead } from '@/hooks/useStacksRead'
import { CHESS_GAME_ABI, BASE_CHESS_GAME_ABI } from '@/config/abis'
import { CELO_CONTRACTS, BASE_CONTRACTS, BASE_CHAIN_ID } from '@/config/contracts'

export interface Game {
  id: number
  creator: string
  wager: number
  chain: 'celo' | 'stacks' | 'base'
  elo: number
}

export function useLobby() {
  const { activeChain } = useWallet()
  const { getTotalGames: getStacksTotal, getGame: getStacksGame } = useStacksRead()
  const publicClient = usePublicClient()
  const basePublicClient = usePublicClient({ chainId: BASE_CHAIN_ID })
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
      // gameNonce is the NEXT id to assign; valid IDs are 0..nonce-1
      const start = Number(nonce) - 1
      const end = Math.max(0, start - 9)
      const gameIds = Array.from({ length: start - end + 1 }, (_, i) => start - i)
      const promises = gameIds.map(async (id) => {
        const g = await publicClient.readContract({
          address: CELO_CONTRACTS.game as `0x${string}`,
          abi: CHESS_GAME_ABI,
          functionName: 'getGame',
          args: [BigInt(id)],
        }) as any
        return g && Number(g.status) === 0 ? {
          id,
          creator: g.white,
          wager: Number(g.wager) / 1e6, // Using 6 decimals as per config
          chain: 'celo',
          elo: 1200 // Default for now
        } : null
      })
      const results = await Promise.all(promises)
      return results.filter(Boolean) as Game[]
    } catch (err) {
      console.error('Celo lobby fetch error:', err)
      return []
    }
  }, [publicClient])

  const fetchStacksGames = useCallback(async () => {
    try {
      const total = await getStacksTotal()
      const gameIds = Array.from({ length: 10 }, (_, i) => total - 1 - i)
      const promises = gameIds.map(async (id) => {
        const g = await getStacksGame(id) as any
        return g && Number(g.status.value) === 0 ? {
          id,
          creator: g.white.value,
          wager: Number(g.wager.value) / 1e6,
          chain: 'stacks',
          elo: 1200
        } : null
      })
      const results = await Promise.all(promises)
      return results.filter(Boolean) as Game[]
    } catch (err) {
      console.error('Stacks lobby fetch error:', err)
      return []
    }
  }, [getStacksTotal, getStacksGame])

  const fetchBaseGames = useCallback(async () => {
    if (!basePublicClient) return []
    try {
      const total = await basePublicClient.readContract({
        address: BASE_CONTRACTS.game as `0x${string}`,
        abi: BASE_CHESS_GAME_ABI,
        functionName: 'totalGames',
      }) as bigint
      const gameIds = Array.from({ length: 10 }, (_, i) => Number(total) - 1 - i)
      const promises = gameIds.map(async (id) => {
        const g = await basePublicClient.readContract({
          address: BASE_CONTRACTS.game as `0x${string}`,
          abi: BASE_CHESS_GAME_ABI,
          functionName: 'getGame',
          args: [BigInt(id)],
        }) as any
        return g && Number(g.status) === 0 ? {
          id,
          creator: g.white,
          wager: Number(g.wager) / 1e6,
          chain: 'base',
          elo: 1200
        } : null
      })
      const results = await Promise.all(promises)
      return results.filter(Boolean) as Game[]
    } catch (err) {
      console.error('Base lobby fetch error:', err)
      return []
    }
  }, [basePublicClient])

  const refresh = useCallback(async () => {
    setIsLoading(true)
    const [cGames, sGames, bGames] = await Promise.all([
      fetchCeloGames(),
      fetchStacksGames(),
      fetchBaseGames(),
    ])
    setGames([...cGames, ...sGames, ...bGames])
    setIsLoading(false)
  }, [fetchCeloGames, fetchStacksGames, fetchBaseGames])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 30000) // Poll every 30s
    return () => clearInterval(interval)
  }, [refresh])

  return {
    games: games.filter((g) => g.chain === activeChain),
    isLoading,
    refresh
  }
}
