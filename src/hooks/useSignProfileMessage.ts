'use client'
import { useCallback } from 'react'
import { useSignMessage } from 'wagmi'
import { useWallet } from '@/components/wallet-provider'

export interface SignedMessage {
  signature: string
  publicKey?: string // present for Stacks; the server uses it to derive + match the address
}

const signMessageWithWagmi = async (message: string, signMessageAsync: any) => {
  const signature = await signMessageAsync({ message })
  return { signature }
}

const signMessageWithStacks = async (message: string, userSession: any) => {
  if (!userSession) throw new Error('Stacks session not ready — reconnect your wallet')
  const { openSignatureRequestPopup } = await import('@stacks/connect')
  return new Promise<SignedMessage>((resolve, reject) => {
    openSignatureRequestPopup({
      message,
      userSession,
      appDetails: {
        name: 'Chessify Protocol',
        icon: window.location.origin + '/Piece.svg',
      },
      onFinish: (data: any) => resolve({ signature: data.signature, publicKey: data.publicKey }),
      onCancel: () => reject(new Error('Signature request cancelled')),
    } as any)
  })
}

// Signs a plain message with whichever chain is active.
// EVM → wagmi personal_sign. Stacks → Leather/Xverse signature popup (RSV).
export function useSignProfileMessage() {
  const { activeChain, userSession } = useWallet()
  const { signMessageAsync } = useSignMessage()
  return useCallback(async (message: string): Promise<SignedMessage> => {
    if (activeChain === 'stacks') {
      return signMessageWithStacks(message, userSession)
    } else {
      return signMessageWithWagmi(message, signMessageAsync)
    }
  }, [activeChain, userSession, signMessageAsync])
}