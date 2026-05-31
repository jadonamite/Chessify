/**
 * logic.test.ts — chess-game.clar: submit-move
 * Each test is self-contained (simnet resets per test).
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

function activeGame(): number {
  simnet.callPublicFn(GAME, "create-game", [Cl.uint(0)], wallet1)
  simnet.callPublicFn(GAME, "join-game", [Cl.uint(0)], wallet2)
  return 0 // always game 0 on a fresh simnet
}

describe("submit-move", () => {
  it("fails on a WAITING game before an opponent joins", () => {
    simnet.callPublicFn(GAME, "create-game", [Cl.uint(0)], wallet1)
    const { result } = simnet.callPublicFn(GAME, "submit-move", [Cl.uint(0)], wallet1)
    expect(result).toStrictEqual(ERR_NOT_ACTIVE)
  })

  it("white (creator) can submit the first move on an active game", () => {
    activeGame()
    const { result } = simnet.callPublicFn(GAME, "submit-move", [Cl.uint(0)], wallet1)
    expect(result).toBeOk(Cl.bool(true))
  })

  it("turn flips to black after white moves", () => {
    activeGame()
    simnet.callPublicFn(GAME, "submit-move", [Cl.uint(0)], wallet1)
    const { result } = simnet.callReadOnlyFn(GAME, "get-current-turn", [Cl.uint(0)], wallet1)
    expect(result).toBeOk(Cl.principal(wallet2))
  })

  it("move-count increments correctly across two moves", () => {
    activeGame()
    simnet.callPublicFn(GAME, "submit-move", [Cl.uint(0)], wallet1)
    simnet.callPublicFn(GAME, "submit-move", [Cl.uint(0)], wallet2)
    const { result } = simnet.callReadOnlyFn(GAME, "get-game", [Cl.uint(0)], wallet1)
    const moveCount = Number((result as any).value.value.value["move-count"].value)
    expect(moveCount).toBe(2)
  })

  it("rejects move from player whose turn it is not", () => {
    activeGame() // wallet1's turn first
    const { result } = simnet.callPublicFn(GAME, "submit-move", [Cl.uint(0)], wallet2)
    expect(result).toStrictEqual(ERR_NOT_TURN)
  })

  it("rejects move from a third party not in the game", () => {
    activeGame()
    const { result } = simnet.callPublicFn(GAME, "submit-move", [Cl.uint(0)], wallet3)
    expect(result).toStrictEqual(ERR_NOT_TURN)
  })

  it("making a move clears any pending draw proposal", () => {
    activeGame()
    simnet.callPublicFn(GAME, "propose-draw", [Cl.uint(0)], wallet1)
    simnet.callPublicFn(GAME, "submit-move", [Cl.uint(0)], wallet1)
    const { result } = simnet.callReadOnlyFn(GAME, "get-game", [Cl.uint(0)], wallet1)
    const drawProposer = (result as any).value.value.value["draw-proposer"]
    expect(drawProposer).toStrictEqual(Cl.none())
  })
})
