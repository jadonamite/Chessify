/**
 * router.test.ts — chess-game.clar: full game lifecycle flows
 *
 * End-to-end paths: resign, report-win, draw proposal/acceptance,
 * cancel, and all associated error guards.
 */
import { describe, expect, it } from "vitest"
import { Cl } from "@stacks/transactions"

const GAME = "chess-game"

const ERR_NOT_ACTIVE    = Cl.error(Cl.uint(705))
const ERR_NOT_GAME      = Cl.error(Cl.uint(707))
const ERR_NO_DRAW       = Cl.error(Cl.uint(709))
const ERR_ALREADY_DRAW  = Cl.error(Cl.uint(710))
const ERR_CANT_OWN_DRAW = Cl.error(Cl.uint(711))
const ERR_NOT_WAITING   = Cl.error(Cl.uint(706))
const ERR_NOT_AUTH      = Cl.error(Cl.uint(700))

const accounts = simnet.getAccounts()
const wallet1  = accounts.get("wallet_1")!
const wallet2  = accounts.get("wallet_2")!
const wallet3  = accounts.get("wallet_3")!

function newGame(): number {
  const { result } = simnet.callPublicFn(GAME, "create-game", [Cl.uint(0)], wallet1)
  const gameId = Number((result as any).value.value)
  simnet.callPublicFn(GAME, "join-game", [Cl.uint(gameId)], wallet2)
  return gameId
}

// ── Resign ───────────────────────────────────────────────────────────────────
describe("resign", () => {
  it("caller concedes — opponent is returned as winner", () => {
    const gameId = newGame()
    const { result } = simnet.callPublicFn(GAME, "resign", [Cl.uint(gameId)], wallet1)
    expect(result).toBeOk(Cl.principal(wallet2))
  })

  it("game status is FINISHED (2) after resign", () => {
    const gameId = newGame()
    simnet.callPublicFn(GAME, "resign", [Cl.uint(gameId)], wallet2)
    const { result } = simnet.callReadOnlyFn(GAME, "get-game-status", [Cl.uint(gameId)], wallet1)
    expect(result).toBeOk(Cl.uint(2))
  })

  it("third party cannot resign a game they're not in", () => {
    const gameId = newGame()
    const { result } = simnet.callPublicFn(GAME, "resign", [Cl.uint(gameId)], wallet3)
    expect(result).toStrictEqual(ERR_NOT_GAME)
  })

  it("cannot resign a finished game", () => {
    const gameId = newGame()
    simnet.callPublicFn(GAME, "resign", [Cl.uint(gameId)], wallet1)
    const { result } = simnet.callPublicFn(GAME, "resign", [Cl.uint(gameId)], wallet2)
    expect(result).toStrictEqual(ERR_NOT_ACTIVE)
  })
})

// ── Report-win ───────────────────────────────────────────────────────────────
describe("report-win", () => {
  it("caller claims checkmate and becomes winner", () => {
    const gameId = newGame()
    const { result } = simnet.callPublicFn(GAME, "report-win", [Cl.uint(gameId)], wallet1)
    expect(result).toBeOk(Cl.principal(wallet1))
  })

  it("third party cannot report a win", () => {
    const gameId = newGame()
    const { result } = simnet.callPublicFn(GAME, "report-win", [Cl.uint(gameId)], wallet3)
    expect(result).toStrictEqual(ERR_NOT_GAME)
  })

  it("cannot report-win on a finished game", () => {
    const gameId = newGame()
    simnet.callPublicFn(GAME, "report-win", [Cl.uint(gameId)], wallet1)
    const { result } = simnet.callPublicFn(GAME, "report-win", [Cl.uint(gameId)], wallet2)
    expect(result).toStrictEqual(ERR_NOT_ACTIVE)
  })
})

// ── Draw proposal ────────────────────────────────────────────────────────────
describe("propose-draw", () => {
  it("any participant can propose a draw", () => {
    const gameId = newGame()
    const { result } = simnet.callPublicFn(GAME, "propose-draw", [Cl.uint(gameId)], wallet1)
    expect(result).toBeOk(Cl.bool(true))
  })

  it("cannot propose draw twice from same player", () => {
    const gameId = newGame()
    simnet.callPublicFn(GAME, "propose-draw", [Cl.uint(gameId)], wallet1)
    const { result } = simnet.callPublicFn(GAME, "propose-draw", [Cl.uint(gameId)], wallet1)
    expect(result).toStrictEqual(ERR_ALREADY_DRAW)
  })

  it("third party cannot propose draw", () => {
    const gameId = newGame()
    const { result } = simnet.callPublicFn(GAME, "propose-draw", [Cl.uint(gameId)], wallet3)
    expect(result).toStrictEqual(ERR_NOT_GAME)
  })
})

// ── Accept-draw ──────────────────────────────────────────────────────────────
describe("accept-draw", () => {
  it("opponent can accept a pending draw proposal", () => {
    const gameId = newGame()
    simnet.callPublicFn(GAME, "propose-draw", [Cl.uint(gameId)], wallet1)
    const { result } = simnet.callPublicFn(GAME, "accept-draw", [Cl.uint(gameId)], wallet2)
    expect(result).toBeOk(Cl.bool(true))
  })

  it("proposer cannot accept their own draw", () => {
    const gameId = newGame()
    simnet.callPublicFn(GAME, "propose-draw", [Cl.uint(gameId)], wallet1)
    const { result } = simnet.callPublicFn(GAME, "accept-draw", [Cl.uint(gameId)], wallet1)
    expect(result).toStrictEqual(ERR_CANT_OWN_DRAW)
  })

  it("cannot accept draw when none is pending", () => {
    const gameId = newGame()
    const { result } = simnet.callPublicFn(GAME, "accept-draw", [Cl.uint(gameId)], wallet2)
    expect(result).toStrictEqual(ERR_NO_DRAW)
  })

  it("making a move clears the draw proposal", () => {
    const gameId = newGame()
    simnet.callPublicFn(GAME, "propose-draw", [Cl.uint(gameId)], wallet1)
    simnet.callPublicFn(GAME, "submit-move", [Cl.uint(gameId)], wallet1)
    // draw proposal is now gone; accept-draw should fail
    const { result } = simnet.callPublicFn(GAME, "accept-draw", [Cl.uint(gameId)], wallet2)
    expect(result).toStrictEqual(ERR_NO_DRAW)
  })
})

// ── Cancel-game ──────────────────────────────────────────────────────────────
describe("cancel-game", () => {
  it("creator can cancel a WAITING game", () => {
    const { result: create } = simnet.callPublicFn(GAME, "create-game", [Cl.uint(0)], wallet1)
    const gameId = Number((create as any).value.value)
    const { result } = simnet.callPublicFn(GAME, "cancel-game", [Cl.uint(gameId)], wallet1)
    expect(result).toBeOk(Cl.bool(true))
  })

  it("non-creator cannot cancel", () => {
    const { result: create } = simnet.callPublicFn(GAME, "create-game", [Cl.uint(0)], wallet1)
    const gameId = Number((create as any).value.value)
    const { result } = simnet.callPublicFn(GAME, "cancel-game", [Cl.uint(gameId)], wallet2)
    expect(result).toStrictEqual(ERR_NOT_AUTH)
  })

  it("cannot cancel an ACTIVE game", () => {
    const gameId = newGame() // already active
    const { result } = simnet.callPublicFn(GAME, "cancel-game", [Cl.uint(gameId)], wallet1)
    expect(result).toStrictEqual(ERR_NOT_WAITING)
  })
})
