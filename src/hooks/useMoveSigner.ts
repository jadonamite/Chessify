'use client'

import { useCallback } from 'react'
import { useSignMessage } from 'wagmi'
import { useSmartWallets } from '@privy-io/react-auth/smart-wallets'
import { useWallet } from '@/components/wallet-provider'

/**
 * Returns a `signMove` that signs the canonical move message with whichever
 * wallet controls the on-chain identity. A signature cryptographically binds a
 * relayed move to the player's key (the server verifies it in the moves route).
 * It is strictly additive: the relay already enforces turn order + legality, so
 * an unsigned move still plays — signing just upgrades integrity for wallets
 * that can sign WITHOUT a per-move popup.
 *
 * EVM tiers:
 *   Tier A (smart) → smart-account signature (EIP-1271, verified server-side)
 *   Tier C (eoa)   → plain EOA signature (Privy embedded → silent)
 *   Tier B (minipay) → null — MiniPay cannot sign messages, so the move is
 *                      authenticated by the relay's participant/turn binding only.
 *
 * Stacks: Leather/Xverse would pop a wallet dialog on every move → do NOT sign;
 * rely on the server's turn-order + legality checks instead.
 */
export function useMoveSigner() {
  const { walletTier, activeChain } = useWallet()
  const { client: smartClient } = useSmartWallets()
  const { signMessageAsync } = useSignMessage()

  const signMove = useCallback(
    async (message: string): Promise<`0x${string}` | null> => {
      if (activeChain === 'stacks') return null
      if (walletTier === 'minipay') return null

      try {
        if (walletTier === 'smart' && smartClient) {
          return await smartClient.signMessage({ message })
        }
        if (walletTier === 'eoa') {
          return await signMessageAsync({ message })
        }
        return null
      } catch (err) {
        console.warn('[useMoveSigner] sign failed, submitting unsigned', err)
        return null
      }
    },
    [activeChain, walletTier, smartClient, signMessageAsync],
  )

  const canSign = activeChain !== 'stacks' && walletTier !== 'minipay'
  return { signMove, canSign }
}