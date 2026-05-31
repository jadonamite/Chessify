/**
 * timer.test.ts — chess-game.clar: timeout system
 *
 * Tests claim-timeout, can-claim-timeout, get-blocks-until-timeout,
 * and set-timeout-blocks.
 */
import { describe, expect, it } from "vitest"
import { Cl } from "@stacks/transactions"

const GAME    = "chess-game"
const TIMEOUT = 432  // DEFAULT_TIMEOUT blocks

const ERR_NOT_ACTIVE = Cl.error(Cl.uint(705))
const ERR_NOT_TURN   = Cl.error(Cl.uint(702))
const ERR_TIMEOUT_NM = Cl.error(Cl.uint(708))
const ERR_NOT_AUTH   = Cl.error(Cl.uint(700))

const accounts  = simnet.getAccounts()
const deployer  = accounts.get("deployer")!
const wallet1   = accounts.get("wallet_1")!
const wallet2   = accounts.get("wallet_2")!

function setupActiveGame(): number {
  const { result } = simnet.callPublicFn(GAME, "create-game", [Cl.uint(0)], wallet1)
  const gameId = Number((result as any).value.value)
  simnet.callPublicFn(GAME, "join-game", [Cl.uint(gameId)], wallet2)
  return gameId
}

describe("claim-timeout guards", () => {
  let gameId: number

  it("cannot claim on a WAITING game", () => {
    const { result: create } = simnet.callPublicFn(GAME, "create-game", [Cl.uint(0)], wallet1)
    const waitId = Number((create as any).value.value)
    const { result } = simnet.callPublicFn(GAME, "claim-timeout", [Cl.uint(waitId)], wallet2)
    expect(result).toStrictEqual(ERR_NOT_ACTIVE)

    simnet.callPublicFn(GAME, "join-game", [Cl.uint(waitId)], wallet2)
    gameId = waitId
  })

  it("the player whose TURN it is cannot claim timeout against themselves", () => {
    // It's wallet1's turn; wallet1 cannot claim timeout (they ARE the one on-turn)
    const { result } = simnet.callPublicFn(GAME, "claim-timeout", [Cl.uint(gameId)], wallet1)
    expect(result).toStrictEqual(ERR_NOT_TURN)
  })

  it("fails before timeout blocks have elapsed", () => {
    // wallet2 tries to claim while wallet1 hasn't exceeded the window
    const { result } = simnet.callPublicFn(GAME, "claim-timeout", [Cl.uint(gameId)], wallet2)
    expect(result).toStrictEqual(ERR_TIMEOUT_NM)
  })
})

describe("get-blocks-until-timeout", () => {
  let gameId: number

  it("returns a positive count shortly after game starts", () => {
    gameId = setupActiveGame()
    const { result } = simnet.callReadOnlyFn(
      GAME, "get-blocks-until-timeout", [Cl.uint(gameId)], wallet1
    )
    const blocks = Number((result as any).value.value)
    expect(blocks).toBeGreaterThan(0)
    expect(blocks).toBeLessThanOrEqual(TIMEOUT)
  })

  it("returns 0 for a non-active game", () => {
    const { result: create } = simnet.callPublicFn(GAME, "create-game", [Cl.uint(0)], wallet1)
    const waitingId = Number((create as any).value.value)
    const { result } = simnet.callReadOnlyFn(
      GAME, "get-blocks-until-timeout", [Cl.uint(waitingId)], wallet1
    )
    expect(result).toBeOk(Cl.uint(0))
  })
})

describe("can-claim-timeout", () => {
  let gameId: number

  it("returns false before timeout elapses", () => {
    gameId = setupActiveGame()
    const { result } = simnet.callReadOnlyFn(GAME, "can-claim-timeout", [Cl.uint(gameId)], wallet2)
    expect(result).toBeOk(Cl.bool(false))
  })

  it("returns true after timeout blocks have passed", () => {
    simnet.mineEmptyBlocks(TIMEOUT)
    const { result } = simnet.callReadOnlyFn(GAME, "can-claim-timeout", [Cl.uint(gameId)], wallet2)
    expect(result).toBeOk(Cl.bool(true))
  })
})

describe("claim-timeout succeeds after window", () => {
  let gameId: number

  it("off-turn player wins after opponent exceeds timeout", () => {
    gameId = setupActiveGame() // wallet1's turn
    simnet.mineEmptyBlocks(TIMEOUT)

    // wallet2 is off-turn and can now claim
    const { result } = simnet.callPublicFn(GAME, "claim-timeout", [Cl.uint(gameId)], wallet2)
    expect(result).toBeOk(Cl.principal(wallet2))
  })

  it("game status is FINISHED (2) after timeout claim", () => {
    const { result } = simnet.callReadOnlyFn(GAME, "get-game-status", [Cl.uint(gameId)], wallet1)
    expect(result).toBeOk(Cl.uint(2))
  })

  it("cannot claim-timeout on an already-finished game", () => {
    const { result } = simnet.callPublicFn(GAME, "claim-timeout", [Cl.uint(gameId)], wallet2)
    expect(result).toStrictEqual(ERR_NOT_ACTIVE)
  })
})

describe("set-timeout-blocks (owner admin)", () => {
  it("owner can update the timeout window", () => {
    const { result } = simnet.callPublicFn(
      GAME, "set-timeout-blocks", [Cl.uint(100)], deployer
    )
    expect(result).toBeOk(Cl.uint(100))
  })

  it("non-owner cannot update timeout", () => {
    const { result } = simnet.callPublicFn(
      GAME, "set-timeout-blocks", [Cl.uint(50)], wallet1
    )
    expect(result).toStrictEqual(ERR_NOT_AUTH)
  })

  it("new timeout takes effect for subsequent games", () => {
    // With timeout set to 100 blocks, mine 100 blocks and verify can-claim-timeout
    const gameId = setupActiveGame()
    simnet.mineEmptyBlocks(100)
    const { result } = simnet.callReadOnlyFn(GAME, "can-claim-timeout", [Cl.uint(gameId)], wallet2)
    expect(result).toBeOk(Cl.bool(true))
  })
})
