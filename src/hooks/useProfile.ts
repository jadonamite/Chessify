'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ChessProfile } from '@/types/profile'
import { isValidProfileAddress, normalizeAddress } from '@/lib/profile-address'

export function profileKey(address: string) {
  return ['profile', normalizeAddress(address ?? '')]
}

const handleFetchError = (res: Response, errorMessage: string) => {
  if (!res.ok) throw new Error(res.status === 404 ? 'Not found' : errorMessage)
}

async function fetchProfile(address: string): Promise<ChessProfile | null> {
  const res = await fetch(`/api/profile/${address}`)
  handleFetchError(res, 'Failed to fetch profile')
  const data = await res.json()
  return data.profile as ChessProfile
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
      const res = await fetch(`/api/profile/check/${username.toLowerCase()}`)
      handleFetchError(res, 'Failed to check username')
      return res.json() as Promise<{ available: boolean; reason?: string }>
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
      const res = await fetch('/api/profile/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      handleFetchError(res, 'Claim failed')
      const data = await res.json()
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
      const res = await fetch(`/api/profile/${address}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rest),
      })
      handleFetchError(res, 'Update failed')
      const data = await res.json()
      return data
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: profileKey(vars.address) })
    },
  })
}