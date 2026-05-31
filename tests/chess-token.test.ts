/**
 * chess-token.test.ts — chess-token-v3.clar: SIP-010 token, faucet, mint, gateway
 *
 * initBeforeEach:true means simnet resets before every it().
 * Each test is fully self-contained.
 */
import { describe, expect, it } from "vitest"
import { Cl } from "@stacks/transactions"

const TOKEN    = "chess-token-v3"
const FAUCET   = 1_000_000_000n // 1 000 CHESS (6 decimals)
const COOLDOWN = 144

const ERR_NOT_AUTH = Cl.error(Cl.uint(100))
const ERR_DISABLED = Cl.error(Cl.uint(101))
const ERR_AMOUNT   = Cl.error(Cl.uint(102))
const ERR_COOLDOWN = Cl.error(Cl.uint(105))
const ERR_SAME     = Cl.error(Cl.uint(106))

const accounts = simnet.getAccounts()
const deployer = accounts.get("deployer")!
const wallet1  = accounts.get("wallet_1")!
const wallet2  = accounts.get("wallet_2")!
const wallet3  = accounts.get("wallet_3")!

function balance(addr: string): bigint {
  const { result } = simnet.callReadOnlyFn(TOKEN, "get-balance", [Cl.principal(addr)], addr)
  return BigInt((result as any).value.value)
}

// Seed tokens without block-height restriction (owner mint)
function seed(addr: string, amount = FAUCET) {
  simnet.callPublicFn(TOKEN, "mint", [Cl.uint(amount), Cl.principal(addr)], deployer)
}

// ── Faucet ────────────────────────────────────────────────────────────────────
describe("faucet-claim", () => {
  it("claims 1 000 CHESS once block height ≥ COOLDOWN", () => {
    simnet.mineEmptyBlocks(COOLDOWN)
    const { result } = simnet.callPublicFn(TOKEN, "faucet-claim", [], wallet1)
    expect(result).toBeOk(Cl.uint(FAUCET))
    expect(balance(wallet1)).toBe(FAUCET)
  })

  it("rejects an immediate second claim with ERR-FAUCET-COOLDOWN", () => {
    simnet.mineEmptyBlocks(COOLDOWN)
    simnet.callPublicFn(TOKEN, "faucet-claim", [], wallet1) // first claim
    const { result } = simnet.callPublicFn(TOKEN, "faucet-claim", [], wallet1) // immediate retry
    expect(result).toStrictEqual(ERR_COOLDOWN)
  })

  it("reports non-zero cooldown remaining after claim", () => {
    simnet.mineEmptyBlocks(COOLDOWN)
    simnet.callPublicFn(TOKEN, "faucet-claim", [], wallet1)
    const { result } = simnet.callReadOnlyFn(
      TOKEN, "get-faucet-cooldown-remaining", [Cl.principal(wallet1)], wallet1
    )
    const remaining = Number((result as any).value.value)
    expect(remaining).toBeGreaterThan(0)
    expect(remaining).toBeLessThanOrEqual(COOLDOWN)
  })

  it("allows a second claim after COOLDOWN more blocks", () => {
    simnet.mineEmptyBlocks(COOLDOWN)
    simnet.callPublicFn(TOKEN, "faucet-claim", [], wallet1)
    simnet.mineEmptyBlocks(COOLDOWN)
    const { result } = simnet.callPublicFn(TOKEN, "faucet-claim", [], wallet1)
    expect(result).toBeOk(Cl.uint(FAUCET))
    expect(balance(wallet1)).toBe(FAUCET * 2n)
  })
})

