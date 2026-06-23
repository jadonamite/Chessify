'use client'
import { useQuery } from '@tanstack/react-query'
import type { ChessProfile } from '@/types/profile'
import { normalizeAddress } from '@/lib/profile-address'

export function useBatchProfiles(addresses: string[]) {
  const sorted = [...addresses].map((a) => normalizeAddress(a)).sort()
  if (sorted.length === 0) return useQuery({ queryKey: ['profiles-batch', []], queryFn: async () => ({}), enabled: false })

  return useQuery({
    queryKey: ['profiles-batch', sorted],
    queryFn: async () => {
      const res = await fetch('/api/profile/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addresses: sorted }),
      })
      if (!res.ok) return {}
      const data = await res.json()
      return data.profiles as Record<string, ChessProfile | null>
    },
    enabled: true,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
}