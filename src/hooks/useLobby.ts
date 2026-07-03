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

const fetchGames = async (
  publicClient: any,
  contractAddress: string,
  abi: any,
  functionName: string,
  getGameFunctionName: string,
  getGameArgs: (id: number) => any[],
  getTotalGamesFunctionName: string,
  getGameStatusKey: string,
  getGameStatusValue: number
) => {
  if (!publicClient) return []
  try {
    const total = await publicClient.readContract({
      address: contractAddress,
      abi,
      functionName: getTotalGamesFunctionName,
    }) as bigint
    const games: Game[] = []
    // totalGames is the NEXT id to assign; valid IDs are 0..total-1
    const start = Number(total) - 1
    const end = Math.max(0, start - 9)

    for (let i = start; i >= end; i--) {
      const g = await publicClient.readContract({
        address: contractAddress,
        abi,
        functionName: getGameFunctionName,
        args: getGameArgs(i),
      }) as any

      if (g && Number(g[getGameStatusKey]) === getGameStatusValue) { // Waiting
        games.push({
          id: i,
          creator: g.white,
          wager: Number(g.wager) / 1e6,
          chain: 'celo',
          elo: 1200
        })
      }
    }
    return games
  } catch (err) {
    console.error('Lobby fetch error:', err)
    return []
  }
}

export function useLobby() {
  const { activeChain } = useWallet()
  const { getTotalGames: getStacksTotal, getGame: getStacksGame } = useStacksRead()
  const publicClient = usePublicClient()
  const basePublicClient = usePublicClient({ chainId: BASE_CHAIN_ID })

  const [games, setGames] = useState<Game[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchCeloGames = useCallback(async () => fetchGames(
    publicClient,
    CELO_CONTRACTS.game as `0x${string}`,
    CHESS_GAME_ABI,
    'getGame',
    (id: number) => [BigInt(id)],
    'gameNonce',
    'status',
    0
  ), [publicClient])

  const fetchStacksGames = useCallback(async () => {
    try {
      const total = await getStacksTotal()
      const games: Game[] = []
      // get-total-games returns game-nonce (next id); valid IDs are 0..total-1
      const start = total - 1
      const end = Math.max(0, start - 9)

      for (let i = start; i >= end; i--) {
        const g = await getStacksGame(i) as any
        if (g && Number(g.status.value) === 0) { // Waiting
          games.push({
            id: i,
            creator: g.white.value,
            wager: Number(g.wager.value) / 1e6,
            chain: 'stacks',
            elo: 1200
          })
        }
      }
      return games
    } catch (err) {
      console.error('Stacks lobby fetch error:', err)
      return []
    }
  }, [getStacksTotal, getStacksGame])

  const fetchBaseGames = useCallback(async () => fetchGames(
    basePublicClient,
    BASE_CONTRACTS.game as `0x${string}`,
    BASE_CHESS_GAME_ABI,
    'getGame',
    (id: number) => [BigInt(id)],
    'totalGames',
    'status',
    0
  ), [basePublicClient])

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
    games: games.filter(g => g.chain === activeChain),
    isLoading,
    refresh
  }
}
