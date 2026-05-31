/**
 * router.test.ts — chess-game.clar: full game lifecycle flows
 */
import { describe, expect, it, beforeAll } from "vitest"
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

beforeAll(() => { simnet.mineEmptyBlocks(144) })

function nextId(): number {
  const { result } = simnet.callReadOnlyFn(GAME, "get-total-games", [], wallet1)
  return Number((result as any).value.value)
}

function newGame(): number {
  const id = nextId()
  simnet.callPublicFn(GAME, "create-game", [Cl.uint(0)], wallet1)
  simnet.callPublicFn(GAME, "join-game", [Cl.uint(id)], wallet2)
  return id
}

// ── Resign ───────────────────────────────────────────────────────────────────
describe("resign", () => {
  it("caller concedes — winner principal is returned", () => {
    const id = newGame()
    const { result } = simnet.callPublicFn(GAME, "resign", [Cl.uint(id)], wallet1)
    expect(result).toBeOk(Cl.principal(wallet2))
  })

  it("game is FINISHED (2) after resign", () => {
    const id = newGame()
    simnet.callPublicFn(GAME, "resign", [Cl.uint(id)], wallet2)
    const { result } = simnet.callReadOnlyFn(GAME, "get-game-status", [Cl.uint(id)], wallet1)
    expect(result).toBeOk(Cl.uint(2))
  })

  it("third party not in game cannot resign", () => {
    const id = newGame()
    const { result } = simnet.callPublicFn(GAME, "resign", [Cl.uint(id)], wallet3)
    expect(result).toStrictEqual(ERR_NOT_GAME)
  })

  it("cannot resign a finished game", () => {
    const id = newGame()
    simnet.callPublicFn(GAME, "resign", [Cl.uint(id)], wallet1)
    const { result } = simnet.callPublicFn(GAME, "resign", [Cl.uint(id)], wallet2)
    expect(result).toStrictEqual(ERR_NOT_ACTIVE)
  })
})

// ── Report-win ───────────────────────────────────────────────────────────────
describe("report-win", () => {
  it("caller claims checkmate and is returned as winner", () => {
    const id = newGame()
    const { result } = simnet.callPublicFn(GAME, "report-win", [Cl.uint(id)], wallet1)
    expect(result).toBeOk(Cl.principal(wallet1))
  })

  it("third party cannot report a win", () => {
    const id = newGame()
    const { result } = simnet.callPublicFn(GAME, "report-win", [Cl.uint(id)], wallet3)
    expect(result).toStrictEqual(ERR_NOT_GAME)
  })

  it("cannot report-win on a finished game", () => {
    const id = newGame()
    simnet.callPublicFn(GAME, "report-win", [Cl.uint(id)], wallet1)
    const { result } = simnet.callPublicFn(GAME, "report-win", [Cl.uint(id)], wallet2)
    expect(result).toStrictEqual(ERR_NOT_ACTIVE)
  })
})

// ── Draw proposal ─────────────────────────────────────────────────────────────
describe("propose-draw", () => {
  it("either participant can propose a draw", () => {
    const id = newGame()
    const { result } = simnet.callPublicFn(GAME, "propose-draw", [Cl.uint(id)], wallet1)
    expect(result).toBeOk(Cl.bool(true))
  })

  it("proposer cannot propose draw a second time", () => {
    const id = newGame()
    simnet.callPublicFn(GAME, "propose-draw", [Cl.uint(id)], wallet1)
    const { result } = simnet.callPublicFn(GAME, "propose-draw", [Cl.uint(id)], wallet1)
    expect(result).toStrictEqual(ERR_ALREADY_DRAW)
  })

  it("third party cannot propose draw", () => {
    const id = newGame()
    const { result } = simnet.callPublicFn(GAME, "propose-draw", [Cl.uint(id)], wallet3)
    expect(result).toStrictEqual(ERR_NOT_GAME)
  })
})

// ── Accept-draw ───────────────────────────────────────────────────────────────
describe("accept-draw", () => {
  it("opponent accepts pending draw; game becomes DRAW (4)", () => {
    const id = newGame()
    simnet.callPublicFn(GAME, "propose-draw", [Cl.uint(id)], wallet1)
    const { result } = simnet.callPublicFn(GAME, "accept-draw", [Cl.uint(id)], wallet2)
    expect(result).toBeOk(Cl.bool(true))
    const { result: status } = simnet.callReadOnlyFn(GAME, "get-game-status", [Cl.uint(id)], wallet1)
    expect(status).toBeOk(Cl.uint(4))
  })

  it("proposer cannot accept their own draw", () => {
    const id = newGame()
    simnet.callPublicFn(GAME, "propose-draw", [Cl.uint(id)], wallet1)
    const { result } = simnet.callPublicFn(GAME, "accept-draw", [Cl.uint(id)], wallet1)
    expect(result).toStrictEqual(ERR_CANT_OWN_DRAW)
  })

  it("cannot accept when no draw is pending", () => {
    const id = newGame()
    const { result } = simnet.callPublicFn(GAME, "accept-draw", [Cl.uint(id)], wallet2)
    expect(result).toStrictEqual(ERR_NO_DRAW)
  })

  it("making a move clears draw proposal; accept then fails", () => {
    const id = newGame()
    simnet.callPublicFn(GAME, "propose-draw", [Cl.uint(id)], wallet1)
    simnet.callPublicFn(GAME, "submit-move", [Cl.uint(id)], wallet1)
    const { result } = simnet.callPublicFn(GAME, "accept-draw", [Cl.uint(id)], wallet2)
    expect(result).toStrictEqual(ERR_NO_DRAW)
  })
})

// ── Cancel-game ───────────────────────────────────────────────────────────────
describe("cancel-game", () => {
  it("creator cancels a WAITING game; status becomes CANCELLED (3)", () => {
    const id = nextId()
    simnet.callPublicFn(GAME, "create-game", [Cl.uint(0)], wallet1)
    const { result } = simnet.callPublicFn(GAME, "cancel-game", [Cl.uint(id)], wallet1)
    expect(result).toBeOk(Cl.bool(true))
    const { result: status } = simnet.callReadOnlyFn(GAME, "get-game-status", [Cl.uint(id)], wallet1)
    expect(status).toBeOk(Cl.uint(3))
  })

  it("non-creator cannot cancel", () => {
    const id = nextId()
    simnet.callPublicFn(GAME, "create-game", [Cl.uint(0)], wallet1)
    const { result } = simnet.callPublicFn(GAME, "cancel-game", [Cl.uint(id)], wallet2)
    expect(result).toStrictEqual(ERR_NOT_AUTH)
  })

  it("cannot cancel an already ACTIVE game", () => {
    const id = newGame()
    const { result } = simnet.callPublicFn(GAME, "cancel-game", [Cl.uint(id)], wallet1)
    expect(result).toStrictEqual(ERR_NOT_WAITING)
  })
})
