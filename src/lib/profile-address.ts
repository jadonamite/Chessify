// Chain-aware address handling for the .chess profile system.
// Shared by client hooks and server routes — keep it dependency-free.

export type ProfileChain = 'celo' | 'stacks'

// Stacks c32check addresses: SP/SM (mainnet), ST/SN (testnet), then c32 body.
const STACKS_RE = /^S[PTMN][0-9A-Z]{37,42}$/

export function detectChain(address: string): ProfileChain | null {
  if (/^0x[a-fA-F0-9]{40}$/.test(address)) return 'celo'
  if (STACKS_RE.test(address)) return 'stacks'
  return null
}

// EVM addresses are case-insensitive → canonicalise to lowercase.
export function normalizeAddress(address: string): string {
  return address.startsWith('0x') ? address.toLowerCase() : address
}

export function isValidProfileAddress(address: string | null | undefined): boolean {
  return !!address && detectChain(address) !== null
}
