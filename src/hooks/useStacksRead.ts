'use client'
import { useCallback } from 'react'
import { fetchCallReadOnlyFunction, uintCV, principalCV, cvToJSON } from '@stacks/transactions'
import { useWallet } from '@/components/wallet-provider'
import { STACKS_CONTRACTS } from '@/config/contracts'

const handleClarityResponse = (response, unwrap = false) => {
  if (!response) return null
  const json = cvToJSON(response)
  if (unwrap) {
    const outer = json?.value
    const inner = outer?.value
    if (!inner || inner.type === '(none)' || inner.value === null) return null
    return inner.value ?? inner
  }
  return json.value.value
}

export function useStacksRead() {
  const { stacksAddress } = useWallet()

  const getPlayerStats = useCallback(async (address?: string) => {
    const target = address || stacksAddress
    if (!target) return null
    try {
      const result = await fetchCallReadOnlyFunction({
        contractAddress: STACKS_CONTRACTS.game.address,
        contractName: STACKS_CONTRACTS.game.name,
        functionName: 'get-player-stats',
        functionArgs: [principalCV(target)],
        senderAddress: target,
      })
      return handleClarityResponse(result)
    } catch (err) {
      console.error('Failed to fetch player stats:', err)
      return null
    }
  }, [stacksAddress])

  const getTokenBalance = useCallback(async (address?: string) => {
    const target = address || stacksAddress
    if (!target) return 0n
    try {
      const result = await fetchCallReadOnlyFunction({
        contractAddress: STACKS_CONTRACTS.token.address,
        contractName: STACKS_CONTRACTS.token.name,
        functionName: 'get-balance',
        functionArgs: [principalCV(target)],
        senderAddress: target,
      })
      return BigInt(handleClarityResponse(result))
    } catch (err) {
      console.error('Failed to fetch token balance:', err)
      return 0n
    }
  }, [stacksAddress])

  const getGame = useCallback(async (gameId: number) => {
    try {
      const result = await fetchCallReadOnlyFunction({
        contractAddress: STACKS_CONTRACTS.game.address,
        contractName: STACKS_CONTRACTS.game.name,
        functionName: 'get-game',
        functionArgs: [uintCV(gameId)],
        senderAddress: stacksAddress || STACKS_CONTRACTS.game.address,
      })
      return handleClarityResponse(result, true)
    } catch (err) {
      console.error('Failed to fetch game data:', err)
      return null
    }
  }, [stacksAddress])

  const getTotalGames = useCallback(async () => {
    try {
      const result = await fetchCallReadOnlyFunction({
        contractAddress: STACKS_CONTRACTS.game.address,
        contractName: STACKS_CONTRACTS.game.name,
        functionName: 'get-total-games',
        functionArgs: [],
        senderAddress: stacksAddress || STACKS_CONTRACTS.game.address,
      })
      return Number(handleClarityResponse(result))
    } catch (err) {
      console.error('Failed to fetch total games:', err)
      return 0
    }
  }, [stacksAddress])

  return {
    getPlayerStats,
    getTokenBalance,
    getGame,
    getTotalGames,
  }
}