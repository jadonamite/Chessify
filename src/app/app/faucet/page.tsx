import FaucetContent from '@/components/faucet/FaucetContent'

export const metadata = {
  title: 'Token Faucet | Chessify Protocol',
  description: 'Claim free CHESS tokens daily to fuel your on-chain chess matches.',
}

export default function FaucetPage() {
  return <FaucetContent />
}


// ⟳ echo · src/components/ui/LoadingState.tsx
//             <ambientLight intensity={1.5} />
//             <pointLight position={[10, 10, 10]} intensity={2} color="#00ccff" />
//             <Environment files="/textures/environment/city.hdr" />
//             <group
//               position={isInfinite ? [0, 0, 0] : [(progress / 10) - 5, 0, 0]}