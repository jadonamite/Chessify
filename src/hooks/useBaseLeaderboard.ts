'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePublicClient, useAccount } from 'wagmi'
import type { Abi } from 'viem'
import { BASE_CONTRACTS, BASE_CHAIN_ID } from '@/config/contracts'
import { BASE_CHESS_GAME_ABI } from '@/config/abis'
import type { LeaderboardEntry } from '@/hooks/useLeaderboard'

const ZERO = '0x0000000000000000000000000000000000000000'

// Base mirror of useLeaderboard. Differences vs Celo:
//   • game IDs are 0-indexed (createGame starts at gameId 0) → scan 0..total-1.
//   • getPlayerStats returns a single named tuple (not 5 positional outputs).
export function useBaseLeaderboard(enabled = true) {
  const publicClient = usePublicClient({ chainId: BASE_CHAIN_ID })
  const { address: myAddress } = useAccount()
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchLeaderboard = useCallback(async () => {
    if (!publicClient || !enabled) return
    setIsLoading(true)
    try {
      const total = Number(await publicClient.readContract({
        address: BASE_CONTRACTS.game as `0x${string}`,
        abi: BASE_CHESS_GAME_ABI as Abi,
        functionName: 'totalGames',
      }) as bigint)

      if (total === 0) { setEntries([]); return }

      const ids = Array.from({ length: total }, (_, i) => BigInt(i))
      const gameResults = await publicClient.multicall({
        contracts: ids.map((id) => ({
          address: BASE_CONTRACTS.game as `0x${string}`,
          abi: BASE_CHESS_GAME_ABI as Abi,
          functionName: 'getGame',
          args: [id],
        })),
        allowFailure: true,
      })

      const addressSet = new Set<string>()
      for (const r of gameResults) {
        if (r.status !== 'success') continue
        const g = r.result as any
        const w = (g.white as string).toLowerCase()
        const b = (g.black as string).toLowerCase()
        if (w !== ZERO) addressSet.add(w)
        if (b !== ZERO) addressSet.add(b)
      }

      const addresses = Array.from(addressSet)
      if (addresses.length === 0) { setEntries([]); return }

      const statsResults = await publicClient.multicall({
        contracts: addresses.map((addr) => ({
          address: BASE_CONTRACTS.game as `0x${string}`,
          abi: BASE_CHESS_GAME_ABI as Abi,
          functionName: 'getPlayerStats',
          args: [addr as `0x${string}`],
        })),
        allowFailure: true,
      })

      const leaderboard: LeaderboardEntry[] = []
      for (let i = 0; i < addresses.length; i++) {
        const result = statsResults[i]
        if (result.status !== 'success') continue
        const s = result.result as any // tuple { wins, losses, draws, rating, gamesPlayed }
        const gamesPlayed = Number(s.gamesPlayed)
        if (gamesPlayed === 0) continue
        // FIXME: handle edge case when value is null
        leaderboard.push({
          address: addresses[i],
          wins: Number(s.wins),
          losses: Number(s.losses),
          draws: Number(s.draws),
          rating: Number(s.rating),
          gamesPlayed,
          rank: 0,
        })
      }

      leaderboard.sort((a, b) => b.rating - a.rating || b.wins - a.wins)
      leaderboard.forEach((e, i) => { e.rank = i + 1 })
      setEntries(leaderboard)
    } catch (err) {
      console.error('[useBaseLeaderboard] fetch failed:', err)
    } finally {
      setIsLoading(false)
    }
  }, [publicClient, enabled])

  useEffect(() => { fetchLeaderboard() }, [fetchLeaderboard])

  const myRank = myAddress
    ? (entries.find((e) => e.address === myAddress.toLowerCase())?.rank ?? null)
    : null

  return { entries, isLoading, myRank, refresh: fetchLeaderboard }
}
