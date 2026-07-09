'use client'

import GameClientCelo from './GameClientCelo'
import GameClientMultichain from './GameClientMultichain'
import { useParams } from 'next/navigation'
import { useWallet } from '@/components/wallet-provider'

/**
 * Game-screen dispatcher. Celo runs the redesigned, decomposed, oracle-settled
 * client (GameClientCelo); Base and Stacks keep the proven legacy multi-chain
 * client (GameClientMultichain) until they're migrated onto the same decomposed
 * components. Bot games are chain-agnostic and always use the richer Celo client
 * (VS intro, streaks, local save).
 */
export default function GameClient() {
  const params = useParams()
  const isBotGame = params?.id === 'bot'
  const { activeChain } = useWallet()

  if (isBotGame || activeChain === 'celo') return <GameClientCelo />
  return <GameClientMultichain />
}
