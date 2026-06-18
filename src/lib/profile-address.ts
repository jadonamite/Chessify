// Chain-aware address handling for the .chess profile system.
// Shared by client hooks and server routes — keep it dependency-free.
export type ProfileChain = 'celo' | 'stacks'

// Stacks c32check addresses: SP/SM (mainnet), ST/SN (testnet), then c32 body.
const STACKS_RE = /^S[PTMN][0-9A-Z]{37,42}$/
const EVM_RE = /^0x[a-fA-F0-9]{40}$/

function isEvmAddress(address: string): boolean {
  return EVM_RE.test(address)
}

function isStacksAddress(address: string): boolean {
  return STACKS_RE.test(address)
}

export function detectChain(address: string): ProfileChain | null {
  if (isEvmAddress(address)) return 'celo'
  if (isStacksAddress(address)) return 'stacks'
  return null
}

// EVM addresses are case-insensitive → canonicalise to lowercase.
// Stacks (c32check) addresses ARE case-sensitive → preserve verbatim.
export function normalizeAddress(address: string): string {
  return address.startsWith('0x') ? address.toLowerCase() : address
}

export function isValidProfileAddress(address: string | null | undefined): boolean {
  return !!address && detectChain(address) !== null
}