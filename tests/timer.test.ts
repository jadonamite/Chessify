/**
 * timer.test.ts — chess-game.clar: timeout system
 */
import { describe, expect, it, beforeAll } from "vitest"
import { Cl } from "@stacks/transactions"

const GAME    = "chess-game"
const TIMEOUT = 432 // DEFAULT_TIMEOUT

const ERR_NOT_ACTIVE = Cl.error(Cl.uint(705))
const ERR_NOT_TURN   = Cl.error(Cl.uint(702))
const ERR_TIMEOUT_NM = Cl.error(Cl.uint(708))
const ERR_NOT_AUTH   = Cl.error(Cl.uint(700))

const accounts = simnet.getAccounts()
const deployer = accounts.get("deployer")!
const wallet1  = accounts.get("wallet_1")!
const wallet2  = accounts.get("wallet_2")!

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

describe("claim-timeout guards", () => {
  it("fails on a WAITING game", () => {
    const id = nextId()
    simnet.callPublicFn(GAME, "create-game", [Cl.uint(0)], wallet1)
    const { result } = simnet.callPublicFn(GAME, "claim-timeout", [Cl.uint(id)], wallet2)
    expect(result).toStrictEqual(ERR_NOT_ACTIVE)
  })

  it("the on-turn player cannot claim timeout on themselves", () => {
    const id = activeGame() // wallet1's turn
    const { result } = simnet.callPublicFn(GAME, "claim-timeout", [Cl.uint(id)], wallet1)
    expect(result).toStrictEqual(ERR_NOT_TURN)
  })

  it("fails before timeout window has elapsed", () => {
    const id = activeGame()
    const { result } = simnet.callPublicFn(GAME, "claim-timeout", [Cl.uint(id)], wallet2)
    expect(result).toStrictEqual(ERR_TIMEOUT_NM)
  })
})

describe("can-claim-timeout read-only", () => {
  it("returns false while window has not elapsed", () => {
    const id = activeGame()
    const { result } = simnet.callReadOnlyFn(GAME, "can-claim-timeout", [Cl.uint(id)], wallet2)
    expect(result).toBeOk(Cl.bool(false))
  })

  it("returns true after TIMEOUT blocks have passed", () => {
    const id = activeGame()
    simnet.mineEmptyBlocks(TIMEOUT)
    const { result } = simnet.callReadOnlyFn(GAME, "can-claim-timeout", [Cl.uint(id)], wallet2)
    expect(result).toBeOk(Cl.bool(true))
  })

  it("get-blocks-until-timeout returns 0 on an inactive game", () => {
    const id = nextId()
    simnet.callPublicFn(GAME, "create-game", [Cl.uint(0)], wallet1) // WAITING, not ACTIVE
    const { result } = simnet.callReadOnlyFn(GAME, "get-blocks-until-timeout", [Cl.uint(id)], wallet1)
    expect(result).toBeOk(Cl.uint(0))
  })
})

describe("claim-timeout success path", () => {
  it("off-turn player wins after window elapses; game becomes FINISHED", () => {
    const id = activeGame() // wallet1's turn
    simnet.mineEmptyBlocks(TIMEOUT)

    const { result } = simnet.callPublicFn(GAME, "claim-timeout", [Cl.uint(id)], wallet2)
    expect(result).toBeOk(Cl.principal(wallet2))

    const { result: status } = simnet.callReadOnlyFn(GAME, "get-game-status", [Cl.uint(id)], wallet1)
    expect(status).toBeOk(Cl.uint(2)) // FINISHED
  })

  it("cannot claim timeout on an already-finished game", () => {
    const id = activeGame()
    simnet.mineEmptyBlocks(TIMEOUT)
    simnet.callPublicFn(GAME, "claim-timeout", [Cl.uint(id)], wallet2) // ends game
    const { result } = simnet.callPublicFn(GAME, "claim-timeout", [Cl.uint(id)], wallet2)
    expect(result).toStrictEqual(ERR_NOT_ACTIVE)
  })
})

describe("set-timeout-blocks admin", () => {
  it("owner can update timeout window", () => {
    const { result } = simnet.callPublicFn(GAME, "set-timeout-blocks", [Cl.uint(100)], deployer)
    expect(result).toBeOk(Cl.uint(100))
  })

  it("non-owner cannot update timeout", () => {
    const { result } = simnet.callPublicFn(GAME, "set-timeout-blocks", [Cl.uint(50)], wallet1)
    expect(result).toStrictEqual(ERR_NOT_AUTH)
  })

  it("new timeout takes effect immediately for active games", () => {
    // timeout is now 100 blocks
    const id = activeGame()
    simnet.mineEmptyBlocks(100)
    const { result } = simnet.callReadOnlyFn(GAME, "can-claim-timeout", [Cl.uint(id)], wallet2)
    expect(result).toBeOk(Cl.bool(true))
  })
})
