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


// ⟳ echo · src/components/ui/FaucetResultModal.tsx
//                       chain === 'celo'
//                         ? `https://celoscan.io/tx/${txHash}`
//                         : `https://explorer.hiro.so/txid/${txHash}`