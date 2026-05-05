import FaucetContent from '@/components/faucet/FaucetContent'

export const metadata = {
  title: 'Token Faucet | Chessify Protocol',
  description: 'Claim free CHESS tokens daily to fuel your on-chain chess matches.',
}

export default function FaucetPage() {
  return <FaucetContent />
}


// ⟳ echo · src/app/not-found.tsx
//       </div>
//       <div className="relative z-10 flex flex-col items-center justify-center flex-1 text-center px-6">
//         <motion.div 
//           initial={{ opacity: 0, y: 20 }}