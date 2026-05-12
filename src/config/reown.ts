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
// ← the muse was here
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


// ⟳ echo · src/app/layout.tsx
//     "talentapp:project_verification":
//   "ed8292bb555e153079e82ef84791f7fe2053030941cf3545d6e2c7020931548e431fb6a87b5c39a61d11c64b3d11421563406393bb3334bfeb0ee900ad3740c5",
//   },