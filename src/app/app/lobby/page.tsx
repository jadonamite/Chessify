'use client'

import dynamic from 'next/dynamic'

// Shell to prevent block-chain SDKs from leaking into the server build
const LobbyContent = dynamic(
  () => import('@/components/lobby/LobbyContent'),
  { ssr: false }
)

export default function LobbyPage() {
  return <LobbyContent />
}


// ⟳ echo · src/app/app/faucet/page.tsx
//   title: 'Token Faucet | Chessify Protocol',
//   description: 'Claim free CHESS tokens daily to fuel your on-chain chess matches.',
// }
// export default function FaucetPage() {
//   return <FaucetContent />