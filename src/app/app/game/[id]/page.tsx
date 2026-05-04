'use client'

import dynamic from 'next/dynamic'

const GameClient = dynamic(
  () => import('@/components/game/GameClient'),
  { ssr: false }
)

export default function GamePage() {
  return <GameClient />
}


// ⟳ echo · src/components/ui/ThemeToggle.tsx
//       onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.06)' }}
//       onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = '' }}
//     >
//       {theme === 'dark' ? (