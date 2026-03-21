;; ============================================================
;; chessify-gateway.clar
;; Master Orchestrator + Token Vault - Single Entry Point
;; Replaces router.clar (Contract 7 of 7)
;;
;; TOKEN FLOW:
;;   IN  (user -> contract): recipient is .chessify-gateway
;;       expressed as a self-referential principal - no as-contract needed
;;   OUT (contract -> user): (as-contract (contract-call? ...))
;;       flips tx-sender to this contract so it can sign the transfer
;;
;; Built by Velocity Labs - CHESSIFY Protocol
;; ============================================================

;; -------------------------------------------------------
;; Constants
;; -------------------------------------------------------

(define-constant CONTRACT-OWNER tx-sender)

(define-constant ERR-NOT-AUTHORIZED      (err u700))
(define-constant ERR-GAME-NOT-FOUND      (err u701))
(define-constant ERR-NOT-YOUR-TURN       (err u702))
(define-constant ERR-INVALID-OPPONENT    (err u703))
(define-constant ERR-INSUFFICIENT-FUNDS  (err u704))
(define-constant ERR-GAME-NOT-ACTIVE     (err u705))
(define-constant ERR-TRANSFER-FAILED     (err u706))

;; -------------------------------------------------------
;; Create Game
;;
;; White player transfers CHESS into this contract.
;; Recipient is .chessify-gateway (self-reference as principal).
;; No as-contract needed for receiving tokens.
;; -------------------------------------------------------

(define-public (create-game (wager uint))
  (let
    (
      (game-id (unwrap! (contract-call? .registry create-game tx-sender wager) ERR-GAME-NOT-FOUND))
    )
    ;; Lock white wager - recipient is this contract's own principal
    (if (> wager u0)
      (try! (contract-call? .chess-token transfer
        wager
        tx-sender
        .chessify-gateway
        none
      ))
      true
    )

    ;; Initialize escrow accounting
    (unwrap! (contract-call? .chess-escrow init-game game-id tx-sender wager) ERR-GAME-NOT-FOUND)

    ;; Initialize timeout clock
    (unwrap! (contract-call? .timer init-timeout game-id) ERR-GAME-NOT-FOUND)

    (ok game-id)
  )
)

;; -------------------------------------------------------
;; Join Game
;;
;; Black player transfers matching CHESS into this contract.
;; Both wagers are now held by .chessify-gateway.
;; -------------------------------------------------------

(define-public (join-game (game-id uint))
  (let
    (
      (game-opt     (unwrap! (contract-call? .registry get-game game-id) ERR-GAME-NOT-FOUND))
      (game         (unwrap! game-opt ERR-GAME-NOT-FOUND))
      (wager        (get wager game))
      (white-player (get white game))
    )
    ;; Caller cannot be the white player
    (asserts! (not (is-eq tx-sender white-player)) ERR-INVALID-OPPONENT)

    ;; Lock black wager into this contract
    (if (> wager u0)
      (try! (contract-call? .chess-token transfer
        wager
        tx-sender
        .chessify-gateway
        none
      ))
      true
    )

    ;; Register black player
    (unwrap! (contract-call? .registry assign-black game-id tx-sender) ERR-GAME-NOT-FOUND)

    ;; Update escrow accounting
    (unwrap! (contract-call? .chess-escrow add-black-wager game-id tx-sender wager) ERR-GAME-NOT-FOUND)

    ;; Activate game - both players locked in
    (unwrap! (contract-call? .registry activate-game game-id) ERR-GAME-NOT-FOUND)

    (ok true)
  )
)

;; -------------------------------------------------------
;; Submit Move
;; No token movement - unchanged from router.clar
;; -------------------------------------------------------

(define-public (submit-move (game-id uint) (move-str (string-ascii 10)))
  (let
    (
      (game-opt         (unwrap! (contract-call? .registry get-game game-id) ERR-GAME-NOT-FOUND))
      (game             (unwrap! game-opt ERR-GAME-NOT-FOUND))
      (current-turn     (get turn game))
      (move-count       (get move-count game))
      (white-player     (get white game))
      (black-player-opt (get black game))
    )
    (asserts! (is-eq tx-sender current-turn) ERR-NOT-YOUR-TURN)

    (unwrap! (contract-call? .logic record-move game-id move-count tx-sender move-str) ERR-GAME-NOT-FOUND)

    (let
      (
        (next-player (if (is-eq tx-sender white-player)
                       (unwrap! black-player-opt ERR-GAME-NOT-FOUND)
                       white-player))
      )
      (unwrap! (contract-call? .registry update-turn game-id next-player) ERR-GAME-NOT-FOUND)
      (unwrap! (contract-call? .timer reset-timer game-id) ERR-GAME-NOT-FOUND)
      (ok true)
    )
  )
)

