import FaucetContent from '@/components/faucet/FaucetContent'

const getFaucetMetadata = () => ({
  title: 'Token Faucet | Chessify Protocol',
  description: 'Claim free CHESS tokens daily to fuel your on-chain chess matches.',
})

export const metadata = getFaucetMetadata()
/**
 * FaucetPage
 * @returns {*}
 */
export default function FaucetPage() {
  return <FaucetContent />
}