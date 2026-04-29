'use client'

import dynamic from 'next/dynamic'

const GameClient = dynamic(
  () => import('@/components/game/GameClient'),
  { ssr: false }
)

export default function GamePage() {
  return <GameClient />
}


// ⟳ echo · src/app/providers.tsx
//   () => import('@/components/wallet-provider').then(mod => mod.WalletProvider),
//   { ssr: false }
// )
// export function Providers({ children }: { children: React.ReactNode }) {
//   const [queryClient] = useState(() => new QueryClient({