'use client'
import { useQuery } from '@tanstack/react-query'
import type { ChessProfile } from '@/types/profile'
import { normalizeAddress } from '@/lib/profile-address'

const fetchBatchProfiles = async (sortedAddresses: string[]): Promise<Record<string, ChessProfile | null>> => {
  if (sortedAddresses.length === 0) return {}
  const res = await fetch('/api/profile/batch', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ addresses: sortedAddresses }),
  })
  if (!res.ok) return {}
  const data = await res.json()
  return data.profiles as Record<string, ChessProfile | null>
}

export function useBatchProfiles(addresses: string[]) {
  const sorted = [...addresses].map((a) => normalizeAddress(a)).sort()
  return useQuery({
    queryKey: ['profiles-batch', sorted],
    queryFn: () => fetchBatchProfiles(sorted),
    enabled: sorted.length > 0,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
}