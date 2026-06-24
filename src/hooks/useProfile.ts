'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ChessProfile } from '@/types/profile'
import { isValidProfileAddress, normalizeAddress } from '@/lib/profile-address'

export function profileKey(address: string) {
  return ['profile', normalizeAddress(address ?? '')]
}

const fetchApi = async (url: string, options?: RequestInit) => {
  const res = await fetch(url, options)
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error ?? 'Failed to fetch data')
  }
  return res.json()
}

async function fetchProfile(address: string): Promise<ChessProfile | null> {
  try {
    const data = await fetchApi(`/api/profile/${address}`)
    return data.profile as ChessProfile
  } catch (error) {
    if (error instanceof Error && error.message.includes('404')) {
      return null
    }
    throw error
  }
}

export function useProfile(address: string | null | undefined) {
  return useQuery({
    queryKey: profileKey(address ?? ''),
    queryFn: () => fetchProfile(address!),
    enabled: isValidProfileAddress(address),
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
}

export function useCheckUsername(username: string) {
  return useQuery({
    queryKey: ['profile-check', username.toLowerCase()],
    queryFn: async () => {
      if (username.length < 3) return { available: false, reason: 'Too short' }
      return fetchApi(`/api/profile/check/${username.toLowerCase()}`)
    },
    enabled: username.length >= 3,
    staleTime: 30 * 1000,
    retry: false,
  })
}

export function useClaimProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: { address: string; username: string; displayName: string; bio: string; signature: string; timestamp: string; publicKey?: string }) => {
      const data = await fetchApi('/api/profile/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      return data
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: profileKey(vars.address) })
    },
  })
}

export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: { address: string; username?: string; displayName?: string; bio?: string; signature: string; timestamp: string; publicKey?: string }) => {
      const { address, ...rest } = body
      const data = await fetchApi(`/api/profile/${address}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rest),
      })
      return data
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: profileKey(vars.address) })
    },
  })
}