'use client'

import { useQuery } from '@tanstack/react-query'
import type { ChessProfile } from '@/types/profile'
import { normalizeAddress } from '@/lib/profile-address'

export function useBatchProfiles(addresses: string[]) {
  const sorted = [...addresses].map((a) => normalizeAddress(a)).sort()
  return useQuery({
    queryKey: ['profiles-batch', sorted],
    queryFn: async (): Promise<Record<string, ChessProfile | null>> => {
      if (sorted.length === 0) return {}
      const res = await fetch('/api/profile/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addresses: sorted }),
      })
      if (!res.ok) return {}
      return res.json().then(data => data.profiles as Record<string, ChessProfile | null>)
    },
    enabled: sorted.length > 0,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
}