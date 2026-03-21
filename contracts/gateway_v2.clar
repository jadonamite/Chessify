;; ============================================================
;; gateway.clar
;; Master Orchestrator - Single Entry Point
;; Contract 7 of 7 - Chess Protocol on Stacks
;;
;; CLARITY 4 TOKEN FLOW (no as-contract):
;;   IN:  user calls chess-token.transfer to .chess-token vault
;;   OUT: gateway calls chess-token.gateway-release to winner
;;        ft-transfer? inside chess-token needs no as-contract
;;
;; Built by Velocity Labs - CHESSIFY Protocol
;; ============================================================

;; -------------------------------------------------------
;; Constants
;; -------------------------------------------------------

(define-constant CONTRACT-OWNER tx-sender)

(define-constant ERR-NOT-AUTHORIZED     (err u700))
(define-constant ERR-GAME-NOT-FOUND     (err u701))
(define-constant ERR-NOT-YOUR-TURN      (err u702))
(define-constant ERR-INVALID-OPPONENT   (err u703))
(define-constant ERR-INSUFFICIENT-FUNDS (err u704))
(define-constant ERR-GAME-NOT-ACTIVE    (err u705))
(define-constant ERR-TRANSFER-FAILED    (err u706))

;; -------------------------------------------------------
;; Create Game
;;
;; White transfers CHESS to .chess-token vault.
;; Standard SIP-010 transfer - user is tx-sender, works in Clarity 4.
;; -------------------------------------------------------

(define-public (create-game (wager uint))
  (let
    (
      (game-id (unwrap! (contract-call? .registry create-game tx-sender wager) ERR-GAME-NOT-FOUND))
    )
    ;; Lock white wager into chess-token vault (skip if free game)
    (if (> wager u0)
      (try! (contract-call? .chess-token_v2 transfer
        wager
        tx-sender
        .chess-token
        none
      ))
      true
    )

    (unwrap! (contract-call? .chess-escrow init-game game-id tx-sender wager) ERR-GAME-NOT-FOUND)
    (unwrap! (contract-call? .timer init-timeout game-id) ERR-GAME-NOT-FOUND)

    (ok game-id)
  )
)

;; -------------------------------------------------------
;; Join Game
;;
;; Black transfers CHESS to .chess-token vault.
;; Both wagers now sit in the token contract's own balance.
;; -------------------------------------------------------

(define-public (join-game (game-id uint))
  (let
    (
      (game-opt     (unwrap! (contract-call? .registry get-game game-id) ERR-GAME-NOT-FOUND))
      (game         (unwrap! game-opt ERR-GAME-NOT-FOUND))
      (wager        (get wager game))
      (white-player (get white game))
    )
    (asserts! (not (is-eq tx-sender white-player)) ERR-INVALID-OPPONENT)

    ;; Lock black wager into chess-token vault
    (if (> wager u0)
      (try! (contract-call? .chess-token_v2 transfer
        wager
        tx-sender
        .chess-token
        none
      ))
      true
    )

    (unwrap! (contract-call? .registry assign-black game-id tx-sender) ERR-GAME-NOT-FOUND)
    (unwrap! (contract-call? .chess-escrow add-black-wager game-id tx-sender wager) ERR-GAME-NOT-FOUND)
    (unwrap! (contract-call? .registry activate-game game-id) ERR-GAME-NOT-FOUND)

    (ok true)
  )
)

;; -------------------------------------------------------
;; Submit Move - no token movement
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
;; Calls chess-token.gateway-release which uses ft-transfer?
;; internally - no as-contract needed anywhere.
;; Capture caller before any contract calls change context.
;; -------------------------------------------------------

(define-public (resign (game-id uint))
  (let
    (
      (caller           tx-sender)
      (game-opt         (unwrap! (contract-call? .registry get-game game-id) ERR-GAME-NOT-FOUND))
      (game             (unwrap! game-opt ERR-GAME-NOT-FOUND))
      (white-player     (get white game))
      (black-player-opt (get black game))
      (winner           (if (is-eq caller white-player)
                          (unwrap! black-player-opt ERR-GAME-NOT-FOUND)
                          white-player))
      (total-payout     (* (get wager game) u2))
    )
    (unwrap! (contract-call? .logic record-resignation game-id caller) ERR-GAME-NOT-FOUND)
    (unwrap! (contract-call? .registry finish-game game-id (some winner)) ERR-GAME-NOT-FOUND)
    (unwrap! (contract-call? .chess-escrow release-to-winner game-id winner) ERR-GAME-NOT-FOUND)

    ;; Release tokens via chess-token's privileged gateway-release
    (if (> total-payout u0)
      (try! (contract-call? .chess-token_v2 gateway-release total-payout winner))
      true
    )

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
      (try! (contract-call? .chess-token_v2 gateway-release total-payout winner))
      true
    )

    (unwrap! (contract-call? .ranking record-win winner loser) ERR-GAME-NOT-FOUND)
    (ok winner)
  )
)

;; -------------------------------------------------------
;; Cancel Game - refund white if no opponent joined yet
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
      (try! (contract-call? .chess-token_v2 gateway-release wager white-player))
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
