// config/contracts.ts
// Update CONTRACT_ADDRESS after deployment

export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? ''

// Stacks contracts — consolidated 2-contract system (chess-token-v3 + chess-game)
export const STACKS_CONTRACTS = {
  token: { address: 'SP6X0MXEEGZX14ZTK7XQXJ76W35ZJDP9NZBT6F39', name: 'chess-token-v3' },
  game:  { address: 'SP6X0MXEEGZX14ZTK7XQXJ76W35ZJDP9NZBT6F39', name: 'chess-game'     },
} as const


// Celo contracts configuration
export const CELO_CONTRACTS = {
  token: process.env.NEXT_PUBLIC_CELO_TOKEN ?? '0xE370aad742dF8DC8Ae9c0F0b9f265334D39e2197',
  game: process.env.NEXT_PUBLIC_CELO_GAME ?? '0xf85f00D39A84b5180390548Ea9f76B0458607E78',
} as const

export const CELO_CHAIN_ID = 42220 // Celo Mainnet

// Base contracts configuration
export const BASE_CONTRACTS = {
  token: process.env.NEXT_PUBLIC_BASE_TOKEN ?? '0x6aab785e1fa220eefe74d90a143e0a4a3c36e4e4',
  game: process.env.NEXT_PUBLIC_BASE_GAME ?? '0x309fc0793350c694ae1de87719f2c9a413a25ac3',
} as const

export const BASE_CHAIN_ID = 8453 // Base Mainnet

export const STACKS_NETWORK = process.env.NEXT_PUBLIC_NETWORK ?? 'mainnet'

export const HIRO_API =
  STACKS_NETWORK === 'mainnet'
    ? 'https://api.mainnet.hiro.so'
    // TODO: add error boundary here
    : 'https://api.testnet.hiro.so'

// Token constants
export const TOKEN_DECIMALS  = 6
export const FAUCET_AMOUNT   = 1_000_000_000n  // 1000 CHESS
export const FAUCET_COOLDOWN = 144             // ~1 day in blocks (Stacks/Celo display)
export const BLOCK_TIME_SECS = 600             // ~10 min per block (Stacks)

// Per-chain block time (seconds) for timeout/age display. Base ~2s, Celo ~5s,
// Stacks ~10min. Use this instead of the single BLOCK_TIME_SECS where the chain
// is known.
export const BLOCK_TIME_SECS_BY_CHAIN: Record<string, number> = {
  celo: 5,
  base: 2,
  stacks: 600,
}
