'use client'
import { useState, useEffect, useCallback } from 'react'
import { useAccount, usePublicClient } from 'wagmi'
import { useWallet } from '@/components/wallet-provider'
import { CELO_CONTRACTS, BASE_CONTRACTS, BASE_CHAIN_ID, STACKS_CONTRACTS, HIRO_API, TOKEN_DECIMALS } from '@/config/contracts'
import { CHESS_GAME_ABI, BASE_CHESS_GAME_ABI } from '@/config/abis'
import { formatUnits } from 'viem'

export type HistoryItem = {
  id: string
  chain: 'celo' | 'stacks' | 'base'
  role: 'white' | 'black'
  opponent: string
  wager: string
  status: string
  timestamp: number
}

const ZERO_ADDR = '0x0000000000000000000000000000000000000000'

const fetchGameHistory = async (
  publicClient: any,
  address: string,
  contractAddress: string,
  abi: any,
  chain: 'celo' | 'base',
  activeChain: 'celo' | 'stacks' | 'base'
) => {
  if (!address || !publicClient) return []
  try {
    const createdLogs = await publicClient.getLogs({
      address: contractAddress,
      event: {
        type: 'event',
        name: 'GameCreated',
        inputs: [
          { name: 'gameId', type: 'uint256', indexed: true },
          { name: 'white', type: 'address', indexed: true },
          { name: 'wager', type: 'uint256', indexed: false }
        ]
      },
      args: { white: address },
      fromBlock: 0n
    })
    const joinedLogs = await publicClient.getLogs({
      address: contractAddress,
      event: {
        type: 'event',
        name: 'GameJoined',
        inputs: [
          { name: 'gameId', type: 'uint256', indexed: true },
          { name: 'black', type: 'address', indexed: true }
        ]
      },
      args: { black: address },
      fromBlock: 0n
    })
    const items: HistoryItem[] = []
    for (const log of createdLogs) {
      const gameId = log.args.gameId?.toString() || '0'
      const gameData = await publicClient.readContract({
        address: contractAddress,
        abi,
        functionName: 'getGame',
        args: [BigInt(gameId)]
      }) as any
      items.push({
        id: gameId,
        chain,
        role: 'white',
        opponent: gameData.black === ZERO_ADDR ? 'Waiting...' : gameData.black,
        wager: formatUnits(gameData.wager, TOKEN_DECIMALS),
        status: ['Waiting', 'Active', 'Finished', 'Cancelled', 'Draw'][gameData.status],
        timestamp: Number(gameData.createdAt)
      })
    }
    for (const log of joinedLogs) {
      const gameId = log.args.gameId?.toString() || '0'
      const gameData = await publicClient.readContract({
        address: contractAddress,
        abi,
        functionName: 'getGame',
        args: [BigInt(gameId)]
      }) as any
      items.push({
        id: gameId,
        chain,
        role: 'black',
        opponent: gameData.white,
        wager: formatUnits(gameData.wager, TOKEN_DECIMALS),
        status: ['Waiting', 'Active', 'Finished', 'Cancelled', 'Draw'][gameData.status],
        timestamp: Number(gameData.createdAt)
      })
    }
    return items.filter(item => item.chain === activeChain)
  } catch (err) {
    console.error('Game history fetch error:', err)
    return []
  }
}

export function useHistory() {
  const { address: celoAddress } = useAccount()
  const { stacksAddress, activeChain } = useWallet()
  const publicClient = usePublicClient()
  const basePublicClient = usePublicClient({ chainId: BASE_CHAIN_ID })
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchCeloHistory = useCallback(async () => fetchGameHistory(
    publicClient,
    celoAddress,
    CELO_CONTRACTS.game,
    CHESS_GAME_ABI,
    'celo',
    activeChain
  ), [celoAddress, publicClient, activeChain])

  const fetchBaseHistory = useCallback(async () => fetchGameHistory(
    basePublicClient,
    celoAddress,
    BASE_CONTRACTS.game,
    BASE_CHESS_GAME_ABI,
    'base',
    activeChain
  ), [celoAddress, basePublicClient, activeChain])

  const fetchStacksHistory = useCallback(async () => {
    if (!stacksAddress) return []
    try {
      const res = await fetch(`${HIRO_API}/extended/v1/address/${stacksAddress}/transactions?limit=50`)
      const data = await res.json()
      const gameContractId = `${STACKS_CONTRACTS.game.address}.${STACKS_CONTRACTS.game.name}`
      const gameTxs = data.results.filter((tx: any) => tx.tx_status === 'success' && tx.tx_type === 'contract_call' && tx.contract_call.contract_id === gameContractId)
      const items: HistoryItem[] = []
      for (const tx of gameTxs) {
        const func = tx.contract_call.function_name
        if (func === 'create-game' || func === 'join-game') {
          items.push({
            id: tx.tx_id.slice(0, 8),
            chain: 'stacks',
            role: func === 'create-game' ? 'white' : 'black',
            opponent: 'On-Chain',
            wager: '...',
            status: 'Recorded',
            timestamp: tx.burn_block_height
          })
        }
      }
      return items.filter(item => item.chain === activeChain)
    } catch (err) {
      console.error('Stacks history fetch error:', err)
      return []
    }
  }, [stacksAddress, activeChain])

  const refreshHistory = useCallback(async () => {
    setIsLoading(true)
    const [celoItems, stacksItems, baseItems] = await Promise.all([
      fetchCeloHistory(),
      fetchStacksHistory(),
      fetchBaseHistory()
    ])
    setHistory([...celoItems, ...stacksItems, ...baseItems])
  }, [fetchCeloHistory, fetchStacksHistory, fetchBaseHistory])

  return { history, isLoading, refreshHistory }
}
