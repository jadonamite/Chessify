import FaucetContent from '@/components/faucet/FaucetContent'

export const metadata = {
  title: 'Token Faucet | Chessify Protocol',
  description: 'Claim free CHESS tokens daily to fuel your on-chain chess matches.',
}

export default function FaucetPage() {
  return <FaucetContent />
}


// ⟳ echo · src/components/lobby/LobbyContent.tsx
//                               <span className="text-base leading-none mt-1">{game.elo}</span>
//                             </div>
//                             <div className="flex flex-col justify-center min-w-0">
//                               <span
//                                 className="text-[10px] tracking-[0.2em] text-gray-500 uppercase font-bold mb-1"