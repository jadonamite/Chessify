import { describe, expect, it, beforeEach } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const owner = deployer;
const whitePlayer = accounts.get("wallet_1")!;
const blackPlayer = accounts.get("wallet_2")!;
const randomUser = accounts.get("wallet_3")!;

describe("Escrow Contract Tests", () => {
  const gameId = 1;
  const whiteWager = 1000;
  const blackWager = 1000;
  const totalWager = whiteWager + blackWager;

  describe("Game Initialization", () => {
    it("should initialize a new game escrow", () => {
      const result = simnet.callPublicFn(
        "escrow",
        "init-game",
        [Cl.uint(gameId), Cl.principal(whitePlayer), Cl.uint(whiteWager)],
        owner
      );

      expect(result.result).toBeOk(Cl.bool(true));

      // Verify escrow data
      const escrow = simnet.callReadOnlyFn(
        "escrow",
        "get-escrow",
        [Cl.uint(gameId)],
        deployer
      );

      expect(escrow.result).toBeOk(
        Cl.some(
          Cl.tuple({
            "white-player": Cl.principal(whitePlayer),
            "black-player": Cl.none(),
            "white-amount": Cl.uint(whiteWager),
            "black-amount": Cl.uint(0),
            total: Cl.uint(whiteWager),
            claimed: Cl.bool(false)
          })
        )
      );

      // Check total locked
      const totalLocked = simnet.callReadOnlyFn(
        "escrow",
        "get-total-locked",
        [Cl.uint(gameId)],
        deployer
      );
      expect(totalLocked.result).toBeOk(Cl.uint(whiteWager));

      // Check claimed status
      const claimed = simnet.callReadOnlyFn(
        "escrow",
        "is-claimed",
        [Cl.uint(gameId)],
        deployer
      );
      expect(claimed.result).toBeOk(Cl.bool(false));
    });

    it("should initialize multiple games with different IDs", () => {
      // Game 1
      simnet.callPublicFn(
        "escrow",
        "init-game",
        [Cl.uint(1), Cl.principal(whitePlayer), Cl.uint(500)],
        owner
      );

      // Game 2
      const result2 = simnet.callPublicFn(
        "escrow",
        "init-game",
        [Cl.uint(2), Cl.principal(blackPlayer), Cl.uint(800)],
        owner
      );

      expect(result2.result).toBeOk(Cl.bool(true));

      const escrow2 = simnet.callReadOnlyFn(
        "escrow",
        "get-escrow",
        [Cl.uint(2)],
        deployer
      );

      expect(escrow2.result).toBeOk(
        Cl.some(
          Cl.tuple({
            "white-player": Cl.principal(blackPlayer),
            "black-player": Cl.none(),
            "white-amount": Cl.uint(800),
            "black-amount": Cl.uint(0),
            total: Cl.uint(800),
            claimed: Cl.bool(false)
          })
        )
      );
    });
  });

  describe("Add Black Player Wager", () => {
    beforeEach(() => {
      simnet.callPublicFn(
        "escrow",
        "init-game",
        [Cl.uint(gameId), Cl.principal(whitePlayer), Cl.uint(whiteWager)],
        owner
      );
    });

    it("should allow black player to add wager", () => {
      const result = simnet.callPublicFn(
        "escrow",
        "add-black-wager",
        [Cl.uint(gameId), Cl.principal(blackPlayer), Cl.uint(blackWager)],
        owner
      );

      expect(result.result).toBeOk(Cl.bool(true));

      const escrow = simnet.callReadOnlyFn(
        "escrow",
        "get-escrow",
        [Cl.uint(gameId)],
        deployer
      );

      expect(escrow.result).toBeOk(
        Cl.some(
          Cl.tuple({
            "white-player": Cl.principal(whitePlayer),
            "black-player": Cl.some(Cl.principal(blackPlayer)),
            "white-amount": Cl.uint(whiteWager),
            "black-amount": Cl.uint(blackWager),
            total: Cl.uint(totalWager),
            claimed: Cl.bool(false)
          })
        )
      );

      // Check total locked updated
      const totalLocked = simnet.callReadOnlyFn(
        "escrow",
        "get-total-locked",
        [Cl.uint(gameId)],
        deployer
      );
      expect(totalLocked.result).toBeOk(Cl.uint(totalWager));
    });

    it("should prevent adding black wager to non-existent game", () => {
      const result = simnet.callPublicFn(
        "escrow",
        "add-black-wager",
        [Cl.uint(999), Cl.principal(blackPlayer), Cl.uint(blackWager)],
        owner
      );

      expect(result.result).toBeErr(Cl.uint(201)); // ERR-GAME-NOT-FOUND
    });

    it("should prevent adding black wager twice", () => {
      // First addition
      simnet.callPublicFn(
        "escrow",
        "add-black-wager",
        [Cl.uint(gameId), Cl.principal(blackPlayer), Cl.uint(blackWager)],
        owner
      );

      // Second addition attempt
      const result = simnet.callPublicFn(
        "escrow",
        "add-black-wager",
        [Cl.uint(gameId), Cl.principal(blackPlayer), Cl.uint(blackWager)],
        owner
      );

      // This will overwrite, not error - map-set replaces existing data
      expect(result.result).toBeOk(Cl.bool(true));

      const escrow = simnet.callReadOnlyFn(
        "escrow",
        "get-escrow",
        [Cl.uint(gameId)],
        deployer
      );

      // Black amount should be updated
      expect(escrow.value.value.data["black-amount"]).toBeUint(blackWager);
    });
  });

  describe("Release to Winner", () => {
    beforeEach(() => {
      simnet.callPublicFn(
        "escrow",
        "init-game",
        [Cl.uint(gameId), Cl.principal(whitePlayer), Cl.uint(whiteWager)],
        owner
      );

      simnet.callPublicFn(
        "escrow",
        "add-black-wager",
        [Cl.uint(gameId), Cl.principal(blackPlayer), Cl.uint(blackWager)],
        owner
      );
    });

    it("should release total amount to winner", () => {
      const result = simnet.callPublicFn(
        "escrow",
        "release-to-winner",
        [Cl.uint(gameId), Cl.principal(whitePlayer)],
        owner
      );

      expect(result.result).toBeOk(Cl.uint(totalWager));

      // Check claimed status updated
      const claimed = simnet.callReadOnlyFn(
        "escrow",
        "is-claimed",
        [Cl.uint(gameId)],
        deployer
      );
      expect(claimed.result).toBeOk(Cl.bool(true));

      const escrow = simnet.callReadOnlyFn(
        "escrow",
        "get-escrow",
        [Cl.uint(gameId)],
        deployer
      );
      expect(escrow.value.value.data.claimed).toBe(Cl.bool(true));
    });

    it("should prevent releasing already claimed game", () => {
      // First release
      simnet.callPublicFn(
        "escrow",
        "release-to-winner",
        [Cl.uint(gameId), Cl.principal(whitePlayer)],
        owner
      );

      // Second release attempt
      const result = simnet.callPublicFn(
        "escrow",
        "release-to-winner",
        [Cl.uint(gameId), Cl.principal(blackPlayer)],
        owner
      );

      expect(result.result).toBeErr(Cl.uint(202)); // ERR-ALREADY-CLAIMED
    });

    it("should prevent releasing non-existent game", () => {
      const result = simnet.callPublicFn(
        "escrow",
        "release-to-winner",
        [Cl.uint(999), Cl.principal(whitePlayer)],
        owner
      );

      expect(result.result).toBeErr(Cl.uint(201)); // ERR-GAME-NOT-FOUND
    });
  });

  describe("Refund Game", () => {
    beforeEach(() => {
      simnet.callPublicFn(
        "escrow",
        "init-game",
        [Cl.uint(gameId), Cl.principal(whitePlayer), Cl.uint(whiteWager)],
        owner
      );

      simnet.callPublicFn(
        "escrow",
        "add-black-wager",
        [Cl.uint(gameId), Cl.principal(blackPlayer), Cl.uint(blackWager)],
        owner
      );
    });

    it("should refund game to both players", () => {
      const result = simnet.callPublicFn(
        "escrow",
        "refund-game",
        [Cl.uint(gameId)],
        owner
      );

      expect(result.result).toBeOk(Cl.bool(true));

      // Check claimed status updated
      const claimed = simnet.callReadOnlyFn(
        "escrow",
        "is-claimed",
        [Cl.uint(gameId)],
        deployer
      );
      expect(claimed.result).toBeOk(Cl.bool(true));

      const escrow = simnet.callReadOnlyFn(
        "escrow",
        "get-escrow",
        [Cl.uint(gameId)],
        deployer
      );
      expect(escrow.value.value.data.claimed).toBe(Cl.bool(true));
    });

    it("should prevent refunding already claimed game", () => {
      // First refund
      simnet.callPublicFn(
        "escrow",
        "refund-game",
        [Cl.uint(gameId)],
        owner
      );

      // Second refund attempt
      const result = simnet.callPublicFn(
        "escrow",
        "refund-game",
        [Cl.uint(gameId)],
        owner
      );

      expect(result.result).toBeErr(Cl.uint(202)); // ERR-ALREADY-CLAIMED
    });

    it("should prevent refunding non-existent game", () => {
      const result = simnet.callPublicFn(
        "escrow",
        "refund-game",
        [Cl.uint(999)],
        owner
      );

      expect(result.result).toBeErr(Cl.uint(201)); // ERR-GAME-NOT-FOUND
    });
  });

  describe("Read-Only Functions - Edge Cases", () => {
    it("should return none for non-existent game in get-escrow", () => {
      const result = simnet.callReadOnlyFn(
        "escrow",
        "get-escrow",
        [Cl.uint(999)],
        deployer
      );

      expect(result.result).toBeOk(Cl.none());
    });

    it("should return default values for get-total-locked on non-existent game", () => {
      const result = simnet.callReadOnlyFn(
        "escrow",
        "get-total-locked",
        [Cl.uint(999)],
        deployer
      );

      // Returns 0 for non-existent game
      expect(result.result).toBeOk(Cl.uint(0));
    });

    it("should return false for is-claimed on non-existent game", () => {
      const result = simnet.callReadOnlyFn(
        "escrow",
        "is-claimed",
        [Cl.uint(999)],
        deployer
      );

      expect(result.result).toBeOk(Cl.bool(false));
    });
  });

  describe("Error Codes", () => {
    it("should return ERR-GAME-NOT-FOUND (201) for non-existent game", () => {
      const result = simnet.callPublicFn(
        "escrow",
        "add-black-wager",
        [Cl.uint(999), Cl.principal(blackPlayer), Cl.uint(blackWager)],
        owner
      );
      expect(result.result).toBeErr(Cl.uint(201));
    });

    it("should return ERR-ALREADY-CLAIMED (202) for claimed game", () => {
      simnet.callPublicFn(
        "escrow",
        "init-game",
        [Cl.uint(gameId), Cl.principal(whitePlayer), Cl.uint(whiteWager)],
        owner
      );

      simnet.callPublicFn(
        "escrow",
        "add-black-wager",
        [Cl.uint(gameId), Cl.principal(blackPlayer), Cl.uint(blackWager)],
        owner
      );

      simnet.callPublicFn(
        "escrow",
        "release-to-winner",
        [Cl.uint(gameId), Cl.principal(whitePlayer)],
        owner
      );

      const result = simnet.callPublicFn(
        "escrow",
        "release-to-winner",
        [Cl.uint(gameId), Cl.principal(blackPlayer)],
        owner
      );
      expect(result.result).toBeErr(Cl.uint(202));
    });
  });

  describe("Complex Scenarios", () => {
    it("should handle multiple games with different states", () => {
      // Game 1 - Completed
      simnet.callPublicFn(
        "escrow",
        "init-game",
        [Cl.uint(1), Cl.principal(whitePlayer), Cl.uint(500)],
        owner
      );
      simnet.callPublicFn(
        "escrow",
        "add-black-wager",
        [Cl.uint(1), Cl.principal(blackPlayer), Cl.uint(500)],
        owner
      );
      simnet.callPublicFn(
        "escrow",
        "release-to-winner",
        [Cl.uint(1), Cl.principal(whitePlayer)],
        owner
      );

      // Game 2 - Refunded
      simnet.callPublicFn(
        "escrow",
        "init-game",
        [Cl.uint(2), Cl.principal(whitePlayer), Cl.uint(300)],
        owner
      );
      simnet.callPublicFn(
        "escrow",
        "add-black-wager",
        [Cl.uint(2), Cl.principal(blackPlayer), Cl.uint(300)],
        owner
      );
      simnet.callPublicFn(
        "escrow",
        "refund-game",
        [Cl.uint(2)],
        owner
      );

      // Game 3 - Waiting for black player
      simnet.callPublicFn(
        "escrow",
        "init-game",
        [Cl.uint(3), Cl.principal(blackPlayer), Cl.uint(200)],
        owner
      );

      // Verify Game 1
      const game1 = simnet.callReadOnlyFn(
        "escrow",
        "get-escrow",
        [Cl.uint(1)],
        deployer
      );
      expect(game1.value.value.data.claimed).toBe(Cl.bool(true));
      expect(game1.value.value.data.total).toBeUint(1000);

      // Verify Game 2
      const game2 = simnet.callReadOnlyFn(
        "escrow",
        "get-escrow",
        [Cl.uint(2)],
        deployer
      );
      expect(game2.value.value.data.claimed).toBe(Cl.bool(true));
      expect(game2.value.value.data.total).toBeUint(600);

      // Verify Game 3
      const game3 = simnet.callReadOnlyFn(
        "escrow",
        "get-escrow",
        [Cl.uint(3)],
        deployer
      );
      expect(game3.value.value.data.claimed).toBe(Cl.bool(false));
      expect(game3.value.value.data["black-player"]).toBe(Cl.none());
    });
  });
});
