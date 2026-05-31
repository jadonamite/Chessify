import { describe, expect, it, beforeAll } from "vitest"
import { Cl } from "@stacks/transactions"

const TOKEN    = "chess-token-v3"
const FAUCET   = 1_000_000_000n // 1 000 CHESS (6 decimals)
const COOLDOWN = 144

// Error constants
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

// Mine past the faucet height threshold once for the whole file
beforeAll(() => { simnet.mineEmptyBlocks(COOLDOWN) })

function balance(addr: string): bigint {
  const { result } = simnet.callReadOnlyFn(TOKEN, "get-balance", [Cl.principal(addr)], addr)
  return BigInt((result as any).value.value)
}

describe("faucet-claim", () => {
  it("claims 1 000 CHESS on first call", () => {
    const { result } = simnet.callPublicFn(TOKEN, "faucet-claim", [], wallet1)
    expect(result).toBeOk(Cl.uint(FAUCET))
    expect(balance(wallet1)).toBe(FAUCET)
  })

  it("rejects a second claim before cooldown elapses", () => {
    // wallet1 already claimed above — immediate retry must fail
    const { result } = simnet.callPublicFn(TOKEN, "faucet-claim", [], wallet1)
    expect(result).toStrictEqual(ERR_COOLDOWN)
  })

  it("reports non-zero cooldown remaining", () => {
    const { result } = simnet.callReadOnlyFn(
      TOKEN, "get-faucet-cooldown-remaining", [Cl.principal(wallet1)], wallet1
    )
    const remaining = Number((result as any).value.value)
    expect(remaining).toBeGreaterThan(0)
    expect(remaining).toBeLessThanOrEqual(COOLDOWN)
  })

  it("allows a second claim after COOLDOWN blocks have elapsed", () => {
    simnet.mineEmptyBlocks(COOLDOWN)
    const { result } = simnet.callPublicFn(TOKEN, "faucet-claim", [], wallet1)
    expect(result).toBeOk(Cl.uint(FAUCET))
    expect(balance(wallet1)).toBe(FAUCET * 2n)
  })
})

describe("transfer", () => {
  it("moves tokens from sender to recipient", () => {
    // Give wallet2 tokens first
    simnet.mineEmptyBlocks(COOLDOWN)
    simnet.callPublicFn(TOKEN, "faucet-claim", [], wallet2)

    const amount = 100_000_000n
    const { result } = simnet.callPublicFn(
      TOKEN, "transfer",
      [Cl.uint(amount), Cl.principal(wallet2), Cl.principal(wallet3), Cl.none()],
      wallet2
    )
    expect(result).toBeOk(Cl.bool(true))
    expect(balance(wallet3)).toBe(amount)
  })

  it("rejects when tx-sender does not match sender argument", () => {
    const { result } = simnet.callPublicFn(
      TOKEN, "transfer",
      [Cl.uint(1n), Cl.principal(wallet1), Cl.principal(wallet3), Cl.none()],
      wallet2
    )
    expect(result).toStrictEqual(ERR_NOT_AUTH)
  })

  it("rejects self-transfer", () => {
    const { result } = simnet.callPublicFn(
      TOKEN, "transfer",
      [Cl.uint(1n), Cl.principal(wallet2), Cl.principal(wallet2), Cl.none()],
      wallet2
    )
    expect(result).toStrictEqual(ERR_SAME)
  })

  it("rejects zero-amount transfer", () => {
    const { result } = simnet.callPublicFn(
      TOKEN, "transfer",
      [Cl.uint(0n), Cl.principal(wallet2), Cl.principal(wallet3), Cl.none()],
      wallet2
    )
    expect(result).toStrictEqual(ERR_AMOUNT)
  })
})

describe("mint", () => {
  it("deployer can mint tokens to any recipient", () => {
    const { result } = simnet.callPublicFn(
      TOKEN, "mint", [Cl.uint(5_000_000n), Cl.principal(wallet3)], deployer
    )
    expect(result).toBeOk(Cl.bool(true))
  })

  it("non-owner cannot mint", () => {
    const { result } = simnet.callPublicFn(
      TOKEN, "mint", [Cl.uint(1n), Cl.principal(wallet3)], wallet1
    )
    expect(result).toStrictEqual(ERR_NOT_AUTH)
  })

  it("deployer can batch-mint to multiple recipients", () => {
    const recipients = [
      Cl.tuple({ recipient: Cl.principal(wallet1), amount: Cl.uint(1_000n) }),
      Cl.tuple({ recipient: Cl.principal(wallet2), amount: Cl.uint(2_000n) }),
    ]
    const { result } = simnet.callPublicFn(TOKEN, "batch-mint", [Cl.list(recipients)], deployer)
    expect(result).toBeOk(Cl.list([Cl.ok(Cl.bool(true)), Cl.ok(Cl.bool(true))]))
  })
})

describe("mint toggle", () => {
  it("non-owner cannot disable mint", () => {
    const { result } = simnet.callPublicFn(TOKEN, "set-mint-enabled", [Cl.bool(false)], wallet1)
    expect(result).toStrictEqual(ERR_NOT_AUTH)
  })

  it("owner disables mint; faucet then fails with ERR-MINT-DISABLED", () => {
    simnet.callPublicFn(TOKEN, "set-mint-enabled", [Cl.bool(false)], deployer)
    simnet.mineEmptyBlocks(COOLDOWN + 1)
    const { result } = simnet.callPublicFn(TOKEN, "faucet-claim", [], wallet3)
    expect(result).toStrictEqual(ERR_DISABLED)
    // Re-enable for subsequent tests
    simnet.callPublicFn(TOKEN, "set-mint-enabled", [Cl.bool(true)], deployer)
  })
})

describe("gateway-release guard", () => {
  it("direct call from a wallet fails ERR-NOT-AUTHORIZED", () => {
    const { result } = simnet.callPublicFn(
      TOKEN, "gateway-release", [Cl.uint(1n), Cl.principal(wallet1)], wallet1
    )
    expect(result).toStrictEqual(ERR_NOT_AUTH)
  })

  it("get-vault-balance returns ok(uint)", () => {
    const { result } = simnet.callReadOnlyFn(TOKEN, "get-vault-balance", [], wallet1)
    // Type 7 = ResponseOkCV
    expect(result.type).toBe(7)
  })
})
