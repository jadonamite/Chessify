'use client'

import { useCallback } from 'react'
import { 
  AnchorMode, 
  PostConditionMode, 
  uintCV,
  FungibleConditionCode,
  makeStandardFungiblePostCondition,
  createAssetInfo
} from '@stacks/transactions'
import { openContractCall } from '@stacks/connect'
import { useWallet } from '@/components/wallet-provider'
import { STACKS_CONTRACTS, TOKEN_DECIMALS } from '@/config/contracts'

export function useStacksChess() {
  const { stacksAddress, isStacksConnected } = useWallet()

  const createGame = useCallback(async (wagerAmount: number) => {
    if (!isStacksConnected || !stacksAddress) return

    const microWager = BigInt(Math.floor(wagerAmount * Math.pow(10, TOKEN_DECIMALS)))

    // Post-condition: User transfers 'microWager' of CHESS token
    const postCondition = makeStandardFungiblePostCondition(
      stacksAddress,
      FungibleConditionCode.Equal,
      microWager,
      createAssetInfo(
        STACKS_CONTRACTS.token.address,
        STACKS_CONTRACTS.token.name,
        'chess-token'
      )
    )

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
      })
    })
  }, [isStacksConnected, stacksAddress])

  const joinGame = useCallback(async (gameId: number, wagerAmount: number) => {
    if (!isStacksConnected || !stacksAddress) return

    const microWager = BigInt(Math.floor(wagerAmount * Math.pow(10, TOKEN_DECIMALS)))

    const postCondition = makeStandardFungiblePostCondition(
      stacksAddress,
      FungibleConditionCode.Equal,
      microWager,
      createAssetInfo(
        STACKS_CONTRACTS.token.address,
        STACKS_CONTRACTS.token.name,
        'chess-token'
      )
    )

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
      })
    })
  }, [isStacksConnected, stacksAddress])

  const submitMove = useCallback(async (gameId: number) => {
    if (!isStacksConnected) return

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
      })
    })
  }, [isStacksConnected])

  const resign = useCallback(async (gameId: number) => {
    if (!isStacksConnected) return

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
      })
    })
  }, [isStacksConnected])

  const reportWin = useCallback(async (gameId: number) => {
    if (!isStacksConnected) return

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
      })
    })
  }, [isStacksConnected])

  return {
    createGame,
    joinGame,
    submitMove,
    resign,
    reportWin,
  }
}
