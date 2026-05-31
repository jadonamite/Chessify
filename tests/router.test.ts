/**
 * router.test.ts — chess-game.clar: full game lifecycle flows
 * Each test is self-contained (simnet resets per test).
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
  simnet.callPublicFn(GAME, "create-game", [Cl.uint(0)], wallet1)
  simnet.callPublicFn(GAME, "join-game", [Cl.uint(0)], wallet2)
  return 0 // always 0 on fresh simnet
}

// ── Resign ────────────────────────────────────────────────────────────────────
describe("resign", () => {
  it("caller concedes — the opponent's principal is returned as winner", () => {
    newGame()
    const { result } = simnet.callPublicFn(GAME, "resign", [Cl.uint(0)], wallet1)
    expect(result).toBeOk(Cl.principal(wallet2))
  })

  it("game status is FINISHED (2) after resign", () => {
    newGame()
    simnet.callPublicFn(GAME, "resign", [Cl.uint(0)], wallet2)
    const { result } = simnet.callReadOnlyFn(GAME, "get-game-status", [Cl.uint(0)], wallet1)
    expect(result).toBeOk(Cl.uint(2))
  })

  it("third party not in the game cannot resign", () => {
    newGame()
    const { result } = simnet.callPublicFn(GAME, "resign", [Cl.uint(0)], wallet3)
    expect(result).toStrictEqual(ERR_NOT_GAME)
  })

  it("cannot resign a game that is already finished", () => {
    newGame()
    simnet.callPublicFn(GAME, "resign", [Cl.uint(0)], wallet1)
    const { result } = simnet.callPublicFn(GAME, "resign", [Cl.uint(0)], wallet2)
    expect(result).toStrictEqual(ERR_NOT_ACTIVE)
  })
})

// ── Report-win ────────────────────────────────────────────────────────────────
describe("report-win", () => {
  it("caller claims checkmate win — their principal is returned", () => {
    newGame()
    const { result } = simnet.callPublicFn(GAME, "report-win", [Cl.uint(0)], wallet1)
    expect(result).toBeOk(Cl.principal(wallet1))
  })

  it("third party cannot claim a win in someone else's game", () => {
    newGame()
    const { result } = simnet.callPublicFn(GAME, "report-win", [Cl.uint(0)], wallet3)
    expect(result).toStrictEqual(ERR_NOT_GAME)
  })

  it("cannot report-win on a game that is already finished", () => {
    newGame()
    simnet.callPublicFn(GAME, "report-win", [Cl.uint(0)], wallet1)
    const { result } = simnet.callPublicFn(GAME, "report-win", [Cl.uint(0)], wallet2)
    expect(result).toStrictEqual(ERR_NOT_ACTIVE)
  })
})

// ── Propose-draw ──────────────────────────────────────────────────────────────
describe("propose-draw", () => {
  it("any participant can propose a draw", () => {
    newGame()
    const { result } = simnet.callPublicFn(GAME, "propose-draw", [Cl.uint(0)], wallet1)
    expect(result).toBeOk(Cl.bool(true))
  })

  it("cannot propose draw twice from the same player", () => {
    newGame()
    simnet.callPublicFn(GAME, "propose-draw", [Cl.uint(0)], wallet1)
    const { result } = simnet.callPublicFn(GAME, "propose-draw", [Cl.uint(0)], wallet1)
    expect(result).toStrictEqual(ERR_ALREADY_DRAW)
  })

  it("third party cannot propose a draw", () => {
    newGame()
    const { result } = simnet.callPublicFn(GAME, "propose-draw", [Cl.uint(0)], wallet3)
    expect(result).toStrictEqual(ERR_NOT_GAME)
  })
})

// ── Accept-draw ───────────────────────────────────────────────────────────────
describe("accept-draw", () => {
  it("opponent accepts pending draw; game becomes DRAW (4)", () => {
    newGame()
    simnet.callPublicFn(GAME, "propose-draw", [Cl.uint(0)], wallet1)
    const { result } = simnet.callPublicFn(GAME, "accept-draw", [Cl.uint(0)], wallet2)
    expect(result).toBeOk(Cl.bool(true))
    const { result: status } = simnet.callReadOnlyFn(GAME, "get-game-status", [Cl.uint(0)], wallet1)
    expect(status).toBeOk(Cl.uint(4))
  })

  it("proposer cannot accept their own draw offer", () => {
    newGame()
    simnet.callPublicFn(GAME, "propose-draw", [Cl.uint(0)], wallet1)
    const { result } = simnet.callPublicFn(GAME, "accept-draw", [Cl.uint(0)], wallet1)
    expect(result).toStrictEqual(ERR_CANT_OWN_DRAW)
  })

  it("cannot accept draw when none is pending", () => {
    newGame()
    const { result } = simnet.callPublicFn(GAME, "accept-draw", [Cl.uint(0)], wallet2)
    expect(result).toStrictEqual(ERR_NO_DRAW)
  })

  it("making a move clears the draw proposal; accept then fails", () => {
    newGame()
    simnet.callPublicFn(GAME, "propose-draw", [Cl.uint(0)], wallet1)
    simnet.callPublicFn(GAME, "submit-move", [Cl.uint(0)], wallet1)
    const { result } = simnet.callPublicFn(GAME, "accept-draw", [Cl.uint(0)], wallet2)
    expect(result).toStrictEqual(ERR_NO_DRAW)
  })
})

// ── Cancel-game ───────────────────────────────────────────────────────────────
describe("cancel-game", () => {
  it("creator cancels WAITING game; status becomes CANCELLED (3)", () => {
    simnet.callPublicFn(GAME, "create-game", [Cl.uint(0)], wallet1) // not joined yet
    const { result } = simnet.callPublicFn(GAME, "cancel-game", [Cl.uint(0)], wallet1)
    expect(result).toBeOk(Cl.bool(true))
    const { result: status } = simnet.callReadOnlyFn(GAME, "get-game-status", [Cl.uint(0)], wallet1)
    expect(status).toBeOk(Cl.uint(3))
  })

  it("non-creator cannot cancel", () => {
    simnet.callPublicFn(GAME, "create-game", [Cl.uint(0)], wallet1)
    const { result } = simnet.callPublicFn(GAME, "cancel-game", [Cl.uint(0)], wallet2)
    expect(result).toStrictEqual(ERR_NOT_AUTH)
  })

  it("cannot cancel an already ACTIVE game", () => {
    newGame() // active
    const { result } = simnet.callPublicFn(GAME, "cancel-game", [Cl.uint(0)], wallet1)
    expect(result).toStrictEqual(ERR_NOT_WAITING)
  })
})
