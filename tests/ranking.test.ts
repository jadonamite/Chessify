/**
 * ranking.test.ts — chess-game.clar: Elo rating system
 *
 * K=32, diff cap 400, min rating 100. All tests self-contained.
 */
import { describe, expect, it } from "vitest"
import { Cl } from "@stacks/transactions"

const GAME = "chess-game"

const accounts = simnet.getAccounts()
const wallet1  = accounts.get("wallet_1")!
const wallet2  = accounts.get("wallet_2")!
const wallet3  = accounts.get("wallet_3")!

function rating(addr: string): number {
  const { result } = simnet.callReadOnlyFn(GAME, "get-rating", [Cl.principal(addr)], addr)
  return Number((result as any).value.value)
}

function playGame(white: string, black: string, winner: "white" | "black") {
  const { result } = simnet.callPublicFn(GAME, "create-game", [Cl.uint(0)], white)
  const id = Number((result as any).value.value)
  simnet.callPublicFn(GAME, "join-game", [Cl.uint(id)], black)
  simnet.callPublicFn(GAME, "report-win", [Cl.uint(id)], winner === "white" ? white : black)
}

describe("Elo — equal ratings (both start at 1200)", () => {
  // K=32, diff=0, winner is favoured (1200 >= 1200):
  // winner_change = 32*(400-0)/800 = 16
  // loser_change  = 32*(400+0)/800 = 16

  it("winner gains 16, loser loses 16 when ratings are equal", () => {
    playGame(wallet1, wallet2, "white")
    expect(rating(wallet1)).toBe(1216)
    expect(rating(wallet2)).toBe(1184)
  })

  it("get-rating and get-player-stats.rating agree", () => {
    playGame(wallet1, wallet2, "white")
    const { result: full } = simnet.callReadOnlyFn(
      GAME, "get-player-stats", [Cl.principal(wallet1)], wallet1
    )
    const ratingFromStats = Number((full as any).value.value.rating.value)
    expect(rating(wallet1)).toBe(ratingFromStats)
  })

  it("wins, losses, and games-played update after a win", () => {
    playGame(wallet1, wallet2, "white")
    const { result } = simnet.callReadOnlyFn(GAME, "get-player-stats", [Cl.principal(wallet1)], wallet1)
    const s = (result as any).value.value
    expect(Number(s.wins.value)).toBe(1)
    expect(Number(s.losses.value)).toBe(0)
    expect(Number(s["games-played"].value)).toBe(1)
  })
})

describe("Elo — underdog wins (lower rated beats higher rated)", () => {
  // We need wallet2 to start lower-rated. Build this by having wallet2 lose twice first,
  // then play as wallet1 white winner to raise wallet1, then reverse.
  // Simpler: play 2 games first to establish different ratings, then play the underdog game.

  it("underdog winner gains more than equal-rated winner", () => {
    // Game 1: wallet1 beats wallet2 → w1=1216, w2=1184
    playGame(wallet1, wallet2, "white")
    const r1 = rating(wallet1) // 1216
    const r2 = rating(wallet2) // 1184

    // Game 2: wallet2 (lower) beats wallet1 (higher) → underdog wins
    // diff = min(400, 1216-1184) = 32
    // winner_change = 32*(400+32)/800 = 17
    // loser_change  = 32*(400-32)/800 = 14
    playGame(wallet1, wallet2, "black")

    expect(rating(wallet2) - r2).toBe(17) // underdog gain
    expect(r1 - rating(wallet1)).toBe(14)  // favourite loss
  })

  it("underdog gains more points than the equivalent win at equal ratings", () => {
    // Equal-rating win yields 16 pts. Underdog win yields >16 pts.
    playGame(wallet1, wallet2, "white")  // establishes rating gap
    const r2before = rating(wallet2)
    playGame(wallet1, wallet2, "black")  // underdog (wallet2) wins
    const underdogGain = rating(wallet2) - r2before
    expect(underdogGain).toBeGreaterThan(16)
  })
})

describe("Elo — minimum rating floor of 100", () => {
  it("loser rating never drops below 100 after many consecutive losses", () => {
    for (let i = 0; i < 40; i++) {
      playGame(wallet1, wallet3, "white")
    }
    expect(rating(wallet3)).toBeGreaterThanOrEqual(100)
  })
})

describe("Elo — draws", () => {
  it("ratings are unchanged and draw counts increment after agreed draw", () => {
    // Ratings start at 1200; play one game first to register stats
    playGame(wallet1, wallet2, "white") // w1=1216, w2=1184
    const r1 = rating(wallet1)
    const r2 = rating(wallet2)

    // Now draw
    const { result } = simnet.callPublicFn(GAME, "create-game", [Cl.uint(0)], wallet1)
    const id = Number((result as any).value.value)
    simnet.callPublicFn(GAME, "join-game", [Cl.uint(id)], wallet2)
    simnet.callPublicFn(GAME, "propose-draw", [Cl.uint(id)], wallet1)
    simnet.callPublicFn(GAME, "accept-draw", [Cl.uint(id)], wallet2)

    expect(rating(wallet1)).toBe(r1) // unchanged
    expect(rating(wallet2)).toBe(r2) // unchanged

    const { result: s1 } = simnet.callReadOnlyFn(GAME, "get-player-stats", [Cl.principal(wallet1)], wallet1)
    expect(Number((s1 as any).value.value.draws.value)).toBeGreaterThanOrEqual(1)
  })
})
