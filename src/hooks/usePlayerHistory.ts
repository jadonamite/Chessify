'use client'
import { useQuery } from '@tanstack/react-query'
import { usePublicClient } from 'wagmi'
import { CELO_CONTRACTS, CELO_CHAIN_ID, TOKEN_DECIMALS } from '@/config/contracts'
import { CHESS_GAME_ABI } from '@/config/abis'
import { formatUnits, type Abi } from 'viem'

export type PlayerHistoryItem = {
  id: string
  role: 'white' | 'black'
  opponent: string
  wager: string
  status: string
  result: 'win' | 'loss' | 'draw' | 'active' | 'waiting'
}

const STATUS_LABELS = ['Waiting', 'Active', 'Finished', 'Cancelled', 'Draw']
const ZERO = '0x0000000000000000000000000000000000000000'
const MAX_SCAN = 40 // scan last N games to limit RPC calls

const processGameResult = (
  game: any,
  me: string,
  index: number
): PlayerHistoryItem | null => {
  const white = (game.white as string).toLowerCase()
  const black = (game.black as string).toLowerCase()
  if (white !== me && black !== me) return null

  const role: 'white' | 'black' = white === me ? 'white' : 'black'
  const opponent = role === 'white' ? game.black : game.white
  const statusIdx = Number(game.status)
  const status = STATUS_LABELS[statusIdx] ?? 'Unknown'
  let result: PlayerHistoryItem['result'] = 'active'
  if (statusIdx === 0) result = 'waiting'
  else if (statusIdx === 4 || Number(game.result) === 3) result = 'draw'
  else if (statusIdx === 2) {
    if (Number(game.result) === 1) result = role === 'white' ? 'win' : 'loss'
    else if (Number(game.result) === 2) result = role === 'black' ? 'win' : 'loss'
    else result = 'active'
  }

  return {
    id: String(index + 1),
    role,
    opponent: opponent.toLowerCase() === ZERO ? '' : opponent,
    wager: formatUnits(game.wager as bigint, TOKEN_DECIMALS),
    status,
    result,
  }
}

export function usePlayerHistory(playerAddress: string | null | undefined) {
  const publicClient = usePublicClient({ chainId: CELO_CHAIN_ID })
  return useQuery({
    queryKey: ['player-history', playerAddress?.toLowerCase()],
    queryFn: async (): Promise<PlayerHistoryItem[]> => {
      if (!playerAddress || !publicClient) return []
      const me = playerAddress.toLowerCase()
      const gameNonce = await publicClient.readContract({
        address: CELO_CONTRACTS.game as `0x${string}`,
        abi: CHESS_GAME_ABI as Abi,
        functionName: 'gameNonce',
      }) as bigint
      const total = Number(gameNonce)
      if (total === 0) return []
      // Scan last MAX_SCAN games — recent ones most likely to include this player
      const start = Math.max(1, total - MAX_SCAN + 1)
      const ids = Array.from({ length: total - start + 1 }, (_, i) => BigInt(start + i))
      const results = await publicClient.multicall({
        contracts: ids.map((id) => ({
          address: CELO_CONTRACTS.game as `0x${string}`,
          abi: CHESS_GAME_ABI as Abi,
          functionName: 'getGame',
          args: [id],
        })),
        allowFailure: true,
      })
      const items: PlayerHistoryItem[] = results
        .map((r, i) => {
          if (r.status !== 'success') return null
          return processGameResult(r.result as any, me, start + i)
        })
        .filter(Boolean)
      return items.reverse() // most recent first
    },
    enabled: !!playerAddress && !!publicClient,
    staleTime: 2 * 60 * 1000,
    retry: false,
  })
}