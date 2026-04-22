// config/contracts.ts
// Update CONTRACT_ADDRESS after deployment

export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? ''

// Stacks contracts configuration remain for multi-chain support
export const STACKS_CONTRACTS = {
  token:    { address: CONTRACT_ADDRESS, name: 'chess-token_v2' },
  escrow:   { address: CONTRACT_ADDRESS, name: 'chess-escrow'   },
  registry: { address: CONTRACT_ADDRESS, name: 'registry'       },
  logic:    { address: CONTRACT_ADDRESS, name: 'logic'          },
  timer:    { address: CONTRACT_ADDRESS, name: 'timer'          },
  ranking:  { address: CONTRACT_ADDRESS, name: 'ranking'        },
  gateway:  { address: CONTRACT_ADDRESS, name: 'gateway_v2'     },
} as const

// Celo contracts configuration
export const CELO_CONTRACTS = {
  token: process.env.NEXT_PUBLIC_CELO_TOKEN ?? '0xE370aad742dF8DC8Ae9c0F0b9f265334D39e2197',
  game: process.env.NEXT_PUBLIC_CELO_GAME ?? '0xf85f00D39A84b5180390548Ea9f76B0458607E78',
} as const

export const CELO_CHAIN_ID = 42220 // Celo Mainnet

export const STACKS_NETWORK = process.env.NEXT_PUBLIC_NETWORK ?? 'mainnet'

export const HIRO_API =
  STACKS_NETWORK === 'mainnet'
    ? 'https://api.mainnet.hiro.so'
    : 'https://api.testnet.hiro.so'

// Token constants
export const TOKEN_DECIMALS  = 6
export const FAUCET_AMOUNT   = 1_000_000_000n  // 1000 CHESS
export const FAUCET_COOLDOWN = 144             // ~1 day in blocks
export const BLOCK_TIME_SECS = 600             // ~10 min per block


// ⟳ echo · src/components/landing/Hero.tsx
//       <div>
//         <Image src="/chessify.png" alt="Chessify" width={200} height={50} style={{ objectFit: "contain" }} />
//       </div>