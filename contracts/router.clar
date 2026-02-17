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
(define-constant ERR-INVALID-PLAYER     (err u703))
(define-constant ERR-GAME-FULL          (err u704))
(define-constant ERR-INSUFFICIENT-BALANCE (err u705))

;; -------------------------------------------------------
;; Create Game
;; -------------------------------------------------------

(define-public (create-game (wager uint))
  (let
    (
      (game-id-response (try! (contract-call? .registry create-game tx-sender wager)))
    )
    ;; Initialize escrow
    (try! (contract-call? .escrow init-game game-id-response tx-sender wager))
    
    ;; Initialize timer
    (try! (contract-call? .timer init-timeout game-id-response))
    
    ;; Transfer wager from player to escrow (via chess-token)
    ;; Note: In production, player must approve this contract first
    
    (ok game-id-response)
  )
)

;; -------------------------------------------------------
;; Join Game
;; -------------------------------------------------------

(define-public (join-game (game-id uint))
  (let
    (
      (game-info (unwrap! (contract-call? .registry get-game game-id) ERR-GAME-NOT-FOUND))
      (game-data (unwrap! game-info ERR-GAME-NOT-FOUND))
      (wager (get wager game-data))
    )
    ;; Assign black player
    (try! (contract-call? .registry assign-black game-id tx-sender))
    
    ;; Add black wager to escrow
    (try! (contract-call? .escrow add-black-wager game-id tx-sender wager))
    
    ;; Activate game
    (try! (contract-call? .registry activate-game game-id))
    
    ;; Transfer wager from player to escrow (via chess-token)
    ;; Note: In production, player must approve this contract first
    
    (ok true)
  )
)

;; -------------------------------------------------------
;; Submit Move
;; -------------------------------------------------------

(define-public (submit-move (game-id uint) (move-str (string-ascii 10)))
  (let
    (
      (game-info (unwrap! (contract-call? .registry get-game game-id) ERR-GAME-NOT-FOUND))
      (game-data (unwrap! game-info ERR-GAME-NOT-FOUND))
      (current-turn (get turn game-data))
      (move-count (get move-count game-data))
      (white-player (get white game-data))
      (black-player-opt (get black game-data))
    )
    ;; Verify it's player's turn
    (asserts! (is-eq tx-sender current-turn) ERR-NOT-YOUR-TURN)
    
    ;; Record move
    (try! (contract-call? .logic record-move game-id move-count tx-sender move-str))
    
    ;; Determine next player
    (let
      (
        (next-player (if (is-eq tx-sender white-player)
                       (unwrap! black-player-opt ERR-INVALID-PLAYER)
                       white-player))
      )
      ;; Update turn
      (try! (contract-call? .registry update-turn game-id next-player))
      
      ;; Reset timer
      (try! (contract-call? .timer reset-timer game-id))
      
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
      (game-info (unwrap! (contract-call? .registry get-game game-id) ERR-GAME-NOT-FOUND))
      (game-data (unwrap! game-info ERR-GAME-NOT-FOUND))
      (white-player (get white game-data))
      (black-player-opt (get black game-data))
      (winner (if (is-eq tx-sender white-player)
                (unwrap! black-player-opt ERR-INVALID-PLAYER)
                white-player))
    )
    ;; Record resignation
    (try! (contract-call? .logic record-resignation game-id tx-sender))
    
    ;; Finish game
    (try! (contract-call? .registry finish-game game-id (some winner)))
    
    ;; Release funds to winner
    (try! (contract-call? .escrow release-to-winner game-id winner))
    
    ;; Update rankings
    (try! (contract-call? .ranking record-win winner tx-sender))
    
    (ok winner)
  )
)

;; -------------------------------------------------------
;; Claim Timeout Win
;; -------------------------------------------------------

(define-public (claim-timeout (game-id uint))
  (let
    (
      (game-info (unwrap! (contract-call? .registry get-game game-id) ERR-GAME-NOT-FOUND))
      (game-data (unwrap! game-info ERR-GAME-NOT-FOUND))
      (white-player (get white game-data))
      (black-player-opt (get black game-data))
      (current-turn (get turn game-data))
      (winner (if (is-eq current-turn white-player)
                (unwrap! black-player-opt ERR-INVALID-PLAYER)
                white-player))
    )
    ;; Validate timeout occurred
    (try! (contract-call? .timer validate-timeout game-id))
    
    ;; Finish game
    (try! (contract-call? .registry finish-game game-id (some winner)))
    
    ;; Release funds to winner
    (try! (contract-call? .escrow release-to-winner game-id winner))
    
    ;; Update rankings (timeout victim loses)
    (try! (contract-call? .ranking record-win winner current-turn))
    
    (ok winner)
  )
)

;; -------------------------------------------------------
;; Cancel Game (only if waiting for opponent)
;; -------------------------------------------------------

(define-public (cancel-game (game-id uint))
  (let
    (
      (game-info (unwrap! (contract-call? .registry get-game game-id) ERR-GAME-NOT-FOUND))
      (game-data (unwrap! game-info ERR-GAME-NOT-FOUND))
      (white-player (get white game-data))
    )
    ;; Only white player can cancel
    (asserts! (is-eq tx-sender white-player) ERR-NOT-AUTHORIZED)
    
    ;; Cancel in registry
    (try! (contract-call? .registry cancel-game game-id))
    
    ;; Refund (only white has deposited at this point)
    (try! (contract-call? .escrow refund-game game-id))
    
    (ok true)
  )
)

;; -------------------------------------------------------
;; Read-Only: Get Full Game State
;; -------------------------------------------------------

(define-read-only (get-full-game-state (game-id uint))
  (let
    (
      (game (contract-call? .registry get-game game-id))
      (escrow (contract-call? .escrow get-escrow game-id))
      (timeout (contract-call? .timer get-timeout-info game-id))
    )
    (ok {
      game: game,
      escrow: escrow,
      timeout: timeout
    })
  )
)