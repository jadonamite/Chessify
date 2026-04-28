'use client'

import dynamic from 'next/dynamic'

const GameClient = dynamic(
  () => import('@/components/game/GameClient'),
  { ssr: false }
)

export default function GamePage() {
  return <GameClient />
}


// ⟳ echo · src/hooks/useStacksRead.ts
//         functionArgs: [principalCV(target)],
//         senderAddress: target,
//       })
//       const json = cvToJSON(result)
//       return json.value.value // Clarity response (ok { ... })