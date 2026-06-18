'use client'
import { useCallback } from 'react'
import { useSignMessage } from 'wagmi'
import { useWallet } from '@/components/wallet-provider'

// Per-move signing, chain-aware. A signature cryptographically binds a relayed
// move to the player's key (the server verifies it in the moves route). It is
// strictly additive: the relay already enforces turn order + legality, so an
// unsigned move still plays — signing just upgrades integrity for wallets that
// can sign WITHOUT a per-move popup.
//
// Policy:
// • EVM (celo/base): Privy embedded wallets sign silently → sign every move.
// • Stacks: Leather/Xverse would pop a dialog on every move → do NOT sign;
// rely on the server's turn-order + legality checks instead.
export interface MoveSigner {
  // Returns a 0x signature, or null if this wallet/chain doesn't sign moves.
  sign: ((message: string) => Promise<string | null>) | undefined
  // publicKey to forward to the server (Stacks only; undefined for EVM).
  publicKey: string | undefined
  canSign: boolean
}

export function useMoveSigner(): MoveSigner {
  const { activeChain } = useWallet()
  const { signMessageAsync } = useSignMessage()
  const sign = useCallback(async (message: string): Promise<string | null> => {
    try {
      return await signMessageAsync({ message })
    } catch (err) {
      console.warn('[useMoveSigner] sign failed — relaying unsigned', err)
      return null
    }
  }, [signMessageAsync])

  if (activeChain === 'stacks') {
    return { sign: undefined, publicKey: undefined, canSign: false }
  }

  return { sign, publicKey: undefined, canSign: true }
}