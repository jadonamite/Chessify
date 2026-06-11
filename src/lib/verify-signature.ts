import { detectChain } from './profile-address'
import { verifyMessage } from 'viem'

// Verifies that `signature` over `message` was produced by the owner of
// `address`. EVM uses viem's recover; Stacks uses RSV verification plus an
// address-derivation check so a valid signature from a *different* key can't
// claim someone else's address.
export async function verifyProfileSignature(opts: {
  address: string
  message: string
  signature: string
  publicKey?: string
}): Promise<boolean> {
  const chain = detectChain(opts.address)

  if (chain === 'celo') {
    try {
      return await verifyMessage({
        address: opts.address as `0x${string}`,
        message: opts.message,
        signature: opts.signature as `0x${string}`,
      })
    } catch {
      return false
    }
  }

  if (chain === 'stacks') {
    if (!opts.publicKey) return false
    try {
      const { verifyMessageSignatureRsv } = await import('@stacks/encryption')
      const { getAddressFromPublicKey } = await import('@stacks/transactions')

      const sigValid = verifyMessageSignatureRsv({
        message: opts.message,
        signature: opts.signature,
        publicKey: opts.publicKey,
      })
      if (!sigValid) return false

      const network = (opts.address.startsWith('ST') || opts.address.startsWith('SN'))
        ? 'testnet'
        : 'mainnet'
      const derived = getAddressFromPublicKey(opts.publicKey, network as any)
      return derived === opts.address
    } catch {
      return false
    }
  }

  return false
}
