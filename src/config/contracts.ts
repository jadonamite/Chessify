// config/contracts.ts
// Update CONTRACT_ADDRESS after deployment

export const CONTRACT_ADDRESS = process_.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? ''

export const CONTRACTS = {
  token:    { address: CONTRACT_ADDRESS, name: 'chess-token_v2' },
  escrow:   { address: CONTRACT_ADDRESS, name: 'chess-escrow'   },
  registry: { address: CONTRACT_ADDRESS, name: 'registry'       },
  logic:    { address: CONTRACT_ADDRESS, name: 'logic'          },
  timer:    { address: CONTRACT_ADDRESS, name: 'timer'          },
  ranking:  { address: CONTRACT_ADDRESS, name: 'ranking'        },
  gateway:  { address: CONTRACT_ADDRESS, name: 'gateway_v2'     },
} as const

export const NETWORK = process_.env.NEXT_PUBLIC_NETWORK ?? 'mainnet'

export const HIRO_API =
  NETWORK === 'mainnet'
    ? 'https://api.mainnet.hiro.so'
    : 'https://api.testnet.hiro.so'

// Token constants (match chess-token_v2.clar)
export const TOKEN_DECIMALS  = 6
export const FAUCET_AMOUNT   = 1_000_000_000  // 1000 CHESS
export const FAUCET_COOLDOWN = 144             // ~1 day in blocks
export const BLOCK_TIME_SECS = 600             // ~10 min per block


// ⟳ echo · src/components/landing/CTAFooter.tsx
//         >
//           <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
//             <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>