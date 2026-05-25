'use client'

import { CELO_CONTRACTS, TOKEN_DECIMALS } from '@/config/contracts'
import { CHESS_GAME_ABI, CHESS_TOKEN_ABI } from '@/config/abis'
import { decodeEventLog } from 'viem'
import { parseUnits } from 'viem'
import { useState, useCallback } from 'react'
import { useWriteContract, useAccount, usePublicClient } from 'wagmi'

const LOG_PREFIX = '[useCeloChess]'

export function useCeloChess() {
  const { address } = useAccount()
  const { writeContractAsync } = useWriteContract()
  const publicClient = usePublicClient()
  const [isPending, setIsPending] = useState(false)

  // ── createGame ──────────────────────────────────────────────────────────────
  // Returns the on-chain game ID extracted from the GameCreated event.
  const createGame = useCallback(async (wagerAmount: number): Promise<number> => {
    if (!address) throw new Error(`${LOG_PREFIX} createGame: wallet not connected`)
    if (!publicClient) throw new Error(`${LOG_PREFIX} createGame: public client unavailable`)

    setIsPending(true)
    try {
      const amount = parseUnits(wagerAmount.toString(), TOKEN_DECIMALS)

      // Step 1 — approve, wait for confirmation before proceeding
      console.info(`${LOG_PREFIX} createGame: sending approve`, { wager: wagerAmount })
      const approveTxHash = await writeContractAsync({
        address: CELO_CONTRACTS.token as `0x${string}`,
        abi: CHESS_TOKEN_ABI,
        functionName: 'approve',
        args: [CELO_CONTRACTS.game as `0x${string}`, amount],
      })

      const approveReceipt = await publicClient.waitForTransactionReceipt({ hash: approveTxHash })
      if (approveReceipt.status !== 'success') {
        throw new Error(`${LOG_PREFIX} createGame: approve tx reverted (${approveTxHash})`)
      }
      console.info(`${LOG_PREFIX} createGame: approve confirmed`, { hash: approveTxHash })

      // Step 2 — create game
      console.info(`${LOG_PREFIX} createGame: sending createGame`, { wager: wagerAmount })
      const createTxHash = await writeContractAsync({
        address: CELO_CONTRACTS.game as `0x${string}`,
        abi: CHESS_GAME_ABI,
        functionName: 'createGame',
        args: [amount],
      })

      const createReceipt = await publicClient.waitForTransactionReceipt({ hash: createTxHash })
      if (createReceipt.status !== 'success') {
        throw new Error(`${LOG_PREFIX} createGame: createGame tx reverted (${createTxHash})`)
      }

      // Parse GameCreated event to extract game ID
      for (const log of createReceipt.logs) {
        try {
          const decoded = decodeEventLog({ abi: CHESS_GAME_ABI, data: log.data, topics: log.topics })
          if (decoded.eventName === 'GameCreated') {
            const args = decoded.args as unknown as { gameId: bigint }
            const gameId = Number(args.gameId)
            console.info(`${LOG_PREFIX} createGame: success`, { gameId, hash: createTxHash })
            return gameId
          }
        } catch {
          // log belongs to a different contract — skip
        }
      }

      throw new Error(`${LOG_PREFIX} createGame: GameCreated event not found in receipt (${createTxHash})`)
    } catch (err) {
      console.error(`${LOG_PREFIX} createGame failed:`, err)
      throw err
    } finally {
      setIsPending(false)
    }
  }, [address, writeContractAsync, publicClient])

  // ── joinGame ────────────────────────────────────────────────────────────────
  // Approves + joins, waits for both receipts before resolving.
  const joinGame = useCallback(async (gameId: number, wagerAmount: number): Promise<void> => {
    if (!address) throw new Error(`${LOG_PREFIX} joinGame: wallet not connected`)
    if (!publicClient) throw new Error(`${LOG_PREFIX} joinGame: public client unavailable`)

    setIsPending(true)
    try {
      const amount = parseUnits(wagerAmount.toString(), TOKEN_DECIMALS)

      // Step 1 — approve
      console.info(`${LOG_PREFIX} joinGame: sending approve`, { gameId, wager: wagerAmount })
      const approveTxHash = await writeContractAsync({
        address: CELO_CONTRACTS.token as `0x${string}`,
        abi: CHESS_TOKEN_ABI,
        functionName: 'approve',
        args: [CELO_CONTRACTS.game as `0x${string}`, amount],
      })

      const approveReceipt = await publicClient.waitForTransactionReceipt({ hash: approveTxHash })
      if (approveReceipt.status !== 'success') {
        throw new Error(`${LOG_PREFIX} joinGame: approve tx reverted (${approveTxHash})`)
      }
      console.info(`${LOG_PREFIX} joinGame: approve confirmed`, { hash: approveTxHash })

      // Step 2 — join
      console.info(`${LOG_PREFIX} joinGame: sending joinGame`, { gameId })
      const joinTxHash = await writeContractAsync({
        address: CELO_CONTRACTS.game as `0x${string}`,
        abi: CHESS_GAME_ABI,
        functionName: 'joinGame',
        args: [BigInt(gameId)],
      })

      const joinReceipt = await publicClient.waitForTransactionReceipt({ hash: joinTxHash })
      if (joinReceipt.status !== 'success') {
        throw new Error(`${LOG_PREFIX} joinGame: joinGame tx reverted (${joinTxHash})`)
      }
      console.info(`${LOG_PREFIX} joinGame: success`, { gameId, hash: joinTxHash })
    } catch (err) {
      console.error(`${LOG_PREFIX} joinGame failed:`, err)
      throw err
    } finally {
      setIsPending(false)
    }
  }, [address, writeContractAsync, publicClient])

  // ── submitMove ──────────────────────────────────────────────────────────────
  const submitMove = useCallback(async (gameId: number) => {
    if (!publicClient) throw new Error(`${LOG_PREFIX} submitMove: public client unavailable`)
    console.info(`${LOG_PREFIX} submitMove`, { gameId })
    try {
      return await writeContractAsync({
        address: CELO_CONTRACTS.game as `0x${string}`,
        abi: CHESS_GAME_ABI,
        functionName: 'submitMove',
        args: [BigInt(gameId)],
      })
    } catch (err) {
      console.error(`${LOG_PREFIX} submitMove failed:`, err)
      throw err
    }
  }, [writeContractAsync, publicClient])

  // ── resign ──────────────────────────────────────────────────────────────────
  const resign = useCallback(async (gameId: number) => {
    console.info(`${LOG_PREFIX} resign`, { gameId })
    try {
      return await writeContractAsync({
        address: CELO_CONTRACTS.game as `0x${string}`,
        abi: CHESS_GAME_ABI,
        functionName: 'resign',
        args: [BigInt(gameId)],
      })
    } catch (err) {
      console.error(`${LOG_PREFIX} resign failed:`, err)
      throw err
    }
  }, [writeContractAsync])

  // ── reportWin ───────────────────────────────────────────────────────────────
  const reportWin = useCallback(async (gameId: number) => {
    console.info(`${LOG_PREFIX} reportWin`, { gameId })
    try {
      return await writeContractAsync({
        address: CELO_CONTRACTS.game as `0x${string}`,
        abi: CHESS_GAME_ABI,
        functionName: 'reportWin',
        args: [BigInt(gameId)],
      })
    } catch (err) {
      console.error(`${LOG_PREFIX} reportWin failed:`, err)
      throw err
    }
  }, [writeContractAsync])

  return { createGame, joinGame, submitMove, resign, reportWin, isPending }
}