// ── Transfer ──────────────────────────────────────────────────────────────────
describe("transfer", () => {
  it("moves tokens between two addresses", () => {
    seed(wallet1)
    const amount = 100_000_000n
    const { result } = simnet.callPublicFn(
      TOKEN, "transfer",
      [Cl.uint(amount), Cl.principal(wallet1), Cl.principal(wallet2), Cl.none()],
      wallet1
    )
    expect(result).toBeOk(Cl.bool(true))
    expect(balance(wallet2)).toBe(amount)
    expect(balance(wallet1)).toBe(FAUCET - amount)
  })

  it("rejects when tx-sender ≠ sender argument", () => {
    seed(wallet1)
    const { result } = simnet.callPublicFn(
      TOKEN, "transfer",
      [Cl.uint(1n), Cl.principal(wallet1), Cl.principal(wallet2), Cl.none()],
      wallet2 // wallet2 is signing but wallet1 is listed as sender
    )
    expect(result).toStrictEqual(ERR_NOT_AUTH)
  })

  it("rejects self-transfer", () => {
    seed(wallet1)
    const { result } = simnet.callPublicFn(
      TOKEN, "transfer",
      [Cl.uint(1n), Cl.principal(wallet1), Cl.principal(wallet1), Cl.none()],
      wallet1
    )
    expect(result).toStrictEqual(ERR_SAME)
  })

  it("rejects zero amount", () => {
    seed(wallet1)
    const { result } = simnet.callPublicFn(
      TOKEN, "transfer",
      [Cl.uint(0n), Cl.principal(wallet1), Cl.principal(wallet2), Cl.none()],
      wallet1
    )
    expect(result).toStrictEqual(ERR_AMOUNT)
  })
})

// ── Mint ──────────────────────────────────────────────────────────────────────
describe("mint", () => {
  it("deployer can mint an arbitrary amount to any address", () => {
    const { result } = simnet.callPublicFn(
      TOKEN, "mint", [Cl.uint(5_000_000n), Cl.principal(wallet3)], deployer
    )
    expect(result).toBeOk(Cl.bool(true))
    expect(balance(wallet3)).toBe(5_000_000n)
  })

  it("non-owner cannot mint", () => {
    const { result } = simnet.callPublicFn(
      TOKEN, "mint", [Cl.uint(1n), Cl.principal(wallet3)], wallet1
    )
    expect(result).toStrictEqual(ERR_NOT_AUTH)
  })

  it("deployer can batch-mint to multiple recipients", () => {
    const entries = [
      Cl.tuple({ recipient: Cl.principal(wallet1), amount: Cl.uint(1_000n) }),
      Cl.tuple({ recipient: Cl.principal(wallet2), amount: Cl.uint(2_000n) }),
    ]
    const { result } = simnet.callPublicFn(TOKEN, "batch-mint", [Cl.list(entries)], deployer)
    expect(result).toBeOk(Cl.list([Cl.ok(Cl.bool(true)), Cl.ok(Cl.bool(true))]))
    expect(balance(wallet1)).toBe(1_000n)
    expect(balance(wallet2)).toBe(2_000n)
  })
})

// ── Mint toggle ───────────────────────────────────────────────────────────────
describe("set-mint-enabled", () => {
  it("non-owner cannot toggle mint", () => {
    const { result } = simnet.callPublicFn(TOKEN, "set-mint-enabled", [Cl.bool(false)], wallet1)
    expect(result).toStrictEqual(ERR_NOT_AUTH)
  })

  it("owner disables mint; faucet then fails with ERR-MINT-DISABLED", () => {
    simnet.callPublicFn(TOKEN, "set-mint-enabled", [Cl.bool(false)], deployer)
    simnet.mineEmptyBlocks(COOLDOWN)
    const { result } = simnet.callPublicFn(TOKEN, "faucet-claim", [], wallet3)
    expect(result).toStrictEqual(ERR_DISABLED)
  })

  it("re-enabling mint allows faucet again", () => {
    simnet.callPublicFn(TOKEN, "set-mint-enabled", [Cl.bool(false)], deployer)
    simnet.callPublicFn(TOKEN, "set-mint-enabled", [Cl.bool(true)], deployer)
    simnet.mineEmptyBlocks(COOLDOWN)
    const { result } = simnet.callPublicFn(TOKEN, "faucet-claim", [], wallet3)
    expect(result).toBeOk(Cl.uint(FAUCET))
  })
})

// ── Gateway-release ───────────────────────────────────────────────────────────
describe("gateway-release", () => {
  it("direct call from a wallet fails ERR-NOT-AUTHORIZED (u100)", () => {
    const { result } = simnet.callPublicFn(
      TOKEN, "gateway-release", [Cl.uint(1n), Cl.principal(wallet1)], wallet1
    )
    expect(result).toStrictEqual(ERR_NOT_AUTH)
  })

  it("get-vault-balance returns ok(0) on a fresh simnet", () => {
    const { result } = simnet.callReadOnlyFn(TOKEN, "get-vault-balance", [], wallet1)
    expect(result).toBeOk(Cl.uint(0))
  })
})
