/**
 * timer.test.ts — chess-game.clar: timeout system
 * Each test is self-contained (simnet resets per test).
 */
import { describe, expect, it } from "vitest"
import { Cl } from "@stacks/transactions"

const GAME    = "chess-game"
const TIMEOUT = 432

const ERR_NOT_ACTIVE = Cl.error(Cl.uint(705))
const ERR_NOT_TURN   = Cl.error(Cl.uint(702))
const ERR_TIMEOUT_NM = Cl.error(Cl.uint(708))
const ERR_NOT_AUTH   = Cl.error(Cl.uint(700))

const accounts = simnet.getAccounts()
const deployer = accounts.get("deployer")!
const wallet1  = accounts.get("wallet_1")!
const wallet2  = accounts.get("wallet_2")!

function activeGame(): void {
  simnet.callPublicFn(GAME, "create-game", [Cl.uint(0)], wallet1)
  simnet.callPublicFn(GAME, "join-game", [Cl.uint(0)], wallet2)
}

describe("claim-timeout guards", () => {
  it("fails on a WAITING game", () => {
    simnet.callPublicFn(GAME, "create-game", [Cl.uint(0)], wallet1)
    const { result } = simnet.callPublicFn(GAME, "claim-timeout", [Cl.uint(0)], wallet2)
    expect(result).toStrictEqual(ERR_NOT_ACTIVE)
  })

  it("on-turn player cannot claim timeout on themselves", () => {
    activeGame() // wallet1's turn
    const { result } = simnet.callPublicFn(GAME, "claim-timeout", [Cl.uint(0)], wallet1)
    expect(result).toStrictEqual(ERR_NOT_TURN)
  })

  it("fails when timeout window has not yet elapsed", () => {
    activeGame()
    const { result } = simnet.callPublicFn(GAME, "claim-timeout", [Cl.uint(0)], wallet2)
    expect(result).toStrictEqual(ERR_TIMEOUT_NM)
  })
})

describe("can-claim-timeout read-only", () => {
  it("returns false while window has not elapsed", () => {
    activeGame()
    const { result } = simnet.callReadOnlyFn(GAME, "can-claim-timeout", [Cl.uint(0)], wallet2)
    expect(result).toBeOk(Cl.bool(false))
  })

  it("returns true after TIMEOUT blocks pass", () => {
    activeGame()
    simnet.mineEmptyBlocks(TIMEOUT)
    const { result } = simnet.callReadOnlyFn(GAME, "can-claim-timeout", [Cl.uint(0)], wallet2)
    expect(result).toBeOk(Cl.bool(true))
  })

  it("returns 0 blocks remaining for a WAITING game", () => {
    simnet.callPublicFn(GAME, "create-game", [Cl.uint(0)], wallet1) // WAITING
    const { result } = simnet.callReadOnlyFn(GAME, "get-blocks-until-timeout", [Cl.uint(0)], wallet1)
    expect(result).toBeOk(Cl.uint(0))
  })

  it("returns a positive count for an active game within window", () => {
    activeGame()
    const { result } = simnet.callReadOnlyFn(GAME, "get-blocks-until-timeout", [Cl.uint(0)], wallet1)
    const blocks = Number((result as any).value.value)
    expect(blocks).toBeGreaterThan(0)
    expect(blocks).toBeLessThanOrEqual(TIMEOUT)
  })
})

describe("claim-timeout success path", () => {
  it("off-turn player wins and game becomes FINISHED (2)", () => {
    activeGame() // wallet1's turn
    simnet.mineEmptyBlocks(TIMEOUT)
    const { result } = simnet.callPublicFn(GAME, "claim-timeout", [Cl.uint(0)], wallet2)
    expect(result).toBeOk(Cl.principal(wallet2))
    const { result: status } = simnet.callReadOnlyFn(GAME, "get-game-status", [Cl.uint(0)], wallet1)
    expect(status).toBeOk(Cl.uint(2))
  })

  it("cannot claim timeout on a finished game", () => {
    activeGame()
    simnet.mineEmptyBlocks(TIMEOUT)
    simnet.callPublicFn(GAME, "claim-timeout", [Cl.uint(0)], wallet2) // ends the game
    const { result } = simnet.callPublicFn(GAME, "claim-timeout", [Cl.uint(0)], wallet2)
    expect(result).toStrictEqual(ERR_NOT_ACTIVE)
  })
})

describe("set-timeout-blocks", () => {
  it("owner can change the timeout window", () => {
    const { result } = simnet.callPublicFn(GAME, "set-timeout-blocks", [Cl.uint(100)], deployer)
    expect(result).toBeOk(Cl.uint(100))
  })

  it("non-owner cannot change timeout", () => {
    const { result } = simnet.callPublicFn(GAME, "set-timeout-blocks", [Cl.uint(50)], wallet1)
    expect(result).toStrictEqual(ERR_NOT_AUTH)
  })

  it("new timeout window is respected in can-claim-timeout", () => {
    // Set a shorter timeout, then verify can-claim fires after that many blocks
    simnet.callPublicFn(GAME, "set-timeout-blocks", [Cl.uint(10)], deployer)
    activeGame()
    const { result: before } = simnet.callReadOnlyFn(GAME, "can-claim-timeout", [Cl.uint(0)], wallet2)
    expect(before).toBeOk(Cl.bool(false))
    simnet.mineEmptyBlocks(10)
    const { result: after } = simnet.callReadOnlyFn(GAME, "can-claim-timeout", [Cl.uint(0)], wallet2)
    expect(after).toBeOk(Cl.bool(true))
  })
})
