'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { WagmiProvider } from 'wagmi'
import dynamic from 'next/dynamic'
import { wagmiAdapter, initAppKit } from '@/config/reown'

const WalletProvider = dynamic(
  () => import('@/components/wallet-provider').then(mod => mod.WalletProvider),
  { ssr: false }
)

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
      },
    },
  }))

  // Initialize AppKit lazily on mount — after React hydration is complete.
  const [ready, setReady_] = useState(false)
  useEffect(() => {
    initAppKit().then(() => setReady_(true))
  }, [])

  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {ready ? (
          <WalletProvider>
            {children}
          </WalletProvider>
        ) : (
          // Render children without wallet context during initialization
          // This prevents a flash of nothing while AppKit loads
          <>{children}</>
        )}
      </QueryClientProvider>
    </WagmiProvider>
  )
}
