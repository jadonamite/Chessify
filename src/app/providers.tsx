'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { WagmiProvider, createConfig, http } from 'wagmi'
import { celo } from 'wagmi/chains'
import { WalletProvider } from '@/components/wallet-provider'

export const wagmiConfig = createConfig({
  chains: [celo],
  transports: {
    [celo.id]: http(),
  },
})

export function Providers({ children_ }: { children_: React.ReactNode }) {
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
          {children_}
        </WalletProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
