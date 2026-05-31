/**
 * registry.test.ts — chess-game.clar: game creation and joining
 */
import { describe, expect, it, beforeAll } from "vitest"
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

beforeAll(() => { simnet.mineEmptyBlocks(144) })

// Helper: next game id is current total (nonce = next id)
function nextId(): number {
  const { result } = simnet.callReadOnlyFn(GAME, "get-total-games", [], wallet1)
  return Number((result as any).value.value)
}

describe("create-game (free)", () => {
  it("returns a sequential game id on each call", () => {
    const id0 = nextId()
    const { result: r1 } = simnet.callPublicFn(GAME, "create-game", [Cl.uint(0)], wallet1)
    expect(r1).toBeOk(Cl.uint(id0))

    const id1 = nextId()
    const { result: r2 } = simnet.callPublicFn(GAME, "create-game", [Cl.uint(0)], wallet2)
    expect(r2).toBeOk(Cl.uint(id1))
    expect(id1).toBe(id0 + 1)
  })

  it("get-total-games increments after each create", () => {
    const before = nextId()
    simnet.callPublicFn(GAME, "create-game", [Cl.uint(0)], wallet1)
    const { result } = simnet.callReadOnlyFn(GAME, "get-total-games", [], wallet1)
    expect(result).toBeOk(Cl.uint(before + 1))
  })

  it("new game has WAITING status (0)", () => {
    const id = nextId()
    simnet.callPublicFn(GAME, "create-game", [Cl.uint(0)], wallet1)
    const { result } = simnet.callReadOnlyFn(GAME, "get-game-status", [Cl.uint(id)], wallet1)
    expect(result).toBeOk(Cl.uint(0))
  })

  it("current turn is the creator on a waiting game", () => {
    const id = nextId()
    simnet.callPublicFn(GAME, "create-game", [Cl.uint(0)], wallet1)
    const { result } = simnet.callReadOnlyFn(GAME, "get-current-turn", [Cl.uint(id)], wallet1)
    expect(result).toBeOk(Cl.principal(wallet1))
  })
})

describe("create-game (with wager)", () => {
  it("locks white's CHESS into the vault and reduces their balance", () => {
    simnet.callPublicFn(TOKEN, "faucet-claim", [], wallet3)
    const wager = 500_000_000n
    const balBefore = BigInt((simnet.callReadOnlyFn(TOKEN, "get-balance",
      [Cl.principal(wallet3)], wallet3).result as any).value.value)

    const { result } = simnet.callPublicFn(GAME, "create-game", [Cl.uint(wager)], wallet3)
    expect(result.type).toBe(7) // ok

    const balAfter = BigInt((simnet.callReadOnlyFn(TOKEN, "get-balance",
      [Cl.principal(wallet3)], wallet3).result as any).value.value)
    expect(balAfter).toBe(balBefore - wager)
  })
})

describe("join-game", () => {
  it("opponent joins and game becomes ACTIVE (1)", () => {
    const id = nextId()
    simnet.callPublicFn(GAME, "create-game", [Cl.uint(0)], wallet1)
    const { result } = simnet.callPublicFn(GAME, "join-game", [Cl.uint(id)], wallet2)
    expect(result).toBeOk(Cl.bool(true))
    const { result: status } = simnet.callReadOnlyFn(GAME, "get-game-status", [Cl.uint(id)], wallet1)
    expect(status).toBeOk(Cl.uint(1))
  })

  it("creator cannot join their own game", () => {
    const id = nextId()
    simnet.callPublicFn(GAME, "create-game", [Cl.uint(0)], wallet1)
    const { result } = simnet.callPublicFn(GAME, "join-game", [Cl.uint(id)], wallet1)
    expect(result).toStrictEqual(ERR_INVALID_OPP)
  })

  it("cannot join an already ACTIVE game", () => {
    const id = nextId()
    simnet.callPublicFn(GAME, "create-game", [Cl.uint(0)], wallet1)
    simnet.callPublicFn(GAME, "join-game", [Cl.uint(id)], wallet2)
    const { result } = simnet.callPublicFn(GAME, "join-game", [Cl.uint(id)], wallet3)
    expect(result).toStrictEqual(ERR_NOT_WAITING)
  })

  it("joining a nonexistent game fails ERR-GAME-NOT-FOUND", () => {
    const { result } = simnet.callPublicFn(GAME, "join-game", [Cl.uint(99999)], wallet2)
    expect(result).toStrictEqual(ERR_NOT_FOUND)
  })
})

describe("player stats initialised on first game", () => {
  it("creator has default stats (1200 Elo, all zeros) after creating", () => {
    // Use wallet3 which hasn't created a game in this describe scope
    simnet.callPublicFn(GAME, "create-game", [Cl.uint(0)], wallet3)
    const { result } = simnet.callReadOnlyFn(GAME, "get-player-stats", [Cl.principal(wallet3)], wallet3)
    const s = (result as any).value.value
    expect(Number(s.rating.value)).toBe(1200)
    expect(Number(s["games-played"].value)).toBe(0)
  })
})
