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
(define-constant ERR-GAME-ACTIVE           (err u204))
(define-constant ERR-ALREADY-JOINED        (err u205))
(define-constant ERR-TIMELOCK-ACTIVE       (err u206))
(define-constant ERR-INVALID-WAITING-PLAYER (err u207))
(define-constant ERR-GAME-NOT-ACTIVE       (err u208))

;; -------------------------------------------------------
;; Configuration
;; -------------------------------------------------------

(define-data-var refund-timelock uint u100) ;; ~100 blocks (~1 hour) before refund available

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
    claimed: bool,
    created-at: uint,
    last-move-at: uint,
    status: (string-ascii 10) ;; "waiting", "active", "completed", "refunded", "cancelled"
  }
)

;; -------------------------------------------------------
;; Initialize escrow for New Game
;; -------------------------------------------------------

(define-public (init-game (game-id uint) (white principal) (amount uint))
  (begin
    (map-set game-escrow game-id {
      white-player: white,
      black-player: none,
      white-amount: amount,
      black-amount: u0,
      total: amount,
      claimed: false,
      created-at: block-height,
      last-move-at: block-height,
      status: "waiting"
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
    ;; Validate game is in waiting state
    (asserts! (is-eq (get status game-data) "waiting") ERR-GAME-ACTIVE)
    (asserts! (is-none (get black-player game-data)) ERR-ALREADY-JOINED)
    
    (map-set game-escrow game-id
      (merge game-data {
        black-player: (some black),
        black-amount: amount,
        total: (+ (get white-amount game-data) amount),
        status: "active",
        last-move-at: block-height
      })
    )
    (ok true)
  )
)

;; -------------------------------------------------------
;; Cancel Game (White only, before black joins)
;; -------------------------------------------------------

(define-public (cancel-game (game-id uint))
  (let
    (
      (game-data (unwrap! (map-get? game-escrow game-id) ERR-GAME-NOT-FOUND))
    )
    ;; Validate caller is white player
    (asserts! (is-eq tx-sender (get white-player game-data)) ERR-NOT-AUTHORIZED)
    ;; Validate game is in waiting state
    (asserts! (is-eq (get status game-data) "waiting") ERR-GAME-ACTIVE)
    (asserts! (is-none (get black-player game-data)) ERR-ALREADY-JOINED)
    (asserts! (not (get claimed game-data)) ERR-ALREADY-CLAIMED)
    
    ;; Mark as cancelled and claimed (for refund)
    (map-set game-escrow game-id
      (merge game-data {
        claimed: true,
        status: "cancelled"
      })
    )
    
    (ok (get white-amount game-data))
  )
)

;; -------------------------------------------------------
;; Time-locked Refund (if opponent never joins or game abandoned)
;; -------------------------------------------------------

(define-public (request-refund (game-id uint))
  (let
    (
      (game-data (unwrap! (map-get? game-escrow game-id) ERR-GAME-NOT-FOUND))
      (current-block block-height)
    )
    ;; Validate game is in waiting state (black never joined)
    (asserts! (is-eq (get status game-data) "waiting") ERR-GAME-ACTIVE)
    (asserts! (is-none (get black-player game-data)) ERR-ALREADY-JOINED)
    (asserts! (is-eq tx-sender (get white-player game-data)) ERR-NOT-AUTHORIZED)
    (asserts! (not (get claimed game-data)) ERR-ALREADY-CLAIMED)
    
    ;; Check timelock has passed
    (let ((time-elapsed (- current-block (get created-at game-data))))
      (asserts! (>= time-elapsed (var-get refund-timelock)) ERR-TIMELOCK-ACTIVE)
    )
    
    ;; Mark as claimed
    (map-set game-escrow game-id
      (merge game-data {
        claimed: true,
        status: "refunded"
      })
    )
    
    (ok (get white-amount game-data))
  )
)

;; -------------------------------------------------------
;; Abandon Game (if opponent stops playing)
;; -------------------------------------------------------

(define-public (claim-abandoned (game-id uint))
  (let
    (
      (game-data (unwrap! (map-get? game-escrow game-id) ERR-GAME-NOT-FOUND))
      (current-block block-height)
    )
    ;; Validate game is active
    (asserts! (is-eq (get status game-data) "active") ERR-GAME-NOT-ACTIVE)
    (asserts! (not (get claimed game-data)) ERR-ALREADY-CLAIMED)
    
    ;; Check last move time
    (let ((time-since-move (- current-block (get last-move-at game-data))))
      (asserts! (>= time-since-move (var-get refund-timelock)) ERR-TIMELOCK-ACTIVE)
    )
    
    ;; Determine caller's role
    (asserts! (or 
      (is-eq tx-sender (get white-player game-data))
      (is-eq tx-sender (unwrap! (get black-player game-data) ERR-NOT-AUTHORIZED))
    ) ERR-NOT-AUTHORIZED)
    
    ;; Mark as claimed
    (map-set game-escrow game-id
      (merge game-data {
        claimed: true,
        status: "refunded"
      })
    )
    
    (ok (get total game-data))
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
    ;; Validate game is active
    (asserts! (is-eq (get status game-data) "active") ERR-GAME-NOT-ACTIVE)
    (asserts! (not (get claimed game-data)) ERR-ALREADY-CLAIMED)
    
    ;; Validate winner is either white or black player
    (asserts! (or 
      (is-eq winner (get white-player game-data))
      (is-eq winner (unwrap! (get black-player game-data) false))
    ) ERR-NOT-AUTHORIZED)
    
    (map-set game-escrow game-id
      (merge game-data {
        claimed: true,
        status: "completed"
      })
    )
    
    (ok (get total game-data))
  )
)

;; -------------------------------------------------------
;; Refund Both Players (draw or mutual agreement)
;; -------------------------------------------------------

(define-public (refund-game (game-id uint))
  (let
    (
      (game-data (unwrap! (map-get? game-escrow game-id) ERR-GAME-NOT-FOUND))
    )
    ;; Validate game is active
    (asserts! (is-eq (get status game-data) "active") ERR-GAME-NOT-ACTIVE)
    (asserts! (not (get claimed game-data)) ERR-ALREADY-CLAIMED)
    
    ;; Validate caller is either white or black player
    (asserts! (or 
      (is-eq tx-sender (get white-player game-data))
      (is-eq tx-sender (unwrap! (get black-player game-data) ERR-NOT-AUTHORIZED))
    ) ERR-NOT-AUTHORIZED)
    
    (map-set game-escrow game-id
      (merge game-data {
        claimed: true,
        status: "refunded"
      })
    )
    
    (ok true)
  )
)

;; -------------------------------------------------------
;; Update Game Last Move (called by game logic contract)
;; -------------------------------------------------------

(define-public (update-last-move (game-id uint))
  (let
    (
      (game-data (unwrap! (map-get? game-escrow game-id) ERR-GAME-NOT-FOUND))
    )
    ;; Validate game is active
    (asserts! (is-eq (get status game-data) "active") ERR-GAME-NOT-ACTIVE)
    
    (map-set game-escrow game-id
      (merge game-data {
        last-move-at: block-height
      })
    )
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
    { white-player: tx-sender, black-player: none, white-amount: u0, black-amount: u0, total: u0, claimed: false, created-at: u0, last-move-at: u0, status: "waiting" }
    (map-get? game-escrow game-id)
  )))
)

