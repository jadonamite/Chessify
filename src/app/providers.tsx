'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { WalletProvider } from '@/components/wallet-provider'
import { celo } from 'wagmi/chains'
import { WagmiProvider, createConfig, http } from 'wagmi'

export const wagmiConfig = createConfig({
  chains: [celo],
  transports: {
    [celo.id]: http(),
  },
})

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
      },
    },
  }))

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <WalletProvider>
          {children}
        </WalletProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
