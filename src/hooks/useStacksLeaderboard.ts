'use client'
import { useState, useEffect, useCallback } from 'react'
import { useWallet } from '@/components/wallet-provider'
import { useStacksRead } from '@/hooks/useStacksRead'
import type { LeaderboardEntry } from '@/hooks/useLeaderboard'

// Pulls a principal string out of a Clarity-CV JSON field, tolerating both the
// bare `{ value: 'SP…' }` shape and the nested optional `{ value: { value: 'SP…' } }`.
function principalOf(field: any): string | null {
  if (!field) return null
  if (typeof field === 'string') return field
  if (typeof field.value === 'string') return field.value
  if (field.value && typeof field.value.value === 'string') return field.value.value
  return null
}

// Helper function to process game data and calculate leaderboard entries
function processGames(games: any[], getPlayerStats: (address: string) => Promise<any>) {
  const addressSet = new Set<string>()
  for (const g of games) {
    if (!g) continue
    const white = principalOf(g.white)
    const black = principalOf(g.black)
    if (white) addressSet.add(white)
    if (black) addressSet.add(black)
  }
  const addresses = Array.from(addressSet)
  return Promise.all(addresses.map((a) => getPlayerStats(a))).then((statsResults) => {
    const leaderboard: LeaderboardEntry[] = []
    for (let i = 0; i < addresses.length; i++) {
      const s = statsResults[i]
      if (!s) continue
      const gamesPlayed = Number(s['games-played']?.value ?? 0)
      if (gamesPlayed === 0) continue
      leaderboard.push({
        address: addresses[i],
        wins: Number(s.wins?.value ?? 0),
        losses: Number(s.losses?.value ?? 0),
        draws: Number(s.draws?.value ?? 0),
        rating: Number(s.rating?.value ?? 0),
        gamesPlayed,
        rank: 0,
      })
    }
    return leaderboard
  })
}

// Stacks sibling of useLeaderboard: scans every game on chess-game.clar to find
// unique players, reads get-player-stats for each, ranks by ELO.
export function useStacksLeaderboard(enabled = true) {
  const { stacksAddress } = useWallet()
  const { getTotalGames, getGame, getPlayerStats } = useStacksRead()
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchLeaderboard = useCallback(async () => {
    if (!enabled) return
    setIsLoading(true)
    try {
      const total = await getTotalGames()
      if (!total || total === 0) {
        setEntries([])
        return
      }
      // Game IDs are 0-indexed: game-nonce starts at u0, get-total-games returns the NEXT id.
      const ids = Array.from({ length: total }, (_, i) => i)
      const games = await Promise.all(ids.map((id) => getGame(id)))
      const leaderboard = await processGames(games, getPlayerStats)
      leaderboard.sort((a, b) => b.rating - a.rating || b.wins - a.wins)
      leaderboard.forEach((e, i) => {
        e.rank = i + 1
      })
      setEntries(leaderboard)
    } catch (err) {
      console.error('[useStacksLeaderboard] fetch failed:', err)
    } finally {
      setIsLoading(false)
    }
  }, [enabled, getTotalGames, getGame, getPlayerStats])

  useEffect(() => {
    fetchLeaderboard()
  }, [fetchLeaderboard])

  // Stacks addresses are case-sensitive — never lowercase them.
  const myRank = stacksAddress ? (entries.find((e) => e.address === stacksAddress)?.rank ?? null) : null
  return { entries, isLoading, myRank, refresh: fetchLeaderboard }
}