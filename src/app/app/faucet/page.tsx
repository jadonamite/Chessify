import FaucetContent from '@/components/faucet/FaucetContent'

export const metadata = {
  title: 'Token Faucet | Chessify Protocol',
  description: 'Claim free CHESS tokens daily to fuel your on-chain chess matches.',
}

export default function FaucetPage() {
  return <FaucetContent />
}


// ⟳ echo · src/components/ui/ChessModels.tsx
//     })
//   }, [])
//   const meshRef = useRef<THREE.Group>(null)
//   useFrame((state) => {
//     if (!meshRef.current) return