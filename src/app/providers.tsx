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


// ⟳ echo · src/components/ui/ThemeToggle.tsx
//   useEffect(() => {
//     const saved = localStorage.getItem('chessify-theme') as 'dark' | 'light' | null
//     const t = saved ?? 'dark'
//     setTheme(t)
//     document.documentElement.setAttribute('data-theme', t)