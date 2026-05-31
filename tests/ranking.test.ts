/**
 * ranking.test.ts — chess-game.clar: Elo rating system
 *
 * K=32, diff cap 400, min rating 100. Mirrors Solidity _updateElo() exactly.
 */
import { describe, expect, it, beforeAll } from "vitest"
import { Cl } from "@stacks/transactions"

const GAME = "chess-game"

const accounts = simnet.getAccounts()
const wallet1  = accounts.get("wallet_1")!
const wallet2  = accounts.get("wallet_2")!
const wallet3  = accounts.get("wallet_3")!

beforeAll(() => { simnet.mineEmptyBlocks(144) })

function rating(addr: string): number {
  const { result } = simnet.callReadOnlyFn(GAME, "get-rating", [Cl.principal(addr)], addr)
  return Number((result as any).value.value)
}

function stats(addr: string) {
  const { result } = simnet.callReadOnlyFn(GAME, "get-player-stats", [Cl.principal(addr)], addr)
  return (result as any).value.value
}

function nextId(): number {
  const { result } = simnet.callReadOnlyFn(GAME, "get-total-games", [], wallet1)
  return Number((result as any).value.value)
}

function playGame(white: string, black: string, winner: "white" | "black") {
  const id = nextId()
  simnet.callPublicFn(GAME, "create-game", [Cl.uint(0)], white)
  simnet.callPublicFn(GAME, "join-game", [Cl.uint(id)], black)
  const winnerAddr = winner === "white" ? white : black
  simnet.callPublicFn(GAME, "report-win", [Cl.uint(id)], winnerAddr)
  return id
}

describe("Elo — equal ratings (both start at 1200)", () => {
  // K=32, diff=0, wallet1 is favoured (1200 >= 1200):
  // winner_change = 32*(400-0)/800 = 16
  // loser_change  = 32*(400+0)/800 = 16

  it("winner gains 16, loser loses 16 when both start at 1200", () => {
    playGame(wallet1, wallet2, "white")
    expect(rating(wallet1)).toBe(1216)
    expect(rating(wallet2)).toBe(1184)
  })

  it("get-rating matches the rating field in get-player-stats", () => {
    const { result } = simnet.callReadOnlyFn(GAME, "get-rating", [Cl.principal(wallet1)], wallet1)
    expect(result).toBeOk(Cl.uint(1216))
  })

  it("wins, losses, and games-played are tracked correctly", () => {
    const s = stats(wallet1)
    expect(Number(s.wins.value)).toBe(1)
    expect(Number(s.losses.value)).toBe(0)
    expect(Number(s["games-played"].value)).toBe(1)
  })
})

describe("Elo — underdog wins (lower rated beats higher rated)", () => {
  // wallet1=1216, wallet2=1184 → wallet2 wins as underdog
  // diff = min(400, 1216-1184) = 32
  // winner_change = 32*(400+32)/800 = 32*432/800 = 17
  // loser_change  = 32*(400-32)/800 = 32*368/800 = 14

  it("underdog gains 17 pts, favourite loses 14 pts", () => {
    const r1before = rating(wallet1)
    const r2before = rating(wallet2)

    playGame(wallet1, wallet2, "black") // wallet2 (lower) wins

    expect(rating(wallet2) - r2before).toBe(17)
    expect(r1before - rating(wallet1)).toBe(14)
  })
})

describe("Elo — minimum rating floor of 100", () => {
  it("rating never drops below 100 after many consecutive losses", () => {
    // Drive wallet3 into the floor via 40 losses
    for (let i = 0; i < 40; i++) {
      playGame(wallet1, wallet3, "white")
    }
    expect(rating(wallet3)).toBeGreaterThanOrEqual(100)
  })
})

describe("Elo — draws do not change ratings", () => {
  it("both ratings are unchanged after an agreed draw", () => {
    const r1before = rating(wallet1)
    const r2before = rating(wallet2)

    const id = nextId()
    simnet.callPublicFn(GAME, "create-game", [Cl.uint(0)], wallet1)
    simnet.callPublicFn(GAME, "join-game", [Cl.uint(id)], wallet2)
    simnet.callPublicFn(GAME, "propose-draw", [Cl.uint(id)], wallet1)
    simnet.callPublicFn(GAME, "accept-draw", [Cl.uint(id)], wallet2)

    expect(rating(wallet1)).toBe(r1before)
    expect(rating(wallet2)).toBe(r2before)
  })

  it("draw count increments for both players", () => {
    expect(Number(stats(wallet1).draws.value)).toBeGreaterThanOrEqual(1)
    expect(Number(stats(wallet2).draws.value)).toBeGreaterThanOrEqual(1)
  })
})
