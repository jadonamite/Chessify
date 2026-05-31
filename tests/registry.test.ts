/**
 * registry.test.ts — chess-game.clar: game creation and joining
 */
import { describe, expect, it } from "vitest"
import { Cl } from "@stacks/transactions"

const TOKEN = "chess-token-v3"
const GAME  = "chess-game"

const ERR_NOT_FOUND   = Cl.error(Cl.uint(701))
const ERR_INVALID_OPP = Cl.error(Cl.uint(703))
const ERR_NOT_WAITING = Cl.error(Cl.uint(706))

const accounts = simnet.getAccounts()
const wallet1  = accounts.get("wallet_1")!
const wallet2  = accounts.get("wallet_2")!
const wallet3  = accounts.get("wallet_3")!

describe("create-game (free)", () => {
  it("first game returns id 0", () => {
    const { result } = simnet.callPublicFn(GAME, "create-game", [Cl.uint(0)], wallet1)
    expect(result).toBeOk(Cl.uint(0))
  })

  it("second game returns id 1", () => {
    const { result } = simnet.callPublicFn(GAME, "create-game", [Cl.uint(0)], wallet2)
    expect(result).toBeOk(Cl.uint(1))
  })

  it("get-total-games reflects created count", () => {
    const { result } = simnet.callReadOnlyFn(GAME, "get-total-games", [], wallet1)
    expect(result).toBeOk(Cl.uint(2))
  })

  it("game starts with WAITING status (0)", () => {
    const { result } = simnet.callReadOnlyFn(GAME, "get-game-status", [Cl.uint(0)], wallet1)
    expect(result).toBeOk(Cl.uint(0))
  })

  it("current turn is the creator on a waiting game", () => {
    const { result } = simnet.callReadOnlyFn(GAME, "get-current-turn", [Cl.uint(0)], wallet1)
    expect(result).toBeOk(Cl.principal(wallet1))
  })
})

describe("create-game (with wager)", () => {
  it("locks white's CHESS into the vault", () => {
    simnet.mineEmptyBlocks(144)
    simnet.callPublicFn(TOKEN, "faucet-claim", [], wallet3)
    const wager = 500_000_000n

    const { result } = simnet.callPublicFn(GAME, "create-game", [Cl.uint(wager)], wallet3)
    expect(result).toBeOk(Cl.uint(2)) // 3rd game

    const { result: w3bal } = simnet.callReadOnlyFn(TOKEN, "get-balance", [Cl.principal(wallet3)], wallet3)
    expect(w3bal).toBeOk(Cl.uint(1_000_000_000n - wager))
  })
})

describe("join-game", () => {
  it("opponent joins and game becomes ACTIVE (1)", () => {
    const { result } = simnet.callPublicFn(GAME, "join-game", [Cl.uint(0)], wallet2)
    expect(result).toBeOk(Cl.bool(true))
    const { result: status } = simnet.callReadOnlyFn(GAME, "get-game-status", [Cl.uint(0)], wallet1)
    expect(status).toBeOk(Cl.uint(1))
  })

  it("creator cannot join their own game", () => {
    const { result } = simnet.callPublicFn(GAME, "join-game", [Cl.uint(1)], wallet2)
    expect(result).toStrictEqual(ERR_INVALID_OPP)
  })

  it("cannot join an already ACTIVE game", () => {
    const { result } = simnet.callPublicFn(GAME, "join-game", [Cl.uint(0)], wallet3)
    expect(result).toStrictEqual(ERR_NOT_WAITING)
  })

  it("joining a nonexistent game fails", () => {
    const { result } = simnet.callPublicFn(GAME, "join-game", [Cl.uint(999)], wallet2)
    expect(result).toStrictEqual(ERR_NOT_FOUND)
  })
})

describe("player stats initialised on first game", () => {
  it("creator has 1200 Elo and zero record after creating", () => {
    const { result } = simnet.callReadOnlyFn(GAME, "get-player-stats", [Cl.principal(wallet1)], wallet1)
    expect(result).toBeOk(Cl.tuple({
      wins:           Cl.uint(0),
      losses:         Cl.uint(0),
      draws:          Cl.uint(0),
      rating:         Cl.uint(1200),
      "games-played": Cl.uint(0),
    }))
  })
})
