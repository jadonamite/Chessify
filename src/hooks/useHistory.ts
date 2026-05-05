'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAccount, usePublicClient } from 'wagmi'
import { useWallet } from '@/components/wallet-provider'
import { CELO_CONTRACTS, STACKS_CONTRACTS, HIRO_API, TOKEN_DECIMALS } from '@/config/contracts'
import { CHESS_GAME_ABI } from '@/config/abis'
import { formatUnits } from 'viem'

export type HistoryItem = {
  id: string
  chain: 'celo' | 'stacks'
  role: 'white' | 'black'
  opponent: string
  wager: string
  status: string
  timestamp: number
}

export function useHistory() {
  const { address: celoAddress } = useAccount()
  const { stacksAddress, activeChain } = useWallet()
  const publicClient = usePublicClient()
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchCeloHistory = useCallback(async () => {
    if (!celoAddress || !publicClient) return []

    try {
      const createdLogs = await publicClient.getLogs({
        address: CELO_CONTRACTS.game as `0x${string}`,
        event_: {
          type: 'event_',
          name: 'GameCreated',
          inputs: [
            { name: 'gameId', type: 'uint256', indexed: true },
            { name: 'white', type: 'address', indexed: true },
            { name: 'wager', type: 'uint256', indexed: false }
          ]
        },
        args: { white: celoAddress },
        fromBlock: 0n
      })

      const joinedLogs = await publicClient.getLogs({
        address: CELO_CONTRACTS.game as `0x${string}`,
        event_: {
          type: 'event_',
          name: 'GameJoined',
          inputs: [
            { name: 'gameId', type: 'uint256', indexed: true },
            { name: 'black', type: 'address', indexed: true }
          ]
        },
        args: { black: celoAddress },
        fromBlock: 0n
      })

      const allCeloItems: HistoryItem[] = []

      for (const log of createdLogs) {
        const gameId = log.args.gameId?.toString() || '0'
        // Fetch current game state to get opponent and status
        const gameData = await publicClient.readContract({
          address: CELO_CONTRACTS.game as `0x${string}`,
          abi: CHESS_GAME_ABI,
          functionName: 'getGame',
          args: [BigInt(gameId)]
        }) as any

        allCeloItems.push({
          id: gameId,
          chain: 'celo',
          role: 'white',
          opponent: gameData.black === '0x0000000000000000000000000000000000000000' ? 'Waiting...' : gameData.black,
          wager: formatUnits(gameData.wager, TOKEN_DECIMALS),
          status: ['Waiting', 'Active', 'Finished', 'Cancelled', 'Draw'][gameData.status],
          timestamp: Number(gameData.createdAt) // Using block number as proxy for now
        })
      }

      for (const log of joinedLogs) {
        const gameId = log.args.gameId?.toString() || '0'
        const gameData = await publicClient.readContract({
          address: CELO_CONTRACTS.game as `0x${string}`,
          abi: CHESS_GAME_ABI,
          functionName: 'getGame',
          args: [BigInt(gameId)]
        }) as any

        allCeloItems.push({
          id: gameId,
          chain: 'celo',
          role: 'black',
          opponent: gameData.white,
          wager: formatUnits(gameData.wager, TOKEN_DECIMALS),
          status: ['Waiting', 'Active', 'Finished', 'Cancelled', 'Draw'][gameData.status],
          timestamp: Number(gameData.createdAt)
        })
      }

      return allCeloItems
    } catch (err) {
      console.error('Celo history fetch error:', err)
      return []
    }
  }, [celoAddress, publicClient])

  const fetchStacksHistory = useCallback(async () => {
    if (!stacksAddress) return []

    try {
      const res = await fetch(`${HIRO_API}/extended/v1/address/${stacksAddress}/transactions?limit=50`)
      const data = await res.json()
      
      const gameContractId = `${STACKS_CONTRACTS.game.address}.${STACKS_CONTRACTS.game.name}`
      
      // Filter for successful contract calls to the game contract
      const gameTxs = data.results.filter((tx: any) => 
        tx.tx_status === 'success' && 
        tx.tx_type === 'contract_call' &&
        tx.contract_call.contract_id === gameContractId
      )

      const allStacksItems: HistoryItem[] = []

      for (const tx of gameTxs) {
        const func = tx.contract_call.function_name
        if (func === 'create-game' || func === 'join-game') {
          // In a real app, we'd fetch the game state from the node for each ID
          // For now, we'll parse what we can from the TX
          allStacksItems.push({
            id: tx.tx_id.slice(0, 8),
            chain: 'stacks',
            role: func === 'create-game' ? 'white' : 'black',
            opponent: 'On-Chain', 
            wager: '...', // Need read-call to get exact wager
            status: 'Recorded',
            timestamp: tx.burn_block_height
          })
        }
      }

      return allStacksItems
    } catch (err) {
      console.error('Stacks history fetch error:', err)
      return []
    }
  }, [stacksAddress])

  const refreshHistory = useCallback(async () => {
    setIsLoading(true)
    const [celoItems, stacksItems] = await Promise.all([
      fetchCeloHistory(),
      fetchStacksHistory()
    ])
    
    // Filter by active chain to avoid cross-chain UI leaks
    const combined = [...celoItems, ...stacksItems]
      .filter(item => item.chain === activeChain)
      .sort((a, b) => b.timestamp - a.timestamp)
      
    setHistory(combined)
    setIsLoading(false)
  }, [fetchCeloHistory, fetchStacksHistory, activeChain])

  useEffect(() => {
    refreshHistory()
  }, [refreshHistory])

  return {
    history,
    isLoading,
    refreshHistory
  }
}
