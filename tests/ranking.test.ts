/**
 * ranking.test.ts — chess-game.clar: Elo rating system
 *
 * Verifies the integer Elo formula: K=32, diff cap 400, min rating 100.
 * Calculations mirror the Solidity _updateElo() exactly.
 */
import { describe, expect, it } from "vitest"
import { Cl } from "@stacks/transactions"

const GAME = "chess-game"

const accounts = simnet.getAccounts()
const wallet1  = accounts.get("wallet_1")!
const wallet2  = accounts.get("wallet_2")!
const wallet3  = accounts.get("wallet_3")!

function stats(addr: string) {
  const { result } = simnet.callReadOnlyFn(GAME, "get-player-stats", [Cl.principal(addr)], addr)
  return (result as any).value
}

function rating(addr: string): number {
  return Number(stats(addr).value.rating.value)
}

function playGame(white: string, black: string, winner: "white" | "black") {
  const { result } = simnet.callPublicFn(GAME, "create-game", [Cl.uint(0)], white)
  const gameId = Number((result as any).value.value)
  simnet.callPublicFn(GAME, "join-game", [Cl.uint(gameId)], black)
  const winnerAddr = winner === "white" ? white : black
  simnet.callPublicFn(GAME, "report-win", [Cl.uint(gameId)], winnerAddr)
  return gameId
}

describe("Elo — equal ratings (both start at 1200)", () => {
  // K=32, diff=0, winner treated as favoured (1200 >= 1200):
  // winner_change = 32*(400-0)/800 = 16
  // loser_change  = 32*(400+0)/800 = 16

  it("winner gains 16 pts, loser loses 16 when both start at 1200", () => {
    playGame(wallet1, wallet2, "white")
    expect(rating(wallet1)).toBe(1216)
    expect(rating(wallet2)).toBe(1184)
  })

  it("get-rating read-only agrees with get-player-stats", () => {
    const { result } = simnet.callReadOnlyFn(GAME, "get-rating", [Cl.principal(wallet1)], wallet1)
    expect(result).toBeOk(Cl.uint(1216))
  })

  it("games-played and wins/losses are tracked", () => {
    const s = stats(wallet1).value
    expect(Number(s.wins.value)).toBe(1)
    expect(Number(s.losses.value)).toBe(0)
    expect(Number(s["games-played"].value)).toBe(1)
  })
})

describe("Elo — underdog wins (lower rated beats higher rated)", () => {
  // wallet1=1216, wallet2=1184. wallet2 (lower) wins:
  // underdog branch: diff = min(400, 1216-1184) = 32
  // winner_change = 32*(400+32)/800 = 32*432/800 = 17  (integer)
  // loser_change  = 32*(400-32)/800 = 32*368/800 = 14

  it("underdog gains more Elo than favourite loses", () => {
    const r1before = rating(wallet1)
    const r2before = rating(wallet2)

    playGame(wallet1, wallet2, "black") // wallet2 (lower rated) wins

    const gain = rating(wallet2) - r2before
    const loss = r1before - rating(wallet1)

    expect(gain).toBe(17)
    expect(loss).toBe(14)
    expect(gain).toBeGreaterThan(loss)
  })
})

describe("Elo — minimum rating floor of 100", () => {
  it("loser rating never drops below 100 regardless of loss streak", () => {
    for (let i = 0; i < 40; i++) {
      playGame(wallet1, wallet3, "white")
    }
    expect(rating(wallet3)).toBeGreaterThanOrEqual(100)
  })
})

describe("Elo — draws do not change ratings", () => {
  it("Elo is unchanged after a drawn game", () => {
    const r1before = rating(wallet1)
    const r2before = rating(wallet2)

    const { result } = simnet.callPublicFn(GAME, "create-game", [Cl.uint(0)], wallet1)
    const gameId = Number((result as any).value.value)
    simnet.callPublicFn(GAME, "join-game", [Cl.uint(gameId)], wallet2)
    simnet.callPublicFn(GAME, "propose-draw", [Cl.uint(gameId)], wallet1)
    simnet.callPublicFn(GAME, "accept-draw", [Cl.uint(gameId)], wallet2)

    expect(rating(wallet1)).toBe(r1before)
    expect(rating(wallet2)).toBe(r2before)
  })

  it("draw stat increments for both players", () => {
    const s1 = stats(wallet1).value
    const s2 = stats(wallet2).value
    expect(Number(s1.draws.value)).toBeGreaterThanOrEqual(1)
    expect(Number(s2.draws.value)).toBeGreaterThanOrEqual(1)
  })
})
