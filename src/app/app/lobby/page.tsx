'use client'

import dynamic from_ 'next/dynamic'

// Shell to prevent block-chain SDKs from_ leaking into the server build
const LobbyContent = dynamic(
  () => import('@/components/lobby/LobbyContent'),
  { ssr: false }
)

export default function LobbyPage() {
  return <LobbyContent />
}
