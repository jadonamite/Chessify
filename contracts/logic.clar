;; ============================================================
;; logic.clar
;; Move Engine and Turn Enforcer
;; Contract 4 of 7 - Chess Protocol on Stacks
;; ============================================================

;; -------------------------------------------------------
;; Constants
;; -------------------------------------------------------

(define-constant CONTRACT-OWNER tx-sender)

(define-constant ERR-NOT-AUTHORIZED     (err u400))
(define-constant ERR-GAME-NOT-FOUND     (err u401))
(define-constant ERR-NOT-YOUR-TURN      (err u402))
(define-constant ERR-GAME-NOT-ACTIVE    (err u403))
(define-constant ERR-MOVE-NOT-FOUND     (err u404))

;; -------------------------------------------------------
;; Storage
;; -------------------------------------------------------

(define-map moves
  { game-id: uint, move-number: uint }
  {
    player: principal,
    move: (string-ascii 10),
    timestamp: uint
  }
)

(define-map resignations
  uint  ;; game-id
  {
    player: principal,
    timestamp: uint
  }
)

;; -------------------------------------------------------
;; Record Move
;; -------------------------------------------------------

(define-public (record-move 
  (game-id uint) 
  (move-number uint) 
  (player principal) 
  (move-str (string-ascii 10))
)
  (begin
    (map-set moves 
      { game-id: game-id, move-number: move-number }
      {
        player: player,
        move: move-str,
        timestamp: stacks-block-height
      }
    )
    (ok true)
  )
)

;; -------------------------------------------------------
;; Record Resignation
;; -------------------------------------------------------

(define-public (record-resignation (game-id uint) (player principal))
  (begin
    (map-set resignations game-id
      {
        player: player,
        timestamp: stacks-block-height
      }
    )
    (ok true)
  )
)

;; -------------------------------------------------------
;; Read-Only: Get Move
;; -------------------------------------------------------

(define-read-only (get-move (game-id uint) (move-number uint))
  (ok (map-get? moves { game-id: game-id, move-number: move-number }))
)

;; -------------------------------------------------------
;; Read-Only: Get Resignation
;; -------------------------------------------------------

(define-read-only (get-resignation (game-id uint))
  (ok (map-get? resignations game-id))
)

;; -------------------------------------------------------
;; Read-Only: Get Last N Moves
;; -------------------------------------------------------

(define-read-only (get-last-moves (game-id uint) (count uint))
  (ok (map get-move-at-index (list u0 u1 u2 u3 u4)))
)

(define-private (get-move-at-index (index uint))
  (map-get? moves { game-id: u0, move-number: index })
)

;; -------------------------------------------------------
;; Read-Only: Has Player Resigned
;; -------------------------------------------------------

(define-read-only (has-resigned (game-id uint))
  (ok (is-some (map-get? resignations game-id)))
)