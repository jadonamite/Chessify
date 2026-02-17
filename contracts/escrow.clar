;; ============================================================
;; escrow.clar
;; Token Vault - CHESS only, no STX
;; Contract 2 of 7 - Chess Protocol on Stacks
;; ============================================================

;; -------------------------------------------------------
;; Constants
;; -------------------------------------------------------

(define-constant CONTRACT-OWNER tx-sender)

(define-constant ERR-NOT-AUTHORIZED        (err u200))
(define-constant ERR-GAME-NOT-FOUND        (err u201))
(define-constant ERR-ALREADY-CLAIMED       (err u202))
(define-constant ERR-INVALID-AMOUNT        (err u203))

;; -------------------------------------------------------
;; Storage
;; -------------------------------------------------------

(define-map game-escrow
  uint  ;; game-id
  {
    white-player: principal,
    black-player: (optional principal),
    white-amount: uint,
    black-amount: uint,
    total: uint,
    claimed: bool
  }
)

;; -------------------------------------------------------
;; Initialize Escrow for New Game
;; -------------------------------------------------------

(define-public (init-game (game-id uint) (white principal) (amount uint))
  (begin
    (map-set game-escrow game-id {
      white-player: white,
      black-player: none,
      white-amount: amount,
      black-amount: u0,
      total: amount,
      claimed: false
    })
    (ok true)
  )
)

;; -------------------------------------------------------
;; Add Black Player Wager
;; -------------------------------------------------------

(define-public (add-black-wager (game-id uint) (black principal) (amount uint))
  (let
    (
      (game-data (unwrap! (map-get? game-escrow game-id) ERR-GAME-NOT-FOUND))
    )
    (map-set game-escrow game-id
      (merge game-data {
        black-player: (some black),
        black-amount: amount,
        total: (+ (get white-amount game-data) amount)
      })
    )
    (ok true)
  )
)

;; -------------------------------------------------------
;; Release to Winner
;; -------------------------------------------------------

(define-public (release-to-winner (game-id uint) (winner principal))
  (let
    (
      (game-data (unwrap! (map-get? game-escrow game-id) ERR-GAME-NOT-FOUND))
    )
    (asserts! (not (get claimed game-data)) ERR-ALREADY-CLAIMED)
    
    (map-set game-escrow game-id (merge game-data { claimed: true }))
    (ok (get total game-data))
  )
)

;; -------------------------------------------------------
;; Refund Both Players
;; -------------------------------------------------------

(define-public (refund-game (game-id uint))
  (let
    (
      (game-data (unwrap! (map-get? game-escrow game-id) ERR-GAME-NOT-FOUND))
    )
    (asserts! (not (get claimed game-data)) ERR-ALREADY-CLAIMED)
    
    (map-set game-escrow game-id (merge game-data { claimed: true }))
    (ok true)
  )
)

;; -------------------------------------------------------
;; Read-Only Functions
;; -------------------------------------------------------

(define-read-only (get-escrow (game-id uint))
  (ok (map-get? game-escrow game-id))
)

(define-read-only (get-total-locked (game-id uint))
  (ok (get total (default-to 
    { white-player: tx-sender, black-player: none, white-amount: u0, black-amount: u0, total: u0, claimed: false }
    (map-get? game-escrow game-id)
  )))
)

(define-read-only (is-claimed (game-id uint))
  (ok (get claimed (default-to 
    { white-player: tx-sender, black-player: none, white-amount: u0, black-amount: u0, total: u0, claimed: false }
    (map-get? game-escrow game-id)
  )))
)