;; -------------------------------------------------------
;; Resign
;;
;; Gateway releases combined wager to the winner.
;; (as-contract ...) is valid here because it wraps a
;; contract-call - this is the only supported usage.
;; caller is captured before as-contract flips tx-sender.
;; -------------------------------------------------------

(define-public (resign (game-id uint))
  (let
    (
      (game-opt         (unwrap! (contract-call? .registry get-game game-id) ERR-GAME-NOT-FOUND))
      (game             (unwrap! game-opt ERR-GAME-NOT-FOUND))
      (white-player     (get white game))
      (black-player-opt (get black game))
      (caller           tx-sender)
      (winner           (if (is-eq tx-sender white-player)
                          (unwrap! black-player-opt ERR-GAME-NOT-FOUND)
                          white-player))
      (total-payout     (* (get wager game) u2))
    )
    (unwrap! (contract-call? .logic record-resignation game-id caller) ERR-GAME-NOT-FOUND)
    (unwrap! (contract-call? .registry finish-game game-id (some winner)) ERR-GAME-NOT-FOUND)
    (unwrap! (contract-call? .chess-escrow release-to-winner game-id winner) ERR-GAME-NOT-FOUND)

    ;; Release tokens - as-contract wraps contract-call (valid usage)
    (if (> total-payout u0)
      (try! (as-contract (contract-call? .chess-token transfer
        total-payout
        tx-sender
        winner
        none
      )))
      true
    )

    ;; Use captured caller - tx-sender is now the contract inside as-contract
    (unwrap! (contract-call? .ranking record-win winner caller) ERR-GAME-NOT-FOUND)

    (ok winner)
  )
)

;; -------------------------------------------------------
;; Claim Timeout Win
;; -------------------------------------------------------

(define-public (claim-timeout (game-id uint))
  (let
    (
      (game-opt         (unwrap! (contract-call? .registry get-game game-id) ERR-GAME-NOT-FOUND))
      (game             (unwrap! game-opt ERR-GAME-NOT-FOUND))
      (white-player     (get white game))
      (black-player-opt (get black game))
      (current-turn     (get turn game))
      (winner           (if (is-eq current-turn white-player)
                          (unwrap! black-player-opt ERR-GAME-NOT-FOUND)
                          white-player))
      (loser            current-turn)
      (total-payout     (* (get wager game) u2))
    )
    (unwrap! (contract-call? .timer validate-timeout game-id) ERR-GAME-NOT-FOUND)
    (unwrap! (contract-call? .registry finish-game game-id (some winner)) ERR-GAME-NOT-FOUND)
    (unwrap! (contract-call? .chess-escrow release-to-winner game-id winner) ERR-GAME-NOT-FOUND)

    (if (> total-payout u0)
      (try! (as-contract (contract-call? .chess-token transfer
        total-payout
        tx-sender
        winner
        none
      )))
      true
    )

    (unwrap! (contract-call? .ranking record-win winner loser) ERR-GAME-NOT-FOUND)
    (ok winner)
  )
)

;; -------------------------------------------------------
;; Cancel Game
;; Refunds white's wager if no opponent has joined yet
;; -------------------------------------------------------

(define-public (cancel-game (game-id uint))
  (let
    (
      (game-opt     (unwrap! (contract-call? .registry get-game game-id) ERR-GAME-NOT-FOUND))
      (game         (unwrap! game-opt ERR-GAME-NOT-FOUND))
      (white-player (get white game))
      (wager        (get wager game))
    )
    (asserts! (is-eq tx-sender white-player) ERR-NOT-AUTHORIZED)

    (unwrap! (contract-call? .registry cancel-game game-id) ERR-GAME-NOT-FOUND)
    (unwrap! (contract-call? .chess-escrow refund-game game-id) ERR-GAME-NOT-FOUND)

    (if (> wager u0)
      (try! (as-contract (contract-call? .chess-token transfer
        wager
        tx-sender
        white-player
        none
      )))
      true
    )

    (ok true)
  )
)

;; -------------------------------------------------------
;; Read-Only
;; -------------------------------------------------------

(define-read-only (get-game-info (game-id uint))
  (contract-call? .registry get-game game-id)
)

(define-read-only (get-game-status (game-id uint))
  (contract-call? .registry get-game-status game-id)
)

(define-read-only (get-player-stats (player principal))
  (contract-call? .ranking get-player-stats player)
)

(define-read-only (get-move-history (game-id uint) (move-number uint))
  (contract-call? .logic get-move game-id move-number)
)

(define-read-only (get-escrow-info (game-id uint))
  (contract-call? .chess-escrow get-escrow game-id)
)
