;; ============================================================
;; registry.clar
;; Game State Authority
;; Contract 3 of 7 - Chess Protocol on Stacks
;; ============================================================

;; -------------------------------------------------------
;; Constants
;; -------------------------------------------------------

(define-constant CONTRACT-OWNER tx-sender)

;; Game status codes
(define-constant STATUS-WAITING u0)
(define-constant STATUS-ACTIVE u1)
(define-constant STATUS-FINISHED u2)
(define-constant STATUS-CANCELLED u3)

;; Error codes
(define-constant ERR-NOT-AUTHORIZED     (err u300))
(define-constant ERR-GAME-NOT-FOUND     (err u301))
(define-constant ERR-GAME-FULL          (err u302))
(define-constant ERR-GAME-ALREADY-ACTIVE (err u303))
(define-constant ERR-INVALID-STATUS     (err u304))
(define-constant ERR-NOT-YOUR-TURN      (err u305))

;; -------------------------------------------------------
;; Storage
;; -------------------------------------------------------

(define-data-var game-nonce uint u0)

(define-map games
  uint  ;; game-id
  {
    white: principal,
    black: (optional principal),
    wager: uint,
    status: uint,
    turn: principal,
    move-count: uint,
    created-at: uint,
    last-move-at: uint,
    winner: (optional principal)
  }
)

;; -------------------------------------------------------
;; Create Game
;; -------------------------------------------------------

(define-public (create-game (white principal) (wager uint))
  (let
    (
      (game-id (var-get game-nonce))
    )
    (map-set games game-id {
      white: white,
      black: none,
      wager: wager,
      status: STATUS-WAITING,
      turn: white,
      move-count: u0,
      created-at: stacks-block-height,
      last-move-at: stacks-block-height,
      winner: none
    })
    (var-set game-nonce (+ game-id u1))
    (ok game-id)
  )
)

;; -------------------------------------------------------
;; Assign Black Player
;; -------------------------------------------------------

(define-public (assign-black (game-id uint) (black principal))
  (let
    (
      (game (unwrap! (map-get? games game-id) ERR-GAME-NOT-FOUND))
    )
    (asserts! (is-eq (get status game) STATUS-WAITING) ERR-GAME-ALREADY-ACTIVE)
    (asserts! (is-none (get black game)) ERR-GAME-FULL)
    
    (map-set games game-id
      (merge game { black: (some black) })
    )
    (ok true)
  )
)

;; -------------------------------------------------------
;; Activate Game
;; -------------------------------------------------------

(define-public (activate-game (game-id uint))
  (let
    (
      (game (unwrap! (map-get? games game-id) ERR-GAME-NOT-FOUND))
    )
    (asserts! (is-eq (get status game) STATUS-WAITING) ERR-INVALID-STATUS)
    (asserts! (is-some (get black game)) ERR-GAME-NOT-FOUND)
    
    (map-set games game-id
      (merge game { 
        status: STATUS-ACTIVE,
        last-move-at: stacks-block-height
      })
    )
    (ok true)
  )
)

;; -------------------------------------------------------
;; Update Turn
;; -------------------------------------------------------

(define-public (update-turn (game-id uint) (next-player principal))
  (let
    (
      (game (unwrap! (map-get? games game-id) ERR-GAME-NOT-FOUND))
    )
    (asserts! (is-eq (get status game) STATUS-ACTIVE) ERR-INVALID-STATUS)
    
    (map-set games game-id
      (merge game {
        turn: next-player,
        move-count: (+ (get move-count game) u1),
        last-move-at: stacks-block-height
      })
    )
    (ok true)
  )
)

;; -------------------------------------------------------
;; Finish Game
;; -------------------------------------------------------

(define-public (finish-game (game-id uint) (winner-principal (optional principal)))
  (let
    (
      (game (unwrap! (map-get? games game-id) ERR-GAME-NOT-FOUND))
    )
    (map-set games game-id
      (merge game {
        status: STATUS-FINISHED,
        winner: winner-principal
      })
    )
    (ok true)
  )
)

;; -------------------------------------------------------
;; Cancel Game
;; -------------------------------------------------------

(define-public (cancel-game (game-id uint))
  (let
    (
      (game (unwrap! (map-get? games game-id) ERR-GAME-NOT-FOUND))
    )
    (asserts! (is-eq (get status game) STATUS-WAITING) ERR-INVALID-STATUS)
    
    (map-set games game-id
      (merge game { status: STATUS-CANCELLED })
    )
    (ok true)
  )
)

;; -------------------------------------------------------
;; Read-Only Functions
;; -------------------------------------------------------

(define-read-only (get-game (game-id uint))
  (ok (map-get? games game-id))
)

(define-read-only (get-game-status (game-id uint))
  (ok (get status (unwrap! (map-get? games game-id) ERR-GAME-NOT-FOUND)))
)

(define-read-only (get-current-turn (game-id uint))
  (ok (get turn (unwrap! (map-get? games game-id) ERR-GAME-NOT-FOUND)))
)
(define-read-only (get-move-count (game-id uint))
  (ok (get move-count (unwrap! (map-get? games game-id) ERR-GAME-NOT-FOUND)))
)

(define-read-only (get-winner (game-id uint))
  (ok (get winner (unwrap! (map-get? games game-id) ERR-GAME-NOT-FOUND)))
)

(define-read-only (get-last-move-height (game-id uint))
  (ok (get last-move-at (unwrap! (map-get? games game-id) ERR-GAME-NOT-FOUND)))
)

(define-read-only (get-total-games)
  (ok (var-get game-nonce))
)