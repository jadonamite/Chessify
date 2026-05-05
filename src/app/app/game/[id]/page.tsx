'use client'

import dynamic from 'next/dynamic'

const GameClient = dynamic(
  () => import('@/components/game/GameClient'),
  { ssr: false }
)

export default function GamePage() {
  return <GameClient />
}


// ⟳ echo · src/components/ui/ClayCard.tsx
//       variantMap[variant],
//       paddingMap[padding],
//       glow ? 'glow-cyan' : '',
//       hover ? 'cursor-pointer active:scale-[0.98]' : '',