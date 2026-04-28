'use client'

import { CELO_CONTRACTS, TOKEN_DECIMALS } from '@/config/contracts'
import { parseUnits } from 'viem'
import { CHESS_GAME_ABI, CHESS_TOKEN_ABI } from '@/config/abis'
import { useWriteContract, useAccount } from 'wagmi'
import { useState, useCallback } from 'react'

export function useCeloChess() {
  const { address } = useAccount()
  const { writeContractAsync } = useWriteContract()
  const [isPending, setIsPending] = useState(false)

  const createGame = useCallback(async (wagerAmount: number) => {
    if (!address) return
    setIsPending(true)
    try {
      const amount = parseUnits(wagerAmount.toString(), TOKEN_DECIMALS)
      
      // 1. Approve
      const approveTx = await writeContractAsync({
        address: CELO_CONTRACTS.token as `0x${string}`,
        abi: CHESS_TOKEN_ABI,
        functionName: 'approve',
        args: [CELO_CONTRACTS.game as `0x${string}`, amount],
      })
      console.log('Approval tx:', approveTx)

      // 2. Create Game
      const createTx = await writeContractAsync({
        address: CELO_CONTRACTS.game as `0x${string}`,
        abi: CHESS_GAME_ABI,
        functionName: 'createGame',
        args: [amount],
      })
      return createTx
    } finally {
      setIsPending(false)
    }
  }, [address, writeContractAsync])

  const joinGame = useCallback(async (gameId: number, wagerAmount: number) => {
    if (!address) return
    setIsPending(true)
    try {
      const amount = parseUnits(wagerAmount.toString(), TOKEN_DECIMALS)
      
      // 1. Approve
      await writeContractAsync({
        address: CELO_CONTRACTS.token as `0x${string}`,
        abi: CHESS_TOKEN_ABI,
        functionName: 'approve',
        args: [CELO_CONTRACTS.game as `0x${string}`, amount],
      })

      // 2. Join
      const joinTx = await writeContractAsync({
        address: CELO_CONTRACTS.game as `0x${string}`,
        abi: CHESS_GAME_ABI,
        functionName: 'joinGame',
        args: [BigInt(gameId)],
      })
      return joinTx
    } finally {
      setIsPending(false)
    }
  }, [address, writeContractAsync])

  const submitMove = useCallback(async (gameId: number) => {
    return writeContractAsync({
      address: CELO_CONTRACTS.game as `0x${string}`,
      abi: CHESS_GAME_ABI,
      functionName: 'submitMove',
      args: [BigInt(gameId)],
    })
  }, [writeContractAsync])

  const resign = useCallback(async (gameId: number) => {
    return writeContractAsync({
      address: CELO_CONTRACTS.game as `0x${string}`,
      abi: CHESS_GAME_ABI,
      functionName: 'resign',
      args: [BigInt(gameId)],
    })
  }, [writeContractAsync])

  const reportWin = useCallback(async (gameId: number) => {
    return writeContractAsync({
      address: CELO_CONTRACTS.game as `0x${string}`,
      abi: CHESS_GAME_ABI,
      functionName: 'reportWin',
      args: [BigInt(gameId)],
    })
  }, [writeContractAsync])

  return {
    createGame,
    joinGame,
    submitMove,
    resign,
    reportWin,
    isPending
  }
}