(define-read-only (is-claimed (game-id uint))
  (ok (get claimed (default-to 
    { white-player: tx-sender, black-player: none, white-amount: u0, black-amount: u0, total: u0, claimed: false, created-at: u0, last-move-at: u0, status: "waiting" }
    (map-get? game-escrow game-id)
  )))
)

(define-read-only (get-game-status (game-id uint))
  (ok (get status (default-to 
    { white-player: tx-sender, black-player: none, white-amount: u0, black-amount: u0, total: u0, claimed: false, created-at: u0, last-move-at: u0, status: "waiting" }
    (map-get? game-escrow game-id)
  )))
)

(define-read-only (get-refund-timelock)
  (ok (var-get refund-timelock))
)

(define-read-only (can-request-refund (game-id uint) (player principal))
  (let
    (
      (game-data (default-to 
        { white-player: player, black-player: none, white-amount: u0, black-amount: u0, total: u0, claimed: false, created-at: u0, last-move-at: u0, status: "waiting" }
        (map-get? game-escrow game-id)
      ))
      (current-block block-height)
    )
    (ok (and
      (is-eq (get status game-data) "waiting")
      (is-none (get black-player game-data))
      (is-eq player (get white-player game-data))
      (not (get claimed game-data))
      (>= (- current-block (get created-at game-data)) (var-get refund-timelock))
    ))
  )
)

;; -------------------------------------------------------
;; Admin Functions
;; -------------------------------------------------------

(define-public (set-refund-timelock (new-timelock uint))
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    (var-set refund-timelock new-timelock)
    (ok true)
  )
)
