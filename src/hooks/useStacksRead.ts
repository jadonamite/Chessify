'use client'

import { useCallback } from 'react'
import { 
  fetchCallReadOnlyFunction, 
  uintCV, 
  principalCV,
  cvToJSON
} from '@stacks/transactions'
import { useWallet } from '@/components/wallet-provider'
import { STACKS_CONTRACTS } from '@/config/contracts'

export function useStacksRead() {
  const { stacksAddress } = useWallet()

  const fetchContractData = useCallback(
    async (
      contractAddress: string,
      contractName: string,
      functionName: string,
      functionArgs: any[],
      senderAddress: string,
      parseResponse: (json: any) => any
    ) => {
      try {
        const result = await fetchCallReadOnlyFunction({
          contractAddress,
          contractName,
          functionName,
          functionArgs,
          senderAddress,
        })
        const json = cvToJSON(result)
        return parseResponse(json)
      } catch (err) {
        console.error(`Failed to fetch contract data: ${functionName}`, err)
        return null
      }
    },
    [stacksAddress]
  )

  const getPlayerStats = useCallback(async (address?: string) => {
    const target = address || stacksAddress
    if (!target) return null

    return fetchContractData(
      STACKS_CONTRACTS.game.address,
      STACKS_CONTRACTS.game.name,
      'get-player-stats',
      [principalCV(target)],
      target,
      (json: any) => json.value.value
    )
  }, [stacksAddress])

  const getTokenBalance = useCallback(async (address?: string) => {
    const target = address || stacksAddress
    if (!target) return 0n

    return fetchContractData(
      STACKS_CONTRACTS.token.address,
      STACKS_CONTRACTS.token.name,
      'get-balance',
      [principalCV(target)],
      target,
      (json: any) => BigInt(json.value.value)
    )
  }, [stacksAddress])

  const getGame = useCallback(async (gameId: number) => {
    return fetchContractData(
      STACKS_CONTRACTS.game.address,
      STACKS_CONTRACTS.game.name,
      'get-game',
      [uintCV(gameId)],
      stacksAddress || STACKS_CONTRACTS.game.address,
      (json: any) => {
        const outer = json?.value
        const inner = outer?.value
        if (!inner || inner.type === '(none)' || inner.value === null) return null
        return inner.value ?? inner
      }
    )
  }, [stacksAddress])

  const getTotalGames = useCallback(async () => {
    return fetchContractData(
      STACKS_CONTRACTS.game.address,
      STACKS_CONTRACTS.game.name,
      'get-total-games',
      [],
      stacksAddress || STACKS_CONTRACTS.game.address,
      (json: any) => Number(json.value.value)
    )
  }, [stacksAddress])

  return {
    getPlayerStats,
    getTokenBalance,
    getGame,
    getTotalGames,
  }
}