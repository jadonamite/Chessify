import FaucetContent from '@/components/faucet/FaucetContent'
import { useMemo } from 'react'

const getFaucetMetadata = () => ({
  title: 'Token Faucet | Chessify Protocol',
  description: 'Claim free CHESS tokens daily to fuel your on-chain chess matches.',
})

export const useFaucetMetadata = () => {
  return useMemo(() => getFaucetMetadata(), [])
}

export const metadata = useFaucetMetadata()
export default function FaucetPage() {
  return <FaucetContent />
}