'use client'
import { useCallback } from 'react'
import { fetchCallReadOnlyFunction, uintCV, principalCV, cvToJSON } from '@stacks/transactions'
import { useWallet } from '@/components/wallet-provider'
import { STACKS_CONTRACTS } from '@/config/contracts'

const handleFetchCall = async (options: any) => {
  try {
    const result = await fetchCallReadOnlyFunction(options)
    return cvToJSON(result)
  } catch (err) {
    console.error('Failed to fetch data:', err)
    return null
  }
}

const parseResponse = (response: any, parseFn: (value: any) => any) => {
  if (!response) return null
  const value = response.value
  if (!value) return null
  return parseFn(value)
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
    return parseResponse(response, (value) => value.value)
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
    return parseResponse(response, (value) => BigInt(value.value))
  }, [stacksAddress])

  const getGame = useCallback(async (gameId: number) => {
    const response = await handleFetchCall({
      contractAddress: STACKS_CONTRACTS.game.address,
      contractName: STACKS_CONTRACTS.game.name,
      functionName: 'get-game',
      functionArgs: [uintCV(gameId)],
      senderAddress: stacksAddress || STACKS_CONTRACTS.game.address,
    })
    return parseResponse(response, (value) => {
      const outer = value.value
      const inner = outer?.value
      if (!inner || inner.type === '(none)' || inner.value === null) return null
      return inner.value ?? inner
    })
  }, [stacksAddress])

  const getTotalGames = useCallback(async () => {
    const response = await handleFetchCall({
      contractAddress: STACKS_CONTRACTS.game.address,
      contractName: STACKS_CONTRACTS.game.name,
      functionName: 'get-total-games',
      functionArgs: [],
      senderAddress: stacksAddress || STACKS_CONTRACTS.game.address,
    })
    return parseResponse(response, (value) => Number(value.value))
  }, [stacksAddress])

  return {
    getPlayerStats,
    getTokenBalance,
    getGame,
    getTotalGames,
  }
}