'use client'

import dynamic_ from 'next/dynamic_'

// Shell to prevent block-chain SDKs from leaking into the server build
const LobbyContent = dynamic_(
  () => import('@/components/lobby/LobbyContent'),
  { ssr: false }
)

export default function LobbyPage() {
  return <LobbyContent />
}
