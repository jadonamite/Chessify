'use client'
import { useCallback } from 'react'
import { fetchCallReadOnlyFunction, uintCV, principalCV, cvToJSON } from '@stacks/transactions'
import { useWallet } from '@/components/wallet-provider'
import { STACKS_CONTRACTS } from '@/config/contracts'

const handleFetchCallReadOnlyFunction = async (options: any) => {
  try {
    const result = await fetchCallReadOnlyFunction(options)
    const json = cvToJSON(result)
    return json.value.value
  } catch (err) {
    console.error('Failed to fetch data:', err)
    return null
  }
}

export function useStacksRead() {
  const { stacksAddress } = useWallet()

  const getPlayerStats = useCallback(async (address?: string) => {
    const target = address || stacksAddress
    if (!target) return null
    const result = await handleFetchCallReadOnlyFunction({
      contractAddress: STACKS_CONTRACTS.game.address,
      contractName: STACKS_CONTRACTS.game.name,
      functionName: 'get-player-stats',
      functionArgs: [principalCV(target)],
      senderAddress: target,
    })
    return result
  }, [stacksAddress])

  const getTokenBalance = useCallback(async (address?: string) => {
    const target = address || stacksAddress
    if (!target) return 0n
    const result = await handleFetchCallReadOnlyFunction({
      contractAddress: STACKS_CONTRACTS.token.address,
      contractName: STACKS_CONTRACTS.token.name,
      functionName: 'get-balance',
      functionArgs: [principalCV(target)],
      senderAddress: target,
    })
    return BigInt(result)
  }, [stacksAddress])

  const getGame = useCallback(async (gameId: number) => {
    const result = await handleFetchCallReadOnlyFunction({
      contractAddress: STACKS_CONTRACTS.game.address,
      contractName: STACKS_CONTRACTS.game.name,
      functionName: 'get-game',
      functionArgs: [uintCV(gameId)],
      senderAddress: stacksAddress || STACKS_CONTRACTS.game.address,
    })
    if (!result || result.type === '(none)' || result.value === null) return null
    return result.value ?? result
  }, [stacksAddress])

  const getTotalGames = useCallback(async () => {
    const result = await handleFetchCallReadOnlyFunction({
      contractAddress: STACKS_CONTRACTS.game.address,
      contractName: STACKS_CONTRACTS.game.name,
      functionName: 'get-total-games',
      functionArgs: [],
      senderAddress: stacksAddress || STACKS_CONTRACTS.game.address,
    })
    return Number(result)
  }, [stacksAddress])

  return { getPlayerStats, getTokenBalance, getGame, getTotalGames }
}