import { describe, expect, it, beforeAll } from "vitest"
import { Cl } from "@stacks/transactions"

// ── Constants (mirrors chess-token-v3.clar) ──────────────────────────────────
const TOKEN    = "chess-token-v3"
const FAUCET   = 1_000_000_000n // 1 000 CHESS (6 decimals)
const COOLDOWN = 144            // blocks

const ERR_NOT_AUTH  = Cl.error(Cl.uint(100))
const ERR_DISABLED  = Cl.error(Cl.uint(101))
const ERR_AMOUNT    = Cl.error(Cl.uint(102))
const ERR_COOLDOWN  = Cl.error(Cl.uint(105))
const ERR_SAME      = Cl.error(Cl.uint(106))

// ── Accounts ─────────────────────────────────────────────────────────────────
const accounts  = simnet.getAccounts()
const deployer  = accounts.get("deployer")!
const wallet1   = accounts.get("wallet_1")!
const wallet2   = accounts.get("wallet_2")!
const wallet3   = accounts.get("wallet_3")!

// ── Helpers ──────────────────────────────────────────────────────────────────
function balanceOf(addr: string) {
  const { result } = simnet.callReadOnlyFn(TOKEN, "get-balance", [Cl.principal(addr)], addr)
  return result
}

// ── Faucet ───────────────────────────────────────────────────────────────────
describe("faucet-claim", () => {
  it("claims 1 000 CHESS on first call", () => {
    const { result } = simnet.callPublicFn(TOKEN, "faucet-claim", [], wallet1)
    expect(result).toBeOk(Cl.uint(FAUCET))
  })

  it("credits the caller's balance", () => {
    expect(balanceOf(wallet1)).toBeOk(Cl.uint(FAUCET))
  })

  it("rejects a second claim before cooldown elapses", () => {
    const { result } = simnet.callPublicFn(TOKEN, "faucet-claim", [], wallet1)
    expect(result).toStrictEqual(ERR_COOLDOWN)
  })

  it("reports non-zero cooldown remaining while locked", () => {
    const { result } = simnet.callReadOnlyFn(
      TOKEN, "get-faucet-cooldown-remaining", [Cl.principal(wallet1)], wallet1
    )
    expect(result).toBeOk(Cl.uint(COOLDOWN - 1)) // 1 block mined so far
  })

  it("allows claim again after COOLDOWN blocks", () => {
    simnet.mineEmptyBlocks(COOLDOWN)
    const { result } = simnet.callPublicFn(TOKEN, "faucet-claim", [], wallet1)
    expect(result).toBeOk(Cl.uint(FAUCET))
    // wallet1 now holds 2 000 CHESS
    expect(balanceOf(wallet1)).toBeOk(Cl.uint(FAUCET * 2n))
  })

  it("reports 0 cooldown when eligible", () => {
    simnet.mineEmptyBlocks(COOLDOWN)
    const { result } = simnet.callReadOnlyFn(
      TOKEN, "get-faucet-cooldown-remaining", [Cl.principal(wallet2)], wallet2
    )
    expect(result).toBeOk(Cl.uint(0))
  })
})

// ── Transfer ─────────────────────────────────────────────────────────────────
describe("transfer", () => {
  beforeAll(() => {
    // Ensure wallet2 has tokens
    simnet.callPublicFn(TOKEN, "faucet-claim", [], wallet2)
  })

  it("moves tokens from sender to recipient", () => {
    const amount = 100_000_000n // 100 CHESS
    const { result } = simnet.callPublicFn(
      TOKEN, "transfer",
      [Cl.uint(amount), Cl.principal(wallet2), Cl.principal(wallet3), Cl.none()],
      wallet2
    )
    expect(result).toBeOk(Cl.bool(true))
    expect(balanceOf(wallet3)).toBeOk(Cl.uint(amount))
  })

  it("rejects when tx-sender ≠ sender argument", () => {
    const { result } = simnet.callPublicFn(
      TOKEN, "transfer",
      [Cl.uint(1n), Cl.principal(wallet1), Cl.principal(wallet3), Cl.none()],
      wallet2 // wallet2 is calling but listing wallet1 as sender
    )
    expect(result).toStrictEqual(ERR_NOT_AUTH)
  })

  it("rejects transfer to self", () => {
    const { result } = simnet.callPublicFn(
      TOKEN, "transfer",
      [Cl.uint(1n), Cl.principal(wallet2), Cl.principal(wallet2), Cl.none()],
      wallet2
    )
    expect(result).toStrictEqual(ERR_SAME)
  })

  it("rejects zero amount", () => {
    const { result } = simnet.callPublicFn(
      TOKEN, "transfer",
      [Cl.uint(0n), Cl.principal(wallet2), Cl.principal(wallet3), Cl.none()],
      wallet2
    )
    expect(result).toStrictEqual(ERR_AMOUNT)
  })
})

// ── Mint ─────────────────────────────────────────────────────────────────────
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

  it("deployer can batch-mint to up to 10 recipients", () => {
    const recipients = [
      Cl.tuple({ recipient: Cl.principal(wallet1), amount: Cl.uint(1_000n) }),
      Cl.tuple({ recipient: Cl.principal(wallet2), amount: Cl.uint(2_000n) }),
    ]
    const { result } = simnet.callPublicFn(TOKEN, "batch-mint", [Cl.list(recipients)], deployer)
    expect(result).toBeOk(Cl.list([Cl.ok(Cl.bool(true)), Cl.ok(Cl.bool(true))]))
  })
})

// ── Mint toggle ───────────────────────────────────────────────────────────────
describe("set-mint-enabled", () => {
  it("non-owner cannot toggle mint", () => {
    const { result } = simnet.callPublicFn(TOKEN, "set-mint-enabled", [Cl.bool(false)], wallet1)
    expect(result).toStrictEqual(ERR_NOT_AUTH)
  })

  it("owner disables mint; faucet then fails", () => {
    simnet.callPublicFn(TOKEN, "set-mint-enabled", [Cl.bool(false)], deployer)
    // Advance past cooldown so wallet3 would otherwise be eligible
    simnet.mineEmptyBlocks(COOLDOWN + 1)
    const { result } = simnet.callPublicFn(TOKEN, "faucet-claim", [], wallet3)
    expect(result).toStrictEqual(ERR_DISABLED)
  })

  it("owner re-enables mint; faucet works again", () => {
    simnet.callPublicFn(TOKEN, "set-mint-enabled", [Cl.bool(true)], deployer)
    const { result } = simnet.callPublicFn(TOKEN, "faucet-claim", [], wallet3)
    expect(result).toBeOk(Cl.uint(FAUCET))
  })
})

// ── Vault / gateway-release ──────────────────────────────────────────────────
describe("gateway-release", () => {
  it("get-vault-balance returns a uint", () => {
    const { result } = simnet.callReadOnlyFn(TOKEN, "get-vault-balance", [], wallet1)
    // We just check it returns ok(uint) — exact value depends on prior tests
    expect(result.type).toBe(7) // ResponseOkCV = 7
  })

  it("direct call from a wallet fails ERR-NOT-AUTHORIZED", () => {
    const { result } = simnet.callPublicFn(
      TOKEN, "gateway-release", [Cl.uint(1n), Cl.principal(wallet1)], wallet1
    )
    expect(result).toStrictEqual(ERR_NOT_AUTH)
  })
})
