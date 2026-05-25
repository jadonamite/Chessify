;; ============================================================
;; logic-v2.clar
;; Move Engine and Turn Enforcer
;;
;; v2 changes from logic.clar:
;;   1. record-move / record-resignation: restricted to callers
;;      .router and .gateway only. Any principal could previously
;;      spoof arbitrary moves or resignations for any game.
;;   2. get-last-moves: fixed hardcoded game-id: u0 bug. The
;;      original private helper ignored the game-id param entirely,
;;      returning moves for game 0 regardless of input. Now takes
;;      a start-move index and returns 5 consecutive moves for the
;;      correct game.
;; ============================================================

(define-constant ERR-NOT-AUTHORIZED (err u400))

;; -------------------------------------------------------
;; Storage
;; -------------------------------------------------------

(define-map moves
  { game-id: uint, move-number: uint }
  {
    player:    principal,
    move:      (string-ascii 10),
    timestamp: uint
  }
)

(define-map resignations
  uint
  {
    player:    principal,
    timestamp: uint
  }
)

;; -------------------------------------------------------
;; Record Move [v2: authorized callers only]
;;
;; Only .router and .gateway may write move records.
;; Without this, any principal can forge move history.
;; -------------------------------------------------------

(define-public (record-move
  (game-id     uint)
  (move-number uint)
  (player      principal)
  (move-str    (string-ascii 10))
)
  (begin
    (asserts!
      (or (is-eq contract-caller .router)
          (is-eq contract-caller .gateway))
      ERR-NOT-AUTHORIZED
    )
    (map-set moves
      { game-id: game-id, move-number: move-number }
      {
        player:    player,
        move:      move-str,
        timestamp: block-height
      }
    )
    (ok true)
  )
)

;; -------------------------------------------------------
;; Record Resignation [v2: authorized callers only]
;; -------------------------------------------------------

(define-public (record-resignation (game-id uint) (player principal))
  (begin
    (asserts!
      (or (is-eq contract-caller .router)
          (is-eq contract-caller .gateway))
      ERR-NOT-AUTHORIZED
    )
    (map-set resignations game-id
      {
        player:    player,
        timestamp: block-height
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
;; Read-Only: Get 5 Moves Starting From Index [v2 fix]
;;
;; Returns moves [start-move .. start-move+4] for the given game.
;;
;; Original bug: the private helper had game-id hardcoded to u0
;; so every call returned moves from game 0 regardless of input.
;; Fixed by inlining map-get? with the correct game-id.
;;
;; Usage: pass move-count - 5 as start-move to get the last 5.
;; -------------------------------------------------------

(define-read-only (get-moves-range (game-id uint) (start-move uint))
  (ok {
    move-0: (map-get? moves { game-id: game-id, move-number: start-move }),
    move-1: (map-get? moves { game-id: game-id, move-number: (+ start-move u1) }),
    move-2: (map-get? moves { game-id: game-id, move-number: (+ start-move u2) }),
    move-3: (map-get? moves { game-id: game-id, move-number: (+ start-move u3) }),
    move-4: (map-get? moves { game-id: game-id, move-number: (+ start-move u4) })
  })
)

;; -------------------------------------------------------
;; Read-Only: Has Player Resigned
;; -------------------------------------------------------

(define-read-only (has-resigned (game-id uint))
  (ok (is-some (map-get? resignations game-id)))
)
