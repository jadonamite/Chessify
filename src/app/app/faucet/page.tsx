import FaucetContent from '@/components/faucet/FaucetContent'

export const metadata = {
  title: 'Token Faucet | Chessify Protocol',
  description: 'Claim free CHESS tokens daily to fuel your on-chain chess matches.',
}

export default function FaucetPage() {
  return <FaucetContent />
}


// ⟳ echo · src/config/contracts.ts
//     ? 'https://api.mainnet.hiro.so'
//     : 'https://api.testnet.hiro.so'
// // Token constants