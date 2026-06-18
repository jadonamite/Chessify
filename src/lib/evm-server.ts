import {
  createPublicClient,
  createWalletClient,
  http,
  getAddress,
  parseEther,
  type Address,
  type Hash,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { celo, base } from 'viem/chains'
import { EVM_CHESS_ORACLE_ABI, EVM_CHESS_TOKEN_ABI } from '@/config/abis'
import { CELO_CONTRACTS, BASE_CONTRACTS } from '@/config/contracts'

// SERVER-ONLY viem clients + signing wallets for the Chessify oracle model on the
// EVM chains (Celo + Base). NEVER import from a client component — it reads
// private keys. Celo and Base run the SAME contract shape (the 2026-06 port
// converged them), so one module parameterized by `chain` serves both.
//
// ⚠️ DORMANT until the oracle contracts are deployed. The deployed Celo/Base
// contracts still run the legacy player-submitted model; these writes target
// settleGame/mintTo which only exist on the next deploy. Wiring this in before
// redeploy is a no-op at best (reverts) — see HANDOVER "Migration status".
//
// Operator keys (shared across both EVM chains — one EOA set as oracle/minter on
// each contract, funded with native gas on each chain):
//   ORACLE_PRIVATE_KEY      — settleGame (declares winner/draw)
//   MINTER_PRIVATE_KEY      — token.mintTo (provisions CHESS to fresh wallets)
//   GAS_SPONSOR_PRIVATE_KEY — drips gas (Celo USDm / native CELO; Base native ETH)

export type EvmChain = 'celo' | 'base'

// ── Contract enums (mirror ChessGame) ────────────────────────────────────────
export enum GameResult {
  None = 0,
  WhiteWins = 1,
  BlackWins = 2,
  DrawResult = 3,
  Cancelled = 4,
}

export enum GameStatus {
  Waiting = 0,
  Active = 1,
  Finished = 2,
  Cancelled = 3,
  Draw = 4,
}

// ── Per-chain wiring ──────────────────────────────────────────────────────────
interface ChainCfg {
  chain: typeof celo | typeof base
  rpc: string
  game: Address
  token: Address
}

const CONFIG: Record<EvmChain, ChainCfg> = {
  celo: {
    chain: celo,
    rpc: process.env.CELO_RPC_URL ?? 'https://forno.celo.org',
    game: CELO_CONTRACTS.game as Address,
    token: CELO_CONTRACTS.token as Address,
  },
  base: {
    chain: base,
    rpc: process.env.BASE_RPC_URL ?? 'https://mainnet.base.org',
    game: BASE_CONTRACTS.game as Address,
    token: BASE_CONTRACTS.token as Address,
  },
}

function cfg(chain: EvmChain): ChainCfg {
  const c = CONFIG[chain]
  if (!c) throw new Error(`[evm-server] unsupported chain: ${chain}`)
  return c
}

// ── Public clients (reads) — one per chain, lazily memoized ──────────────────
const _publicClients: Partial<Record<EvmChain, ReturnType<typeof createPublicClient>>> = {}
export function getPublicClient(chain: EvmChain) {
  if (!_publicClients[chain]) {
    const c = cfg(chain)
    _publicClients[chain] = createPublicClient({ chain: c.chain, transport: http(c.rpc) })
  }
  return _publicClients[chain]!
}

// ── Wallet clients (writes) ──────────────────────────────────────────────────
function requireKey(name: string): `0x${string}` {
  const raw = process.env[name]
  if (!raw) throw new Error(`[evm-server] ${name} must be set`)
  return (raw.startsWith('0x') ? raw : `0x${raw}`) as `0x${string}`
}

function walletFor(chain: EvmChain, envName: string) {
  const c = cfg(chain)
  const account = privateKeyToAccount(requireKey(envName))
  const client = createWalletClient({ account, chain: c.chain, transport: http(c.rpc) })
  return { account, client, c }
}

// ── On-chain reads ───────────────────────────────────────────────────────────
export interface OnchainGame {
  white: Address
  black: Address
  wager: bigint
  status: GameStatus
  result: GameResult
  createdAt: bigint
  drawProposer: Address
}

export async function getOnchainGame(chain: EvmChain, gameId: number): Promise<OnchainGame> {
  const c = cfg(chain)
  const g = (await getPublicClient(chain).readContract({
    address: c.game,
    abi: EVM_CHESS_ORACLE_ABI,
    functionName: 'getGame',
    args: [BigInt(gameId)],
  })) as unknown as {
    white: Address
    black: Address
    wager: bigint
    status: number
    result: number
    createdAt: bigint
    drawProposer: Address
  }
  return {
    white: g.white,
    black: g.black,
    wager: g.wager,
    status: g.status as GameStatus,
    result: g.result as GameResult,
    createdAt: g.createdAt,
    drawProposer: g.drawProposer,
  }
}

// Short-lived cache to coalesce the per-move reads the relay does.
const _gameCache = new Map<string, { at: number; game: OnchainGame }>()
const GAME_CACHE_TTL_MS = 5_000

export async function getOnchainGameCached(chain: EvmChain, gameId: number): Promise<OnchainGame> {
  const k = `${chain}:${gameId}`
  const hit = _gameCache.get(k)
  if (hit && Date.now() - hit.at < GAME_CACHE_TTL_MS) return hit.game
  const game = await getOnchainGame(chain, gameId)
  _gameCache.set(k, { at: Date.now(), game })
  return game
}

/** Verify a wallet signature (EOA + EIP-1271 smart accounts) on a given chain. */
export async function verifyWalletSignature(
  chain: EvmChain,
  signer: Address,
  message: string,
  signature: `0x${string}`,
): Promise<boolean> {
  try {
    return await getPublicClient(chain).verifyMessage({ address: signer, message, signature })
  } catch {
    return false
  }
}

// ── On-chain writes ──────────────────────────────────────────────────────────

/** Oracle settles a game to its terminal result. Waits for the receipt. */
export async function settleOnChain(chain: EvmChain, gameId: number, result: GameResult): Promise<Hash> {
  const { account, client, c } = walletFor(chain, 'ORACLE_PRIVATE_KEY')
  const hash = await client.writeContract({
    account,
    chain: c.chain,
    address: c.game,
    abi: EVM_CHESS_ORACLE_ABI,
    functionName: 'settleGame',
    args: [BigInt(gameId), result],
  })
  await getPublicClient(chain).waitForTransactionReceipt({ hash })
  return hash
}

/** Minter provisions CHESS to a recipient. */
export async function mintChessTo(chain: EvmChain, to: Address, amount: bigint): Promise<Hash> {
  const { account, client, c } = walletFor(chain, 'MINTER_PRIVATE_KEY')
  const hash = await client.writeContract({
    account,
    chain: c.chain,
    address: c.token,
    abi: EVM_CHESS_TOKEN_ABI,
    functionName: 'mintTo',
    args: [to, amount],
  })
  await getPublicClient(chain).waitForTransactionReceipt({ hash })
  return hash
}

// ── Gas sponsorship ───────────────────────────────────────────────────────────
// Celo (MiniPay) uses USDm as the gas fee-currency; Base/native chains use the
// native coin. The sponsor degrades to self-pay (handled by the route) when its
// balance can't cover a drip.

/** Drip USDm gas to a 0-balance MiniPay EOA (Celo only). */
export async function sponsorUsdm(to: Address, amountUsdm: bigint): Promise<Hash> {
  const { account, client, c } = walletFor('celo', 'GAS_SPONSOR_PRIVATE_KEY')
  const hash = await client.writeContract({
    account,
    chain: c.chain,
    address: USDM_ADDRESS,
    abi: ERC20_MIN_ABI,
    functionName: 'transfer',
    args: [to, amountUsdm],
  })
  await getPublicClient('celo').waitForTransactionReceipt({ hash })
  return hash
}

/** Drip native gas coin (CELO / ETH) to a near-empty EOA so it can self-pay. */
export async function sponsorNative(chain: EvmChain, to: Address, amount: bigint): Promise<Hash> {
  const { account, client, c } = walletFor(chain, 'GAS_SPONSOR_PRIVATE_KEY')
  const hash = await client.sendTransaction({ account, chain: c.chain, to, value: amount })
  await getPublicClient(chain).waitForTransactionReceipt({ hash })
  return hash
}

const NATIVE_GAS_FLOOR = parseEther('0.001') // keep enough to pay the sponsor's own tx gas

/** Whether the Celo sponsor can cover a USDm drip (and has CELO for its own gas). */
export async function gasSponsorCanCoverUsdm(amountUsdm: bigint): Promise<boolean> {
  try {
    const { account } = walletFor('celo', 'GAS_SPONSOR_PRIVATE_KEY')
    const pub = getPublicClient('celo')
    const [usdm, native] = await Promise.all([
      pub.readContract({ address: USDM_ADDRESS, abi: ERC20_MIN_ABI, functionName: 'balanceOf', args: [account.address] }) as Promise<bigint>,
      pub.getBalance({ address: account.address }),
    ])
    return usdm >= amountUsdm && native > NATIVE_GAS_FLOOR
  } catch {
    return false
  }
}

/** Whether the sponsor can cover a native drip of `amount` plus its own gas floor. */
export async function gasSponsorCanCoverNative(chain: EvmChain, amount: bigint): Promise<boolean> {
  try {
    const { account } = walletFor(chain, 'GAS_SPONSOR_PRIVATE_KEY')
    const native = await getPublicClient(chain).getBalance({ address: account.address })
    return native > amount + NATIVE_GAS_FLOOR
  } catch {
    return false
  }
}

// ── Balance reads ─────────────────────────────────────────────────────────────
export async function nativeBalanceOf(chain: EvmChain, addr: Address): Promise<bigint> {
  return getPublicClient(chain).getBalance({ address: addr })
}

export async function chessBalanceOf(chain: EvmChain, addr: Address): Promise<bigint> {
  return (await getPublicClient(chain).readContract({
    address: cfg(chain).token,
    abi: EVM_CHESS_TOKEN_ABI,
    functionName: 'balanceOf',
    args: [addr],
  // FIXME: handle edge case when value is null
  })) as bigint
}

export async function usdmBalanceOf(addr: Address): Promise<bigint> {
  return (await getPublicClient('celo').readContract({
    address: USDM_ADDRESS,
    abi: ERC20_MIN_ABI,
    functionName: 'balanceOf',
    args: [addr],
  })) as bigint
}

// ── Constants ────────────────────────────────────────────────────────────────
// USDm (Mento Dollar) — Celo gas fee currency. Mainnet default.
export const USDM_ADDRESS = getAddress(
  process.env.NEXT_PUBLIC_FEE_CURRENCY ?? '0x765DE816845861e75A25fCA122bb6898B8B1282a',
)

export const ERC20_MIN_ABI = [
  { type: 'function', name: 'transfer', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
] as const

export { getAddress }
export type { Address }
