import FaucetContent from '@/components/faucet/FaucetContent'

export const metadata = {
  title: 'Token Faucet | Chessify Protocol',
  description: 'Claim free CHESS tokens daily to fuel your on-chain chess matches.',
}

export default function FaucetPage() {
  return <FaucetContent />
}


// ⟳ echo · package.json
//     "@jadonamite/plugins": "^1.0.0",
//     "@jadonamite/stacks-core": "^1.0.4",
//     "@radix-ui/react-dialog": "^1.1.15",
//     "@radix-ui/react-dropdown-menu": "^2.1.16",