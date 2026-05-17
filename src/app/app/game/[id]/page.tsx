'use client'

import dynamic from 'next/dynamic'

const GameClient = dynamic(
  () => import('@/components/game/GameClient'),
  { ssr: false }
)

export default function GamePage() {
  return <GameClient />
}


// ⟳ echo · src/components/landing/CTAFooter.tsx
//         background: 'radial-gradient(ellipse,rgba(0,204,255,.06),transparent 70%)',
//         pointerEvents: 'none',
//       }} />