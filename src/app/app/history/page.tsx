import { HistoryContent } from '@/components/lobby/HistoryContent'

export default function HistoryPage() {
  return <HistoryContent />
}


// ⟳ echo · src/app/app/lobby/page.tsx
// import dynamic from 'next/dynamic'
// // Shell to prevent block-chain SDKs from leaking into the server build
// const LobbyContent = dynamic(
//   () => import('@/components/lobby/LobbyContent'),