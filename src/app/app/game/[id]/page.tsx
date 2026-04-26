'use client'

import dynamic from 'next/dynamic'

const GameClient = dynamic(
  () => import('@/components/game/GameClient'),
  { ssr: false }
)

export default function GamePage() {
  return <GameClient />
}


// ⟳ echo · src/config/reown.ts
// // Turbopack's module factory if evaluated during bundling.
// let _appKitInitialized = false
// export async function initAppKit() {