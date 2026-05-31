/**
 * logic.test.ts — chess-game.clar: submit-move
 *
 * Tests turn flipping, move-count increment, draw-proposal clearing,
 * and all guards that reject illegal calls.
 */
import { describe, expect, it } from "vitest"
import { Cl } from "@stacks/transactions"

const GAME = "chess-game"

const ERR_NOT_ACTIVE = Cl.error(Cl.uint(705))
const ERR_NOT_TURN   = Cl.error(Cl.uint(702))

const accounts = simnet.getAccounts()
const wallet1  = accounts.get("wallet_1")!
const wallet2  = accounts.get("wallet_2")!
const wallet3  = accounts.get("wallet_3")!

// ── Setup: create game 0 (wallet1 vs wallet2) and make it ACTIVE ─────────────
function setupActiveGame(): number {
  const { result } = simnet.callPublicFn(GAME, "create-game", [Cl.uint(0)], wallet1)
  const gameId = Number((result as any).value.value)
  simnet.callPublicFn(GAME, "join-game", [Cl.uint(gameId)], wallet2)
  return gameId
}

describe("submit-move", () => {
  let gameId: number

  it("cannot submit-move on a WAITING game", () => {
    const { result: create } = simnet.callPublicFn(GAME, "create-game", [Cl.uint(0)], wallet1)
    const waitingId = Number((create as any).value.value)
    const { result } = simnet.callPublicFn(GAME, "submit-move", [Cl.uint(waitingId)], wallet1)
    expect(result).toStrictEqual(ERR_NOT_ACTIVE)
    // Join to make it active for next tests
    simnet.callPublicFn(GAME, "join-game", [Cl.uint(waitingId)], wallet2)
    gameId = waitingId
  })

  it("white (creator) can submit the first move", () => {
    const { result } = simnet.callPublicFn(GAME, "submit-move", [Cl.uint(gameId)], wallet1)
    expect(result).toBeOk(Cl.bool(true))
  })

  it("turn flipped to black after white's move", () => {
    const { result } = simnet.callReadOnlyFn(GAME, "get-current-turn", [Cl.uint(gameId)], wallet1)
    expect(result).toBeOk(Cl.principal(wallet2))
  })

  it("move-count is 1 after one move", () => {
    const { result } = simnet.callReadOnlyFn(GAME, "get-game", [Cl.uint(gameId)], wallet1)
    const gameData = (result as any).value.value
    expect(gameData.value["move-count"]).toStrictEqual(Cl.uint(1))
  })

  it("white cannot move again — wrong turn", () => {
    const { result } = simnet.callPublicFn(GAME, "submit-move", [Cl.uint(gameId)], wallet1)
    expect(result).toStrictEqual(ERR_NOT_TURN)
  })

  it("third party cannot submit a move", () => {
    const { result } = simnet.callPublicFn(GAME, "submit-move", [Cl.uint(gameId)], wallet3)
    expect(result).toStrictEqual(ERR_NOT_TURN)
  })

  it("black can submit after white", () => {
    const { result } = simnet.callPublicFn(GAME, "submit-move", [Cl.uint(gameId)], wallet2)
    expect(result).toBeOk(Cl.bool(true))
  })

  it("move-count is 2 after two moves", () => {
    const { result } = simnet.callReadOnlyFn(GAME, "get-game", [Cl.uint(gameId)], wallet1)
    const gameData = (result as any).value.value
    expect(gameData.value["move-count"]).toStrictEqual(Cl.uint(2))
  })

  it("submit-move clears a pending draw proposal", () => {
    // Propose draw, then make a move — draw-proposer should reset to none
    simnet.callPublicFn(GAME, "propose-draw", [Cl.uint(gameId)], wallet1)
    simnet.callPublicFn(GAME, "submit-move", [Cl.uint(gameId)], wallet1)
    const { result } = simnet.callReadOnlyFn(GAME, "get-game", [Cl.uint(gameId)], wallet1)
    const gameData = (result as any).value.value
    expect(gameData.value["draw-proposer"]).toStrictEqual(Cl.none())
  })
})
