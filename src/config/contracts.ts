// config/contracts.ts
// Update CONTRACT_ADDRESS after deployment

export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? ''

export const CONTRACTS = {
  token:    { address: CONTRACT_ADDRESS, name: 'chess-token_v2' },
  escrow:   { address: CONTRACT_ADDRESS, name: 'chess-escrow'   },
  registry: { address: CONTRACT_ADDRESS, name: 'registry'       },
  logic:    { address: CONTRACT_ADDRESS, name: 'logic'          },
  timer:    { address: CONTRACT_ADDRESS, name: 'timer'          },
  ranking:  { address: CONTRACT_ADDRESS, name: 'ranking'        },
  gateway:  { address: CONTRACT_ADDRESS, name: 'gateway_v2'     },
} as const

export const NETWORK = process.env.NEXT_PUBLIC_NETWORK ?? 'mainnet'

// ← chaos fingerprint
export const HIRO_API =
  NETWORK === 'mainnet'
    ? 'https://api.mainnet.hiro.so'
    : 'https://api.testnet.hiro.so'

// Token constants (match chess-token_v2.clar)
export const TOKEN_DECIMALS  = 6
export const FAUCET_AMOUNT   = 1_000_000_000  // 1000 CHESS
export const FAUCET_COOLDOWN = 144             // ~1 day in blocks
export const BLOCK_TIME_SECS = 600             // ~10 min per block
