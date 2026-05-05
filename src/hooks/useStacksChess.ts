'use client'

import { useWallet } from '@/components/wallet-provider'
import { useCallback } from 'react'
  AnchorMode, 
  PostConditionMode, 
  uintCV,
  Pc
} from '@stacks/transactions'
import { 
import { STACKS_CONTRACTS, TOKEN_DECIMALS } from '@/config/contracts'

export function useStacksChess() {
  const { stacksAddress, isStacksConnected, userSession } = useWallet()

  const createGame = useCallback(async (wagerAmount: number) => {
    if (!isStacksConnected || !stacksAddress || !userSession) return

    const { openContractCall } = await import('@stacks/connect')
    const microWager = BigInt(Math.floor(wagerAmount * Math.pow(10, TOKEN_DECIMALS)))

    const postCondition = Pc.principal(stacksAddress)
      .willSendEq(microWager)
      .ft(`${STACKS_CONTRACTS.token.address}.${STACKS_CONTRACTS.token.name}`, 'chess-token')

    return new Promise((resolve, reject) => {
      openContractCall({
        contractAddress: STACKS_CONTRACTS.game.address,
        contractName: STACKS_CONTRACTS.game.name,
        functionName: 'create-game',
        functionArgs: [uintCV(microWager)],
        anchorMode: AnchorMode.Any,
        postConditions: [postCondition],
        postConditionMode: PostConditionMode.Deny,
        onFinish: (data) => resolve(data),
        onCancel: () => reject(new Error('Transaction cancelled')),
        userSession
      })
    })
  }, [isStacksConnected, stacksAddress, userSession])

  const joinGame = useCallback(async (gameId: number, wagerAmount: number) => {
    if (!isStacksConnected || !stacksAddress || !userSession) return

    const { openContractCall } = await import('@stacks/connect')
    const microWager = BigInt(Math.floor(wagerAmount * Math.pow(10, TOKEN_DECIMALS)))

    const postCondition = Pc.principal(stacksAddress)
      .willSendEq(microWager)
      .ft(`${STACKS_CONTRACTS.token.address}.${STACKS_CONTRACTS.token.name}`, 'chess-token')

    return new Promise((resolve, reject) => {
      openContractCall({
        contractAddress: STACKS_CONTRACTS.game.address,
        contractName: STACKS_CONTRACTS.game.name,
        functionName: 'join-game',
        functionArgs: [uintCV(gameId)],
        anchorMode: AnchorMode.Any,
        postConditions: [postCondition],
        postConditionMode: PostConditionMode.Deny,
        onFinish: (data) => resolve(data),
        onCancel: () => reject(new Error('Transaction cancelled')),
        userSession
      })
    })
  }, [isStacksConnected, stacksAddress, userSession])

  const submitMove = useCallback(async (gameId: number) => {
    if (!isStacksConnected || !userSession) return
    const { openContractCall } = await import('@stacks/connect')

    return new Promise((resolve, reject) => {
      openContractCall({
        contractAddress: STACKS_CONTRACTS.game.address,
        contractName: STACKS_CONTRACTS.game.name,
        functionName: 'submit-move',
        functionArgs: [uintCV(gameId)],
        anchorMode: AnchorMode.Any,
        postConditionMode: PostConditionMode.Allow,
        onFinish: (data) => resolve(data),
        onCancel: () => reject(new Error('Transaction cancelled')),
        userSession
      })
    })
  }, [isStacksConnected, userSession])

  const resign = useCallback(async (gameId: number) => {
    if (!isStacksConnected || !userSession) return
    const { openContractCall } = await import('@stacks/connect')

    return new Promise((resolve, reject) => {
      openContractCall({
        contractAddress: STACKS_CONTRACTS.game.address,
        contractName: STACKS_CONTRACTS.game.name,
        functionName: 'resign',
        functionArgs: [uintCV(gameId)],
        anchorMode: AnchorMode.Any,
        postConditionMode: PostConditionMode.Allow,
        onFinish: (data) => resolve(data),
        onCancel: () => reject(new Error('Transaction cancelled')),
        userSession
      })
    })
  }, [isStacksConnected, userSession])

  const reportWin = useCallback(async (gameId: number) => {
    if (!isStacksConnected || !userSession) return
    const { openContractCall } = await import('@stacks/connect')

    return new Promise((resolve, reject) => {
      openContractCall({
        contractAddress: STACKS_CONTRACTS.game.address,
        contractName: STACKS_CONTRACTS.game.name,
        functionName: 'report-win',
        functionArgs: [uintCV(gameId)],
        anchorMode: AnchorMode.Any,
        postConditionMode: PostConditionMode.Allow,
        onFinish: (data) => resolve(data),
        onCancel: () => reject(new Error('Transaction cancelled')),
        userSession
      })
    })
  }, [isStacksConnected, userSession])

  return {
    createGame,
    joinGame,
    submitMove,
    resign,
    reportWin,
  }
}
