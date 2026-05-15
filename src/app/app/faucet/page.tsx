import FaucetContent from '@/components/faucet/FaucetContent'

export const metadata = {
  title: 'Token Faucet | Chessify Protocol',
  description: 'Claim free CHESS tokens daily to fuel your on-chain chess matches.',
}

export default function FaucetPage() {
  return <FaucetContent />
}


// ⟳ echo · src/components/ui/ChessModels.tsx
// import { Canvas } from '@react-three/fiber'
// import { Environment } from '@react-three/drei'
// export function PieceView({ type, color, className = "w-12 h-12" }: { type: 'king' | 'queen' | 'rook' | 'pawn' | 'bishop' | 'knight', color?: string, className?: string }) {
//   return (
//     <div className={className}>