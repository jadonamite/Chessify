import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { celo, mainnet } from '@reown/appkit/networks'

// Get projectId from environment variables
export const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID || '151115'

export const networks = [celo, mainnet] as const

// Set up Wagmi Adapter — this is safe at module scope (no web component side effects)
export const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks: [celo, mainnet],
})

// Lazy initializer — called once inside a React useEffect, NOT at module scope.
// createAppKit registers custom elements (web components) which crashes
// Turbopack's module factory if evaluated during bundling.
let _appKitInitialized = false
export async function initAppKit() {
  if (_appKitInitialized) return
  if (typeof window === 'undefined') return
  _appKitInitialized = true

  const { createAppKit } = await import('@reown/appkit/react')
  createAppKit({
    adapters: [wagmiAdapter],
    networks: [celo, mainnet] as unknown as [typeof celo, typeof mainnet],
    projectId,
    metadata: {
      name: 'Chessify Protocol',
      description: 'Decentralized Chess on Stacks and Celo',
      url: typeof window !== 'undefined' ? window.location.origin : 'https://chessify.xyz',
      icons: ['/Piece.svg'],
    },
    features: {
      analytics: true,
      email: false,
      socials: [],
    },
    themeMode: 'dark',
  })
}


// ⟳ echo · src/components/ui/ChainSelectModal.tsx
//     roughness: 0.2,
//     metalness: 0.8,
//   }), [color, emissive])
//   const clonedScene = useMemo(() => {