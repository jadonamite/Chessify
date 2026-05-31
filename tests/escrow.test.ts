/**
 * escrow.test.ts — chess-game.clar: wager locking and payouts
 */
import { describe, expect, it, beforeAll } from "vitest"
import { Cl } from "@stacks/transactions"

const TOKEN = "chess-token-v3"
const GAME  = "chess-game"
const WAGER = 100_000_000n // 100 CHESS

const accounts = simnet.getAccounts()
const wallet1  = accounts.get("wallet_1")!
const wallet2  = accounts.get("wallet_2")!

beforeAll(() => {
  simnet.mineEmptyBlocks(144)
  simnet.callPublicFn(TOKEN, "faucet-claim", [], wallet1)
  simnet.callPublicFn(TOKEN, "faucet-claim", [], wallet2)
})

function balance(addr: string): bigint {
  const { result } = simnet.callReadOnlyFn(TOKEN, "get-balance", [Cl.principal(addr)], addr)
  return BigInt((result as any).value.value)
}

function vaultBalance(): bigint {
  const { result } = simnet.callReadOnlyFn(TOKEN, "get-vault-balance", [], wallet1)
  return BigInt((result as any).value.value)
}

function nextId(): number {
  const { result } = simnet.callReadOnlyFn(GAME, "get-total-games", [], wallet1)
  return Number((result as any).value.value)
}

describe("create-game with wager", () => {
  it("vault increases by wager; creator balance decreases by wager", () => {
    const w1before  = balance(wallet1)
    const vbefore   = vaultBalance()

    const id = nextId()
    simnet.callPublicFn(GAME, "create-game", [Cl.uint(WAGER)], wallet1)

    expect(vaultBalance()).toBe(vbefore + WAGER)
    expect(balance(wallet1)).toBe(w1before - WAGER)

    // join to activate for next tests in file
    simnet.callPublicFn(GAME, "join-game", [Cl.uint(id)], wallet2)
  })
})

describe("join-game with wager", () => {
  it("vault doubles when opponent locks matching wager", () => {
    // Both wallets need tokens — reclaim if needed
    simnet.mineEmptyBlocks(144)
    simnet.callPublicFn(TOKEN, "faucet-claim", [], wallet1)
    simnet.callPublicFn(TOKEN, "faucet-claim", [], wallet2)

    const id = nextId()
    simnet.callPublicFn(GAME, "create-game", [Cl.uint(WAGER)], wallet1)
    const vaultAfterCreate = vaultBalance()
    const w2before = balance(wallet2)

    simnet.callPublicFn(GAME, "join-game", [Cl.uint(id)], wallet2)

    expect(vaultBalance()).toBe(vaultAfterCreate + WAGER)
    expect(balance(wallet2)).toBe(w2before - WAGER)
  })
})

describe("payout — report-win", () => {
  it("winner gets total pot (2x wager); vault decreases by 2x wager", () => {
    simnet.mineEmptyBlocks(144)
    simnet.callPublicFn(TOKEN, "faucet-claim", [], wallet1)
    simnet.callPublicFn(TOKEN, "faucet-claim", [], wallet2)

    const id = nextId()
    simnet.callPublicFn(GAME, "create-game", [Cl.uint(WAGER)], wallet1)
    simnet.callPublicFn(GAME, "join-game", [Cl.uint(id)], wallet2)

    const w1before    = balance(wallet1)
    const vaultBefore = vaultBalance()

    simnet.callPublicFn(GAME, "report-win", [Cl.uint(id)], wallet1)

    expect(balance(wallet1)).toBe(w1before + WAGER * 2n)
    expect(vaultBalance()).toBe(vaultBefore - WAGER * 2n)
  })
})

describe("payout — cancel-game", () => {
  it("creator is fully refunded when they cancel before anyone joins", () => {
    simnet.mineEmptyBlocks(144)
    simnet.callPublicFn(TOKEN, "faucet-claim", [], wallet1)

    const id = nextId()
    simnet.callPublicFn(GAME, "create-game", [Cl.uint(WAGER)], wallet1)
    const w1afterCreate = balance(wallet1)

    simnet.callPublicFn(GAME, "cancel-game", [Cl.uint(id)], wallet1)

    expect(balance(wallet1)).toBe(w1afterCreate + WAGER)

    const { result: status } = simnet.callReadOnlyFn(GAME, "get-game-status", [Cl.uint(id)], wallet1)
    expect(status).toBeOk(Cl.uint(3)) // CANCELLED
  })
})

describe("payout — accept-draw", () => {
  it("both players are individually refunded; vault decreases by 2x wager", () => {
    simnet.mineEmptyBlocks(144)
    simnet.callPublicFn(TOKEN, "faucet-claim", [], wallet1)
    simnet.callPublicFn(TOKEN, "faucet-claim", [], wallet2)

    const id = nextId()
    simnet.callPublicFn(GAME, "create-game", [Cl.uint(WAGER)], wallet1)
    simnet.callPublicFn(GAME, "join-game", [Cl.uint(id)], wallet2)

    const w1before    = balance(wallet1)
    const w2before    = balance(wallet2)
    const vaultBefore = vaultBalance()

    simnet.callPublicFn(GAME, "propose-draw", [Cl.uint(id)], wallet1)
    simnet.callPublicFn(GAME, "accept-draw", [Cl.uint(id)], wallet2)

    expect(balance(wallet1)).toBe(w1before + WAGER)
    expect(balance(wallet2)).toBe(w2before + WAGER)
    expect(vaultBalance()).toBe(vaultBefore - WAGER * 2n)

    const { result: status } = simnet.callReadOnlyFn(GAME, "get-game-status", [Cl.uint(id)], wallet1)
    expect(status).toBeOk(Cl.uint(4)) // DRAW
  })
})
