/**
 * escrow.test.ts — chess-game.clar: wager locking and payouts
 * Uses deployer.mint() to seed tokens (no block-height restriction).
 */
import { describe, expect, it } from "vitest"
import { Cl } from "@stacks/transactions"

const TOKEN = "chess-token-v3"
const GAME  = "chess-game"
const WAGER = 100_000_000n // 100 CHESS

const accounts = simnet.getAccounts()
const deployer = accounts.get("deployer")!
const wallet1  = accounts.get("wallet_1")!
const wallet2  = accounts.get("wallet_2")!

function seed(addr: string, amount = 1_000_000_000n) {
  simnet.callPublicFn(TOKEN, "mint", [Cl.uint(amount), Cl.principal(addr)], deployer)
}

function balance(addr: string): bigint {
  const { result } = simnet.callReadOnlyFn(TOKEN, "get-balance", [Cl.principal(addr)], addr)
  return BigInt((result as any).value.value)
}

function vaultBalance(): bigint {
  const { result } = simnet.callReadOnlyFn(TOKEN, "get-vault-balance", [], wallet1)
  return BigInt((result as any).value.value)
}

describe("create-game with wager", () => {
  it("vault increases by wager; creator balance decreases by wager", () => {
    seed(wallet1)
    const w1before = balance(wallet1)

    simnet.callPublicFn(GAME, "create-game", [Cl.uint(WAGER)], wallet1)

    expect(vaultBalance()).toBe(WAGER)
    expect(balance(wallet1)).toBe(w1before - WAGER)
  })
})

describe("join-game with wager", () => {
  it("vault doubles when both players lock their wager", () => {
    seed(wallet1); seed(wallet2)
    simnet.callPublicFn(GAME, "create-game", [Cl.uint(WAGER)], wallet1)
    const vaultAfterCreate = vaultBalance()
    const w2before = balance(wallet2)

    simnet.callPublicFn(GAME, "join-game", [Cl.uint(0)], wallet2)

    expect(vaultBalance()).toBe(vaultAfterCreate + WAGER)
    expect(balance(wallet2)).toBe(w2before - WAGER)
  })
})

describe("payout — report-win", () => {
  it("winner receives total pot (2× wager); vault empties", () => {
    seed(wallet1); seed(wallet2)
    simnet.callPublicFn(GAME, "create-game", [Cl.uint(WAGER)], wallet1)
    simnet.callPublicFn(GAME, "join-game", [Cl.uint(0)], wallet2)

    const w1before    = balance(wallet1)
    const vaultBefore = vaultBalance()

    simnet.callPublicFn(GAME, "report-win", [Cl.uint(0)], wallet1)

    expect(balance(wallet1)).toBe(w1before + WAGER * 2n)
    expect(vaultBalance()).toBe(vaultBefore - WAGER * 2n)
  })
})

describe("payout — cancel-game", () => {
  it("creator is fully refunded when they cancel before anyone joins", () => {
    seed(wallet1)
    simnet.callPublicFn(GAME, "create-game", [Cl.uint(WAGER)], wallet1)
    const w1afterCreate = balance(wallet1)

    simnet.callPublicFn(GAME, "cancel-game", [Cl.uint(0)], wallet1)

    expect(balance(wallet1)).toBe(w1afterCreate + WAGER)

    const { result: status } = simnet.callReadOnlyFn(GAME, "get-game-status", [Cl.uint(0)], wallet1)
    expect(status).toBeOk(Cl.uint(3)) // CANCELLED
  })
})

describe("payout — accept-draw", () => {
  it("both players refunded their individual wager; vault empties", () => {
    seed(wallet1); seed(wallet2)
    simnet.callPublicFn(GAME, "create-game", [Cl.uint(WAGER)], wallet1)
    simnet.callPublicFn(GAME, "join-game", [Cl.uint(0)], wallet2)

    const w1before    = balance(wallet1)
    const w2before    = balance(wallet2)
    const vaultBefore = vaultBalance()

    simnet.callPublicFn(GAME, "propose-draw", [Cl.uint(0)], wallet1)
    simnet.callPublicFn(GAME, "accept-draw", [Cl.uint(0)], wallet2)

    expect(balance(wallet1)).toBe(w1before + WAGER)
    expect(balance(wallet2)).toBe(w2before + WAGER)
    expect(vaultBalance()).toBe(vaultBefore - WAGER * 2n)

    const { result: status } = simnet.callReadOnlyFn(GAME, "get-game-status", [Cl.uint(0)], wallet1)
    expect(status).toBeOk(Cl.uint(4)) // DRAW
  })
})
