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

const extractGameInfo = async (
  publicClient: any,
  address: string,
  contractAddress: string,
  abi: any,
  functionName: string,
  args: any[],
  event: string,
  inputs: any[],
  fromBlock: bigint
) => {
  try {
    const logs = await publicClient.getLogs({
      address: contractAddress,
      event: {
        type: 'event',
        name: event,
        inputs,
      },
      args: { [inputs[1].name]: address },
      fromBlock,
    })
    const items: HistoryItem[] = []
    for (const log of logs) {
      const gameId = log.args.gameId?.toString() || '0'
      const gameData = await publicClient.readContract({
        address: contractAddress,
        abi,
        functionName,
        args: [BigInt(gameId)],
      }) as any
      items.push({
        id: gameId,
        chain: 'celo',
        role: event === 'GameCreated' ? 'white' : 'black',
        opponent: gameData.black === ZERO_ADDR ? 'Waiting...' : gameData.black,
        wager: formatUnits(gameData.wager, TOKEN_DECIMALS),
        status: ['Waiting', 'Active', 'Finished', 'Cancelled', 'Draw'][gameData.status],
        timestamp: Number(gameData.createdAt),
      })
    }
    return items
  } catch (err) {
    console.error('Game info extraction error:', err)
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

  const fetchCeloHistory = useCallback(async () => {
    if (!celoAddress || !publicClient) return []
    const createdLogs = await extractGameInfo(
      publicClient,
      celoAddress,
      CELO_CONTRACTS.game as `0x${string}`,
      CHESS_GAME_ABI,
      'getGame',
      [],
      'GameCreated',
      [
        { name: 'gameId', type: 'uint256', indexed: true },
        { name: 'white', type: 'address', indexed: true },
      ],
      0n
    )
    const joinedLogs = await extractGameInfo(
      publicClient,
      celoAddress,
      CELO_CONTRACTS.game as `0x${string}`,
      CHESS_GAME_ABI,
      'getGame',
      [],
      'GameJoined',
      [
        { name: 'gameId', type: 'uint256', indexed: true },
        { name: 'black', type: 'address', indexed: true },
      ],
      0n
    )
    return [...createdLogs, ...joinedLogs]
  }, [celoAddress, publicClient])

  const fetchStacksHistory = useCallback(async () => {
    if (!stacksAddress) return []
    try {
      const res = await fetch(`${HIRO_API}/extended/v1/address/${stacksAddress}/transactions?limit=50`)
      const data = await res.json()
      const gameContractId = `${STACKS_CONTRACTS.game.address}.${STACKS_CONTRACTS.game.name}`
      const gameTxs = data.results.filter((tx: any) => tx.tx_status === 'success' && tx.tx_type === 'contract_call' && tx.contract_call.contract_id === gameContractId)
      const allStacksItems: HistoryItem[] = []
      for (const tx of gameTxs) {
        const func = tx.contract_call.function_name
        if (func === 'create-game' || func === 'join-game') {
          allStacksItems.push({
            id: tx.tx_id.slice(0, 8),
            chain: 'stacks',
            role: func === 'create-game' ? 'white' : 'black',
            opponent: 'On-Chain',
            wager: '...',
            status: 'Recorded',
            timestamp: tx.burn_block_height,
          })
        }
      }
      return allStacksItems
    } catch (err) {
      console.error('Stacks history fetch error:', err)
      return []
    }
  }, [stacksAddress])

  const fetchBaseHistory = useCallback(async () => {
    if (!celoAddress || !basePublicClient) return []
    const STATUS = ['Waiting', 'Active', 'Finished', 'Draw']
    try {
      const createdLogs = await extractGameInfo(
        basePublicClient,
        celoAddress,
        BASE_CONTRACTS.game as `0x${string}`,
        BASE_CHESS_GAME_ABI,
        'getGame',
        [],
        'GameCreated',
        [
          { name: 'gameId', type: 'uint256', indexed: true },
          { name: 'white', type: 'address', indexed: true },
        ],
        0n
      )
      const joinedLogs = await extractGameInfo(
        basePublicClient,
        celoAddress,
        BASE_CONTRACTS.game as `0x${string}`,
        BASE_CHESS_GAME_ABI,
        'getGame',
        [],
        'GameJoined',
        [
          { name: 'gameId', type: 'uint256', indexed: true },
          { name: 'black', type: 'address', indexed: true },
        ],
        0n
      )
      return [...createdLogs, ...joinedLogs]
    } catch (err) {
      console.error('Base history fetch error:', err)
      return []
    }
  }, [celoAddress, basePublicClient])

  const refreshHistory = useCallback(async () => {
    setIsLoading(true)
    const [celoItems, stacksItems, baseItems] = await Promise.all([
      fetchCeloHistory(),
      fetchStacksHistory(),
      fetchBaseHistory(),
    ])
    const combined = [...celoItems, ...stacksItems, ...baseItems]
      .filter(item => item.chain === activeChain)
    setHistory(combined)
    setIsLoading(false)
  }, [activeChain, fetchCeloHistory, fetchStacksHistory, fetchBaseHistory])

  return { history, isLoading, refreshHistory }
}
