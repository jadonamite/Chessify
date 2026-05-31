/**
 * escrow.test.ts — chess-game.clar: wager locking and payouts
 *
 * Tests that tokens are correctly deposited into the vault on game creation /
 * join, and released to the correct recipients on win, draw, cancel.
 */
import { describe, expect, it } from "vitest"
import { Cl } from "@stacks/transactions"

const TOKEN = "chess-token-v3"
const GAME  = "chess-game"
const WAGER = 100_000_000n  // 100 CHESS

const accounts  = simnet.getAccounts()
const wallet1   = accounts.get("wallet_1")!
const wallet2   = accounts.get("wallet_2")!

function fund(addr: string) {
  simnet.mineEmptyBlocks(144)
  simnet.callPublicFn(TOKEN, "faucet-claim", [], addr)
}

function balance(addr: string): bigint {
  const { result } = simnet.callReadOnlyFn(TOKEN, "get-balance", [Cl.principal(addr)], addr)
  return BigInt((result as any).value.value)
}

function vaultBalance(): bigint {
  const { result } = simnet.callReadOnlyFn(TOKEN, "get-vault-balance", [], wallet1)
  return BigInt((result as any).value.value)
}

describe("wager locking — create-game", () => {
  it("vault increases by wager after create-game", () => {
    fund(wallet1)
    const vaultBefore = vaultBalance()
    simnet.callPublicFn(GAME, "create-game", [Cl.uint(WAGER)], wallet1)
    expect(vaultBalance()).toBe(vaultBefore + WAGER)
  })

  it("creator balance decreases by wager", () => {
    // wallet1 already claimed 1000 CHESS; after paying WAGER it should have 900
    expect(balance(wallet1)).toBe(1_000_000_000n - WAGER)
  })
})

describe("wager locking — join-game", () => {
  it("vault doubles after opponent joins", () => {
    fund(wallet2)
    // Game 0 was created by wallet1 above
    const vaultBefore = vaultBalance()
    simnet.callPublicFn(GAME, "join-game", [Cl.uint(0)], wallet2)
    expect(vaultBalance()).toBe(vaultBefore + WAGER)
  })
})

describe("payout — report-win (checkmate)", () => {
  it("winner receives total pot; vault empties", () => {
    const w1before = balance(wallet1)
    const vaultBefore = vaultBalance()

    simnet.callPublicFn(GAME, "report-win", [Cl.uint(0)], wallet1)

    // wallet1 should receive 2x wager
    expect(balance(wallet1)).toBe(w1before + WAGER * 2n)
    expect(vaultBalance()).toBe(vaultBefore - WAGER * 2n)
  })
})

describe("payout — cancel-game (before join)", () => {
  it("creator is fully refunded on cancel", () => {
    fund(wallet1)
    const { result } = simnet.callPublicFn(GAME, "create-game", [Cl.uint(WAGER)], wallet1)
    const gameId = Number((result as any).value.value)
    const w1after_create = balance(wallet1)

    simnet.callPublicFn(GAME, "cancel-game", [Cl.uint(gameId)], wallet1)

    expect(balance(wallet1)).toBe(w1after_create + WAGER)
  })

  it("cancelled game has CANCELLED status (3)", () => {
    const { result } = simnet.callPublicFn(GAME, "create-game", [Cl.uint(0)], wallet1)
    const gameId = Number((result as any).value.value)
    simnet.callPublicFn(GAME, "cancel-game", [Cl.uint(gameId)], wallet1)
    const { result: status } = simnet.callReadOnlyFn(GAME, "get-game-status", [Cl.uint(gameId)], wallet1)
    expect(status).toBeOk(Cl.uint(3))
  })
})

describe("payout — accept-draw", () => {
  it("both players refunded; vault empties", () => {
    fund(wallet1); fund(wallet2)
    const { result } = simnet.callPublicFn(GAME, "create-game", [Cl.uint(WAGER)], wallet1)
    const gameId = Number((result as any).value.value)
    simnet.callPublicFn(GAME, "join-game", [Cl.uint(gameId)], wallet2)

    const w1before = balance(wallet1)
    const w2before = balance(wallet2)
    const vaultBefore = vaultBalance()

    simnet.callPublicFn(GAME, "propose-draw", [Cl.uint(gameId)], wallet1)
    simnet.callPublicFn(GAME, "accept-draw", [Cl.uint(gameId)], wallet2)

    expect(balance(wallet1)).toBe(w1before + WAGER)
    expect(balance(wallet2)).toBe(w2before + WAGER)
    expect(vaultBalance()).toBe(vaultBefore - WAGER * 2n)
  })

  it("draw game has DRAW status (4)", () => {
    fund(wallet1); fund(wallet2)
    const { result } = simnet.callPublicFn(GAME, "create-game", [Cl.uint(0)], wallet1)
    const gameId = Number((result as any).value.value)
    simnet.callPublicFn(GAME, "join-game", [Cl.uint(gameId)], wallet2)
    simnet.callPublicFn(GAME, "propose-draw", [Cl.uint(gameId)], wallet1)
    simnet.callPublicFn(GAME, "accept-draw", [Cl.uint(gameId)], wallet2)

    const { result: status } = simnet.callReadOnlyFn(GAME, "get-game-status", [Cl.uint(gameId)], wallet1)
    expect(status).toBeOk(Cl.uint(4))
  })
})
