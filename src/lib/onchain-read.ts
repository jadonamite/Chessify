// SERVER-ONLY chain-dispatched on-chain reads used by the move relay to
// authenticate moves (game must be Active; turn order derives from white/black).
// Read-only: holds no private keys. Settlement-side writes (oracle) are a
// separate, deferred concern.

import { createPublicClient, http, type Address } from 'viem'
import { celo, base } from 'viem/chains'
import { fetchCallReadOnlyFunction, uintCV, cvToJSON } from '@stacks/transactions'
import {
  CELO_CONTRACTS,
  BASE_CONTRACTS,
  STACKS_CONTRACTS,
} from '@/config/contracts'
import type { Chain } from '@/lib/moves-store'

// Minimal, per-chain shape the relay needs. status follows the shared enum:
// 0 Waiting · 1 Active · 2 Finished · 3 Cancelled/Draw · 4 Draw (chain-dependent
// beyond Active, but Active === 1 everywhere).
export interface OnchainGame {
  white: string
  black: string
  status: number
}

export const STATUS_ACTIVE = 1

// EVM getGame returns a struct tuple. Celo's is 10-field, Base's is 5-field, so
// each chain needs its own decode shape. Both expose white/black/status at the
// same leading positions.
const CELO_GET_GAME_ABI = [
  { type: 'function', name: 'getGame', stateMutability: 'view', inputs: [{ name: 'gameId', type: 'uint256' }], outputs: [{ type: 'tuple', components: [
    { name: 'white', type: 'address' }, { name: 'black', type: 'address' }, { name: 'wager', type: 'uint256' },
    { name: 'status', type: 'uint8' }, { name: 'result', type: 'uint8' }, { name: 'turn', type: 'address' },
    { name: 'moveCount', type: 'uint256' }, { name: 'createdAt', type: 'uint256' }, { name: 'lastMoveBlock', type: 'uint256' },
    { name: 'drawProposer', type: 'address' },
  ] }] },
] as const

const BASE_GET_GAME_ABI = [
  { type: 'function', name: 'getGame', stateMutability: 'view', inputs: [{ name: 'gameId', type: 'uint256' }], outputs: [{ type: 'tuple', components: [
    { name: 'white', type: 'address' }, { name: 'black', type: 'address' }, { name: 'wager', type: 'uint256' },
    { name: 'status', type: 'uint8' }, { name: 'result', type: 'uint8' },
  ] }] },
] as const

const celoClient = createPublicClient({ chain: celo, transport: http('https://forno.celo.org') })
const baseClient = createPublicClient({ chain: base, transport: http('https://mainnet.base.org') })

/** Read the minimal on-chain game state the relay needs, dispatched by chain. */
export async function getOnchainGame(chain: Chain, gameId: number): Promise<OnchainGame> {
  if (chain === 'celo' || chain === 'base') return readEvmGame(chain, gameId)
  if (chain === 'stacks') return readStacksGame(gameId)
  throw new Error(`unsupported chain: ${chain}`)
}


async function readEvmGame(chain: 'celo' | 'base', gameId: number): Promise<OnchainGame> {
  const client = chain === 'celo' ? celoClient : baseClient
  const address = (chain === 'celo' ? CELO_CONTRACTS.game : BASE_CONTRACTS.game) as Address
  const abi = chain === 'celo' ? CELO_GET_GAME_ABI : BASE_GET_GAME_ABI
  const g = await client.readContract({ address, abi, functionName: 'getGame', args: [BigInt(gameId)] }) as {
    white: string; black: string; status: number
  }
  return { white: g.white, black: g.black, status: Number(g.status) }
}

async function readStacksGame(gameId: number): Promise<OnchainGame> {
  const result = await fetchCallReadOnlyFunction({
    contractAddress: STACKS_CONTRACTS.game.address,
    contractName: STACKS_CONTRACTS.game.name,
    functionName: 'get-game',
    functionArgs: [uintCV(gameId)],
    senderAddress: STACKS_CONTRACTS.game.address,
  })
  // (ok (some { white, black: (optional principal), status, ... }))
  const json = cvToJSON(result) as any
  const tuple = json?.value?.value?.value
  if (!tuple) throw new Error('game not found')
  const white = tuple.white?.value ?? ''
  // black is (optional principal): unwrap (some …) → value.value, (none) → ''
  const black = tuple.black?.value?.value ?? tuple.black?.value ?? ''
  const status = Number(tuple.status?.value ?? -1)
  return { white, black, status }
}