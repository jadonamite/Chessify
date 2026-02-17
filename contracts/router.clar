;; ============================================================
;; router.clar
;; Master Orchestrator - Single Entry Point
;; Contract 7 of 7 - Chess Protocol on Stacks
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

;; -------------------------------------------------------
;; Create Game
;; -------------------------------------------------------

(define-public (create-game (wager uint))
  (let
    (
      (game-id (unwrap! (contract-call? .registry create-game tx-sender wager) ERR-GAME-NOT-FOUND))
    )
    ;; Initialize escrow
    (unwrap! (contract-call? .escrow init-game game-id tx-sender wager) ERR-GAME-NOT-FOUND)
    
    ;; Initialize timeout
    (unwrap! (contract-call? .timer init-timeout game-id) ERR-GAME-NOT-FOUND)
    
    (ok game-id)
  )
)

;; -------------------------------------------------------
;; Join Game
;; -------------------------------------------------------

(define-public (join-game (game-id uint))
  (let
    (
      (game-opt (unwrap! (contract-call? .registry get-game game-id) ERR-GAME-NOT-FOUND))
      (game (unwrap! game-opt ERR-GAME-NOT-FOUND))
      (wager (get wager game))
      (white-player (get white game))
    )
    ;; Ensure caller is not white player
    (asserts! (not (is-eq tx-sender white-player)) ERR-INVALID-OPPONENT)
    
    ;; Assign black player
    (unwrap! (contract-call? .registry assign-black game-id tx-sender) ERR-GAME-NOT-FOUND)
    
    ;; Add black wager to escrow
    (unwrap! (contract-call? .escrow add-black-wager game-id tx-sender wager) ERR-GAME-NOT-FOUND)
    
    ;; Activate game
    (unwrap! (contract-call? .registry activate-game game-id) ERR-GAME-NOT-FOUND)
    
    (ok true)
  )
)

;; -------------------------------------------------------
;; Submit Move
;; -------------------------------------------------------

(define-public (submit-move (game-id uint) (move-str (string-ascii 10)))
  (let
    (
      (game-opt (unwrap! (contract-call? .registry get-game game-id) ERR-GAME-NOT-FOUND))
      (game (unwrap! game-opt ERR-GAME-NOT-FOUND))
      (current-turn (get turn game))
      (move-count (get move-count game))
      (white-player (get white game))
      (black-player-opt (get black game))
    )
    ;; Verify it's caller's turn
    (asserts! (is-eq tx-sender current-turn) ERR-NOT-YOUR-TURN)
    
    ;; Record move
    (unwrap! (contract-call? .logic record-move game-id move-count tx-sender move-str) ERR-GAME-NOT-FOUND)
    
    ;; Determine next player
    (let
      (
        (next-player (if (is-eq tx-sender white-player)
                       (unwrap! black-player-opt ERR-GAME-NOT-FOUND)
                       white-player))
      )
      ;; Update turn in registry
      (unwrap! (contract-call? .registry update-turn game-id next-player) ERR-GAME-NOT-FOUND)
      
      ;; Reset timer
      (unwrap! (contract-call? .timer reset-timer game-id) ERR-GAME-NOT-FOUND)
      
      (ok true)
    )
  )
)

;; -------------------------------------------------------
;; Resign
;; -------------------------------------------------------

(define-public (resign (game-id uint))
  (let
    (
      (game-opt (unwrap! (contract-call? .registry get-game game-id) ERR-GAME-NOT-FOUND))
      (game (unwrap! game-opt ERR-GAME-NOT-FOUND))
      (white-player (get white game))
      (black-player-opt (get black game))
      (winner (if (is-eq tx-sender white-player)
                (unwrap! black-player-opt ERR-GAME-NOT-FOUND)
                white-player))
    )
    ;; Record resignation
    (unwrap! (contract-call? .logic record-resignation game-id tx-sender) ERR-GAME-NOT-FOUND)
    
    ;; Finish game
    (unwrap! (contract-call? .registry finish-game game-id (some winner)) ERR-GAME-NOT-FOUND)
    
    ;; Release escrow to winner
    (unwrap! (contract-call? .escrow release-to-winner game-id winner) ERR-GAME-NOT-FOUND)
    
    ;; Update rankings
    (unwrap! (contract-call? .ranking record-win winner tx-sender) ERR-GAME-NOT-FOUND)
    
    (ok winner)
  )
)

;; -------------------------------------------------------
;; Claim Timeout Win
;; -------------------------------------------------------

(define-public (claim-timeout (game-id uint))
  (let
    (
      (game-opt (unwrap! (contract-call? .registry get-game game-id) ERR-GAME-NOT-FOUND))
      (game (unwrap! game-opt ERR-GAME-NOT-FOUND))
      (white-player (get white game))
      (black-player-opt (get black game))
      (current-turn (get turn game))
      (winner (if (is-eq current-turn white-player)
                (unwrap! black-player-opt ERR-GAME-NOT-FOUND)
                white-player))
      (loser current-turn)
    )
    ;; Validate timeout
    (unwrap! (contract-call? .timer validate-timeout game-id) ERR-GAME-NOT-FOUND)
    
    ;; Finish game
    (unwrap! (contract-call? .registry finish-game game-id (some winner)) ERR-GAME-NOT-FOUND)
    
    ;; Release escrow to winner
    (unwrap! (contract-call? .escrow release-to-winner game-id winner) ERR-GAME-NOT-FOUND)
    
    ;; Update rankings
    (unwrap! (contract-call? .ranking record-win winner loser) ERR-GAME-NOT-FOUND)
    
    (ok winner)
  )
)

;; -------------------------------------------------------
;; Cancel Game (only if waiting for opponent)
;; -------------------------------------------------------

(define-public (cancel-game (game-id uint))
  (let
    (
      (game-opt (unwrap! (contract-call? .registry get-game game-id) ERR-GAME-NOT-FOUND))
      (game (unwrap! game-opt ERR-GAME-NOT-FOUND))
      (white-player (get white game))
    )
    ;; Only white player can cancel
    (asserts! (is-eq tx-sender white-player) ERR-NOT-AUTHORIZED)
    
    ;; Cancel in registry
    (unwrap! (contract-call? .registry cancel-game game-id) ERR-GAME-NOT-FOUND)
    
    ;; Refund escrow
    (unwrap! (contract-call? .escrow refund-game game-id) ERR-GAME-NOT-FOUND)
    
    (ok true)
  )
)

;; -------------------------------------------------------
;; Read-Only: Get Game Info
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