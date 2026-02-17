;; ============================================================
;; ranking.clar
;; Reputation and Elo Rating System
;; Contract 6 of 7 - Chess Protocol on Stacks
;; ============================================================

;; -------------------------------------------------------
;; Constants
;; -------------------------------------------------------

(define-constant CONTRACT-OWNER tx-sender)

(define-constant DEFAULT-ELO u1200)
(define-constant K-FACTOR u32)  ;; Elo adjustment sensitivity

(define-constant ERR-NOT-AUTHORIZED     (err u600))
(define-constant ERR-PLAYER-NOT-FOUND   (err u601))
(define-constant ERR-INVALID-RESULT     (err u602))

;; -------------------------------------------------------
;; Storage
;; -------------------------------------------------------

(define-map player-stats
  principal
  {
    wins: uint,
    losses: uint,
    draws: uint,
    rating: uint,
    games-played: uint
  }
)

;; -------------------------------------------------------
;; Initialize Player (first time playing)
;; -------------------------------------------------------

(define-public (init-player (player principal))
  (begin
    (map-set player-stats player {
      wins: u0,
      losses: u0,
      draws: u0,
      rating: DEFAULT-ELO,
      games-played: u0
    })
    (ok true)
  )
)

;; -------------------------------------------------------
;; Record Win
;; -------------------------------------------------------

(define-public (record-win (winner principal) (loser principal))
  (let
    (
      (winner-stats (default-to 
        { wins: u0, losses: u0, draws: u0, rating: DEFAULT-ELO, games-played: u0 }
        (map-get? player-stats winner)
      ))
      (loser-stats (default-to 
        { wins: u0, losses: u0, draws: u0, rating: DEFAULT-ELO, games-played: u0 }
        (map-get? player-stats loser)
      ))
    )
    ;; Update winner
    (map-set player-stats winner
      (merge winner-stats {
        wins: (+ (get wins winner-stats) u1),
        games-played: (+ (get games-played winner-stats) u1),
        rating: (+ (get rating winner-stats) K-FACTOR)
      })
    )
    
    ;; Update loser
    (map-set player-stats loser
      (merge loser-stats {
        losses: (+ (get losses loser-stats) u1),
        games-played: (+ (get games-played loser-stats) u1),
        rating: (if (> (get rating loser-stats) K-FACTOR)
                  (- (get rating loser-stats) K-FACTOR)
                  u0)
      })
    )
    
    (ok true)
  )
)

;; -------------------------------------------------------
;; Record Draw
;; -------------------------------------------------------

(define-public (record-draw (player1 principal) (player2 principal))
  (let
    (
      (p1-stats (default-to 
        { wins: u0, losses: u0, draws: u0, rating: DEFAULT-ELO, games-played: u0 }
        (map-get? player-stats player1)
      ))
      (p2-stats (default-to 
        { wins: u0, losses: u0, draws: u0, rating: DEFAULT-ELO, games-played: u0 }
        (map-get? player-stats player2)
      ))
    )
    ;; Update player1
    (map-set player-stats player1
      (merge p1-stats {
        draws: (+ (get draws p1-stats) u1),
        games-played: (+ (get games-played p1-stats) u1)
      })
    )
    
    ;; Update player2
    (map-set player-stats player2
      (merge p2-stats {
        draws: (+ (get draws p2-stats) u1),
        games-played: (+ (get games-played p2-stats) u1)
      })
    )
    
    (ok true)
  )
)

;; -------------------------------------------------------
;; Read-Only: Get Player Stats
;; -------------------------------------------------------

(define-read-only (get-player-stats (player principal))
  (ok (map-get? player-stats player))
)

;; -------------------------------------------------------
;; Read-Only: Get Player Rating
;; -------------------------------------------------------

(define-read-only (get-rating (player principal))
  (ok (get rating (default-to 
    { wins: u0, losses: u0, draws: u0, rating: DEFAULT-ELO, games-played: u0 }
    (map-get? player-stats player)
  )))
)

;; -------------------------------------------------------
;; Read-Only: Get Win Rate
;; -------------------------------------------------------

(define-read-only (get-win-rate (player principal))
  (let
    (
      (stats (default-to 
        { wins: u0, losses: u0, draws: u0, rating: DEFAULT-ELO, games-played: u0 }
        (map-get? player-stats player)
      ))
      (total-games (get games-played stats))
    )
    (if (is-eq total-games u0)
      (ok u0)
      (ok (/ (* (get wins stats) u100) total-games))
    )
  )
)

;; -------------------------------------------------------
;; Read-Only: Get Total Games
;; -------------------------------------------------------

(define-read-only (get-total-games (player principal))
  (ok (get games-played (default-to 
    { wins: u0, losses: u0, draws: u0, rating: DEFAULT-ELO, games-played: u0 }
    (map-get? player-stats player)
  )))
)