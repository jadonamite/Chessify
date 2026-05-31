/**
 * logic.test.ts — chess-game.clar: submit-move
 */
import { describe, expect, it, beforeAll } from "vitest"
import { Cl } from "@stacks/transactions"

const GAME = "chess-game"

const ERR_NOT_ACTIVE = Cl.error(Cl.uint(705))
const ERR_NOT_TURN   = Cl.error(Cl.uint(702))

const accounts = simnet.getAccounts()
const wallet1  = accounts.get("wallet_1")!
const wallet2  = accounts.get("wallet_2")!
const wallet3  = accounts.get("wallet_3")!

beforeAll(() => { simnet.mineEmptyBlocks(144) })

function nextId(): number {
  const { result } = simnet.callReadOnlyFn(GAME, "get-total-games", [], wallet1)
  return Number((result as any).value.value)
}

function activeGame(): number {
  const id = nextId()
  simnet.callPublicFn(GAME, "create-game", [Cl.uint(0)], wallet1)
  simnet.callPublicFn(GAME, "join-game", [Cl.uint(id)], wallet2)
  return id
}

describe("submit-move", () => {
  it("fails on a WAITING game", () => {
    const id = nextId()
    simnet.callPublicFn(GAME, "create-game", [Cl.uint(0)], wallet1)
    const { result } = simnet.callPublicFn(GAME, "submit-move", [Cl.uint(id)], wallet1)
    expect(result).toStrictEqual(ERR_NOT_ACTIVE)
  })

  it("white (creator) can submit the first move", () => {
    const id = activeGame()
    const { result } = simnet.callPublicFn(GAME, "submit-move", [Cl.uint(id)], wallet1)
    expect(result).toBeOk(Cl.bool(true))
  })

  it("turn flips to black after white moves", () => {
    const id = activeGame()
    simnet.callPublicFn(GAME, "submit-move", [Cl.uint(id)], wallet1)
    const { result } = simnet.callReadOnlyFn(GAME, "get-current-turn", [Cl.uint(id)], wallet1)
    expect(result).toBeOk(Cl.principal(wallet2))
  })

  it("move-count increments on each submit", () => {
    const id = activeGame()
    simnet.callPublicFn(GAME, "submit-move", [Cl.uint(id)], wallet1) // move 1
    simnet.callPublicFn(GAME, "submit-move", [Cl.uint(id)], wallet2) // move 2

    const { result } = simnet.callReadOnlyFn(GAME, "get-game", [Cl.uint(id)], wallet1)
    const moveCount = Number((result as any).value.value.value["move-count"].value)
    expect(moveCount).toBe(2)
  })

  it("rejects move from the wrong player", () => {
    const id = activeGame()
    // It's wallet1's turn — wallet2 cannot move
    const { result } = simnet.callPublicFn(GAME, "submit-move", [Cl.uint(id)], wallet2)
    expect(result).toStrictEqual(ERR_NOT_TURN)
  })

  it("rejects move from a third party not in the game", () => {
    const id = activeGame()
    const { result } = simnet.callPublicFn(GAME, "submit-move", [Cl.uint(id)], wallet3)
    expect(result).toStrictEqual(ERR_NOT_TURN)
  })

  it("moving clears a pending draw proposal", () => {
    const id = activeGame()
    simnet.callPublicFn(GAME, "propose-draw", [Cl.uint(id)], wallet1)
    simnet.callPublicFn(GAME, "submit-move", [Cl.uint(id)], wallet1)

    const { result } = simnet.callReadOnlyFn(GAME, "get-game", [Cl.uint(id)], wallet1)
    const drawProposer = (result as any).value.value.value["draw-proposer"]
    expect(drawProposer).toStrictEqual(Cl.none())
  })
})
