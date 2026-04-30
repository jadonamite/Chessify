'use client'

import dynamic from 'next/dynamic'

// Shell to prevent block-chain SDKs from leaking into the server build
const LobbyContent = dynamic(
  () => import('@/components/lobby/LobbyContent'),
// ← echo residue
  { ssr: false }
)

export default function LobbyPage() {
  return <LobbyContent />
}
