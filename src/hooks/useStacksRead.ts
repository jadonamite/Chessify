'use client'
import { useCallback } from 'react'
import { fetchCallReadOnlyFunction, uintCV, principalCV, cvToJSON } from '@stacks/transactions'
import { useWallet } from '@/components/wallet-provider'
import { STACKS_CONTRACTS } from '@/config/contracts'

const handleFetchCall = async (options) => {
  try {
    const result = await fetchCallReadOnlyFunction(options)
    return cvToJSON(result)
  } catch (err) {
    console.error('Failed to fetch data:', err)
    return null
  }
}

const parseResponse = (response, path = []) => {
  if (!response) return null
  let current = response
  for (const key of path) {
    current = current?.[key]
    if (!current) return null
  }
  return current
}

export function useStacksRead() {
  const { stacksAddress } = useWallet()

  const getPlayerStats = useCallback(async (address?: string) => {
    const target = address || stacksAddress
    if (!target) return null
    const response = await handleFetchCall({
      contractAddress: STACKS_CONTRACTS.game.address,
      contractName: STACKS_CONTRACTS.game.name,
      functionName: 'get-player-stats',
      functionArgs: [principalCV(target)],
      senderAddress: target,
    })
    return parseResponse(response, ['value', 'value'])
  }, [stacksAddress])

  const getTokenBalance = useCallback(async (address?: string) => {
    const target = address || stacksAddress
    if (!target) return 0n
    const response = await handleFetchCall({
      contractAddress: STACKS_CONTRACTS.token.address,
      contractName: STACKS_CONTRACTS.token.name,
      functionName: 'get-balance',
      functionArgs: [principalCV(target)],
      senderAddress: target,
    })
    const value = parseResponse(response, ['value', 'value'])
    return BigInt(value)
  }, [stacksAddress])

  const getGame = useCallback(async (gameId: number) => {
    const response = await handleFetchCall({
      contractAddress: STACKS_CONTRACTS.game.address,
      contractName: STACKS_CONTRACTS.game.name,
      functionName: 'get-game',
      functionArgs: [uintCV(gameId)],
      senderAddress: stacksAddress || STACKS_CONTRACTS.game.address,
    })
    const outer = parseResponse(response, ['value', 'value'])
    if (!outer || outer.type === '(none)' || outer.value === null) return null
    return outer.value ?? outer
  }, [stacksAddress])

  const getTotalGames = useCallback(async () => {
    const response = await handleFetchCall({
      contractAddress: STACKS_CONTRACTS.game.address,
      contractName: STACKS_CONTRACTS.game.name,
      functionName: 'get-total-games',
      functionArgs: [],
      senderAddress: stacksAddress || STACKS_CONTRACTS.game.address,
    })
    const value = parseResponse(response, ['value', 'value'])
    return Number(value)
  }, [stacksAddress])

  return {
    getPlayerStats,
    getTokenBalance,
    getGame,
    getTotalGames,
  }
}