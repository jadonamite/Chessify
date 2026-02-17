;; ============================================================
;; timer.clar
;; Timeout Authority
;; Contract 5 of 7 - Chess Protocol on Stacks
;; ============================================================

;; -------------------------------------------------------
;; Constants
;; -------------------------------------------------------

(define-constant CONTRACT-OWNER tx-sender)

(define-constant DEFAULT-TIMEOUT u1440)  ;; ~10 days in blocks (~144 blocks/day)

(define-constant ERR-NOT-AUTHORIZED     (err u500))
(define-constant ERR-GAME-NOT-FOUND     (err u501))
(define-constant ERR-TIMEOUT-NOT-REACHED (err u502))
(define-constant ERR-INVALID-TIMEOUT    (err u503))

;; -------------------------------------------------------
;; Storage
;; -------------------------------------------------------

(define-map game-timeouts
  uint  ;; game-id
  {
    timeout-duration: uint,
    last-move-block: uint
  }
)

;; -------------------------------------------------------
;; Initialize Timeout for Game
;; -------------------------------------------------------

(define-public (init-timeout (game-id uint))
  (begin
    (map-set game-timeouts game-id {
      timeout-duration: DEFAULT-TIMEOUT,
      last-move-block: stacks-block-height
    })
    (ok true)
  )
)

;; -------------------------------------------------------
;; Reset Timer (called after each move)
;; -------------------------------------------------------

(define-public (reset-timer (game-id uint))
  (let
    (
      (timer-data (unwrap! (map-get? game-timeouts game-id) ERR-GAME-NOT-FOUND))
    )
    (map-set game-timeouts game-id
      (merge timer-data { last-move-block: stacks-block-height })
    )
    (ok true)
  )
)

;; -------------------------------------------------------
;; Validate Timeout
;; -------------------------------------------------------

(define-public (validate-timeout (game-id uint))
  (let
    (
      (timer-data (unwrap! (map-get? game-timeouts game-id) ERR-GAME-NOT-FOUND))
      (blocks-elapsed (- stacks-block-height (get last-move-block timer-data)))
      (timeout-limit (get timeout-duration timer-data))
    )
    (asserts! (>= blocks-elapsed timeout-limit) ERR-TIMEOUT-NOT-REACHED)
    (ok true)
  )
)

;; -------------------------------------------------------
;; Set Custom Timeout (optional, for different game modes)
;; -------------------------------------------------------

(define-public (set-timeout-duration (game-id uint) (duration uint))
  (let
    (
      (timer-data (unwrap! (map-get? game-timeouts game-id) ERR-GAME-NOT-FOUND))
    )
    (asserts! (> duration u0) ERR-INVALID-TIMEOUT)
    (map-set game-timeouts game-id
      (merge timer-data { timeout-duration: duration })
    )
    (ok true)
  )
)

;; -------------------------------------------------------
;; Read-Only: Get Timeout Info
;; -------------------------------------------------------

(define-read-only (get-timeout-info (game-id uint))
  (ok (map-get? game-timeouts game-id))
)

;; -------------------------------------------------------
;; Read-Only: Blocks Until Timeout
;; -------------------------------------------------------

(define-read-only (get-blocks-until-timeout (game-id uint))
  (let
    (
      (timer-data (unwrap! (map-get? game-timeouts game-id) ERR-GAME-NOT-FOUND))
      (blocks-elapsed (- stacks-block-height (get last-move-block timer-data)))
      (timeout-limit (get timeout-duration timer-data))
    )
    (if (>= blocks-elapsed timeout-limit)
      (ok u0)
      (ok (- timeout-limit blocks-elapsed))
    )
  )
)

;; -------------------------------------------------------
;; Read-Only: Has Timed Out
;; -------------------------------------------------------

(define-read-only (has-timed-out (game-id uint))
  (let
    (
      (timer-data (unwrap! (map-get? game-timeouts game-id) ERR-GAME-NOT-FOUND))
      (blocks-elapsed (- stacks-block-height (get last-move-block timer-data)))
      (timeout-limit (get timeout-duration timer-data))
    )
    (ok (>= blocks-elapsed timeout-limit))
  )
)