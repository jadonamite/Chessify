/**
 * registry.test.ts — chess-game.clar: game creation and joining
 * Each test is fully self-contained (initBeforeEach:true resets simnet per test).
 */
import { describe, expect, it } from "vitest"
import { Cl } from "@stacks/transactions"

const TOKEN = "chess-token-v3"
const GAME  = "chess-game"

const ERR_NOT_FOUND   = Cl.error(Cl.uint(701))
const ERR_INVALID_OPP = Cl.error(Cl.uint(703))
const ERR_NOT_WAITING = Cl.error(Cl.uint(706))

const accounts = simnet.getAccounts()
const deployer = accounts.get("deployer")!
const wallet1  = accounts.get("wallet_1")!
const wallet2  = accounts.get("wallet_2")!
const wallet3  = accounts.get("wallet_3")!

function seed(addr: string, amount = 1_000_000_000n) {
  simnet.callPublicFn(TOKEN, "mint", [Cl.uint(amount), Cl.principal(addr)], deployer)
}

function nextId(): number {
  const { result } = simnet.callReadOnlyFn(GAME, "get-total-games", [], wallet1)
  return Number((result as any).value.value)
}

describe("create-game (free)", () => {
  it("first game on a fresh simnet has id 0", () => {
    const { result } = simnet.callPublicFn(GAME, "create-game", [Cl.uint(0)], wallet1)
    expect(result).toBeOk(Cl.uint(0))
  })

  it("second create-game returns id 1", () => {
    simnet.callPublicFn(GAME, "create-game", [Cl.uint(0)], wallet1)
    const { result } = simnet.callPublicFn(GAME, "create-game", [Cl.uint(0)], wallet2)
    expect(result).toBeOk(Cl.uint(1))
  })

  it("get-total-games matches number of games created", () => {
    simnet.callPublicFn(GAME, "create-game", [Cl.uint(0)], wallet1)
    simnet.callPublicFn(GAME, "create-game", [Cl.uint(0)], wallet2)
    const { result } = simnet.callReadOnlyFn(GAME, "get-total-games", [], wallet1)
    expect(result).toBeOk(Cl.uint(2))
  })

  it("new game has WAITING status (0)", () => {
    simnet.callPublicFn(GAME, "create-game", [Cl.uint(0)], wallet1)
    const { result } = simnet.callReadOnlyFn(GAME, "get-game-status", [Cl.uint(0)], wallet1)
    expect(result).toBeOk(Cl.uint(0))
  })

  it("current turn is the creator on a new game", () => {
    simnet.callPublicFn(GAME, "create-game", [Cl.uint(0)], wallet1)
    const { result } = simnet.callReadOnlyFn(GAME, "get-current-turn", [Cl.uint(0)], wallet1)
    expect(result).toBeOk(Cl.principal(wallet1))
  })
})

describe("create-game (with wager)", () => {
  it("locks white's tokens into the vault and reduces creator balance", () => {
    const wager = 500_000_000n
    seed(wallet3)
    const balBefore = BigInt((simnet.callReadOnlyFn(TOKEN, "get-balance",
      [Cl.principal(wallet3)], wallet3).result as any).value.value)

    const { result } = simnet.callPublicFn(GAME, "create-game", [Cl.uint(wager)], wallet3)
    expect(result).toBeOk(Cl.uint(0))

    const balAfter = BigInt((simnet.callReadOnlyFn(TOKEN, "get-balance",
      [Cl.principal(wallet3)], wallet3).result as any).value.value)
    expect(balAfter).toBe(balBefore - wager)

    // Vault holds the wager
    const { result: vault } = simnet.callReadOnlyFn(TOKEN, "get-vault-balance", [], wallet3)
    expect(vault).toBeOk(Cl.uint(wager))
  })
})

describe("join-game", () => {
  it("opponent joins; game becomes ACTIVE (1)", () => {
    simnet.callPublicFn(GAME, "create-game", [Cl.uint(0)], wallet1)
    const { result } = simnet.callPublicFn(GAME, "join-game", [Cl.uint(0)], wallet2)
    expect(result).toBeOk(Cl.bool(true))
    const { result: status } = simnet.callReadOnlyFn(GAME, "get-game-status", [Cl.uint(0)], wallet1)
    expect(status).toBeOk(Cl.uint(1))
  })

  it("creator cannot join their own game", () => {
    simnet.callPublicFn(GAME, "create-game", [Cl.uint(0)], wallet1)
    const { result } = simnet.callPublicFn(GAME, "join-game", [Cl.uint(0)], wallet1)
    expect(result).toStrictEqual(ERR_INVALID_OPP)
  })

  it("cannot join a game that is already ACTIVE", () => {
    simnet.callPublicFn(GAME, "create-game", [Cl.uint(0)], wallet1)
    simnet.callPublicFn(GAME, "join-game", [Cl.uint(0)], wallet2)
    const { result } = simnet.callPublicFn(GAME, "join-game", [Cl.uint(0)], wallet3)
    expect(result).toStrictEqual(ERR_NOT_WAITING)
  })

  it("joining a nonexistent game fails ERR-GAME-NOT-FOUND", () => {
    const { result } = simnet.callPublicFn(GAME, "join-game", [Cl.uint(99999)], wallet2)
    expect(result).toStrictEqual(ERR_NOT_FOUND)
  })
})

describe("player stats initialisation", () => {
  it("creator gets default stats (1200 Elo, all zeros) after first game", () => {
    simnet.callPublicFn(GAME, "create-game", [Cl.uint(0)], wallet1)
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
