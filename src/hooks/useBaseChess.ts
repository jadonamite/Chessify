'use client'

import { useWriteContract, useAccount, usePublicClient } from 'wagmi'
import { decodeEventLog, parseUnits } from 'viem'
import { BASE_CHESS_GAME_ABI, CHESS_TOKEN_ABI } from '@/config/abis'
import { BASE_CONTRACTS, TOKEN_DECIMALS, BASE_CHAIN_ID } from '@/config/contracts'
import { useState, useCallback } from 'react'
import { useToastStore } from '@/hooks/useToastStore'

// Base mirror of useCeloChess. Differences vs Celo:
//   • leaner contract → settleDraw (two-step) instead of proposeDraw/acceptDraw,
//     and no submitMove/claimTimeout/cancelGame.
//   • every write passes chainId: BASE_CHAIN_ID so wagmi switches the wallet to
//     Base regardless of which chain it last used.
// Builder-Code (ERC-8021) attribution is applied globally by the Privy
// dataSuffix plugin (providers.tsx) — do NOT re-append here or it double-suffixes.

const LOG_PREFIX = '[useBaseChess]'
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export function useBaseChess() {
  const { address } = useAccount()
  const { writeContractAsync } = useWriteContract()
  const publicClient = usePublicClient({ chainId: BASE_CHAIN_ID })
  const [isPending, setIsPending] = useState(false)
  const showToast = useToastStore((state) => state.showToast)

  // Shared approve→wait→write guard for wagered create/join.
  const ensureApproval = useCallback(async (amount: bigint, wagerAmount: number) => {
    if (!address || !publicClient) throw new Error(`${LOG_PREFIX} wallet/client unavailable`)

    const balance = await publicClient.readContract({
      address: BASE_CONTRACTS.token as `0x${string}`,
      abi: CHESS_TOKEN_ABI,
      functionName: 'balanceOf',
      params: [address as `0x${string}`],
    }) as bigint
    if (balance < amount) {
      showToast(`Insufficient CHESS balance. You need ${wagerAmount} CHESS.`, 'error')
      throw new Error(`${LOG_PREFIX} Insufficient balance`)
    }

    const allowance = await publicClient.readContract({
      address: BASE_CONTRACTS.token as `0x${string}`,
      abi: CHESS_TOKEN_ABI,
      functionName: 'allowance',
      params: [address as `0x${string}`, BASE_CONTRACTS.game as `0x${string}`],
    }) as bigint

    if (allowance < amount) {
      showToast('Please approve the CHESS token spending limit in your wallet...', 'info')
      const approveTxHash = await writeContractAsync({
        chainId: BASE_CHAIN_ID,
        address: BASE_CONTRACTS.token as `0x${string}`,
        abi: CHESS_TOKEN_ABI,
        functionName: 'approve',
        params: [BASE_CONTRACTS.game as `0x${string}`, amount],
      })
      const receipt = await publicClient.waitForTransactionReceipt({ hash: approveTxHash })
      if (receipt.status !== 'success') {
        showToast('Approval transaction reverted.', 'error')
        throw new Error(`${LOG_PREFIX} approve tx reverted (${approveTxHash})`)
      }
      showToast('Spending limit approved!', 'info')
      await sleep(1500) // avoid wallet nonce out-of-sync
    }
  }, [address, publicClient, writeContractAsync, showToast])

  // ── createGame ──────────────────────────────────────────────────────────────
  const createGame = useCallback(async (wagerAmount: number): Promise<number | null> => {
    if (!address) { showToast('Wallet not connected', 'error'); throw new Error(`${LOG_PREFIX} createGame: not connected`) }
    if (!publicClient) { showToast('Blockchain node connection unavailable', 'error'); throw new Error(`${LOG_PREFIX} createGame: no client`) }

    setIsPending(true)
    try {
      const amount = parseUnits(wagerAmount.toString(), TOKEN_DECIMALS)
      if (amount > 0n) await ensureApproval(amount, wagerAmount)

      showToast('Please confirm the match initialization in your wallet...', 'info')
      const createTxHash = await writeContractAsync({
        chainId: BASE_CHAIN_ID,
        address: BASE_CONTRACTS.game as `0x${string}`,
        abi: BASE_CHESS_GAME_ABI,
        functionName: 'createGame',
        params: [amount],
      })
      const receipt = await publicClient.waitForTransactionReceipt({ hash: createTxHash })
      if (receipt.status !== 'success') {
        showToast('Match creation transaction reverted.', 'error')
        throw new Error(`${LOG_PREFIX} createGame tx reverted (${createTxHash})`)
      }

      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({ abi: BASE_CHESS_GAME_ABI, data: log.data, topics: log.topics })
          if (decoded.eventName === 'GameCreated') {
            const params = decoded.params as unknown as { gameId: bigint }
            const gameId = Number(params.gameId)
            showToast('Match initialized successfully!', 'success')
            return gameId
          }
        } catch { /* log from another contract — skip */ }
      }
      throw new Error(`${LOG_PREFIX} createGame: GameCreated event not found (${createTxHash})`)
    } catch (err: any) {
      handleErr(err, showToast)
      throw err
    } finally {
      setIsPending(false)
    }
  }, [address, publicClient, writeContractAsync, ensureApproval, showToast])

  // ── joinGame ────────────────────────────────────────────────────────────────
  const joinGame = useCallback(async (gameId: number, wagerAmount: number): Promise<void> => {
    if (!address) { showToast('Wallet not connected', 'error'); throw new Error(`${LOG_PREFIX} joinGame: not connected`) }
    if (!publicClient) { showToast('Blockchain node connection unavailable', 'error'); throw new Error(`${LOG_PREFIX} joinGame: no client`) }

    setIsPending(true)
    try {
      const amount = parseUnits(wagerAmount.toString(), TOKEN_DECIMALS)
      if (amount > 0n) await ensureApproval(amount, wagerAmount)

      showToast('Please confirm the transaction to join this match...', 'info')
      const joinTxHash = await writeContractAsync({
        chainId: BASE_CHAIN_ID,
        address: BASE_CONTRACTS.game as `0x${string}`,
        abi: BASE_CHESS_GAME_ABI,
        functionName: 'joinGame',
        params: [BigInt(gameId)],
      })
      const receipt = await publicClient.waitForTransactionReceipt({ hash: joinTxHash })
      if (receipt.status !== 'success') {
        showToast('Match joining transaction reverted.', 'error')
        throw new Error(`${LOG_PREFIX} joinGame tx reverted (${joinTxHash})`)
      }
      showToast('Successfully joined the match!', 'success')
    } catch (err: any) {
      handleErr(err, showToast)
      throw err
    } finally {
      setIsPending(false)
    }
  }, [address, publicClient, writeContractAsync, ensureApproval, showToast])

  const write = useCallback(async (functionName: 'resign' | 'reportWin' | 'settleDraw', gameId: number) => {
    console.info(`${LOG_PREFIX} ${functionName}`, { gameId })
    try {
      return await writeContractAsync({
        chainId: BASE_CHAIN_ID,
        address: BASE_CONTRACTS.game as `0x${string}`,
        abi: BASE_CHESS_GAME_ABI,
        functionName,
        params: [BigInt(gameId)],
      })
    } catch (err) {
      console.error(`${LOG_PREFIX} ${functionName} failed:`, err)
      throw err
    }
  }, [writeContractAsync])

  const resign = useCallback((gameId: number) => write('resign', gameId), [write])
  const reportWin = useCallback((gameId: number) => write('reportWin', gameId), [write])
  // Two-step: first call proposes, second (by opponent) settles. Used for both
  // "propose draw" and "accept draw" — the contract tracks which step it is.
  const settleDraw = useCallback((gameId: number) => write('settleDraw', gameId), [write])

  return { createGame, joinGame, resign, reportWin, settleDraw, isPending }
}

function handleErr(err: any, showToast: (m: string, t: any) => void) {
  console.error(`${LOG_PREFIX} tx failed:`, err)
  const msg = err?.message?.toLowerCase() ?? ''
  const userCancelled = msg.includes('rejected') || msg.includes('user denied') || msg.includes('cancelled')
  if (userCancelled) showToast('Transaction cancelled by user.', 'error')
  else if (!msg.includes('insufficient balance')) showToast('Blockchain interaction failed. Please try again.', 'error')
}
