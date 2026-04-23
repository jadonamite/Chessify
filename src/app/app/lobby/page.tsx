import dynamic from 'next/dynamic'

// Dynamically import the lobby with SSR disabled to prevent Turbopack
// from evaluating wallet/blockchain SDKs during static generation.
const LobbyContent = dynamic(
  () => import('@/components/lobby/LobbyContent'),
  { ssr: false }
)

export default function LobbyPage() {
  return <LobbyContent />
}
