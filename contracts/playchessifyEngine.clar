;; ============================================================
;; playchessifyEngine.clar
;; On-chain Chess Protocol -- Oracle settlement model (Stacks)
;;
;; Game engine for the playchessify settlement architecture. Deposits and
;; payouts route through .playchessifyToken (the permanent vault); this
;; engine must be authorized there via (set-authorized-game ENGINE true).
;;
;;   - settle-game (oracle only) is the ONLY way to declare a winner/draw.
;;     The oracle replays the authoritative Redis move list off-chain with
;;     chess.js and submits the terminal result here. Funds can only ever go
;;     to white / black / split -- never to the oracle.
;;   - reclaim-expired is an oracle-independent backstop: after EXPIRY-BLOCKS
;;     either participant recovers the escrow (split refund).
;;   - No on-chain move clock: the relay + oracle replace submit-move /
;;     report-win / claim-timeout. Gasless UX is delivered by native Stacks
;;     SPONSORED TRANSACTIONS (the gas-sponsor co-signs and pays the fee) --
;;     no meta-tx functions are needed on-chain, so this engine stays minimal
;;     and is freely replaceable (the token re-keys to a new engine in one
;;     owner call, funds untouched).
;;
;; GAME LIFECYCLE:
;;   create-game -> join-game -> [off-chain moves] -> end
;;   End paths: settle-game (oracle) | resign | propose/accept-draw |
;;              cancel-game (pre-join) | reclaim-expired (backstop)
;; ============================================================

;; -------------------------------------------------------
;; Constants -- Status Codes
;; -------------------------------------------------------

(define-constant STATUS-WAITING   u0)
(define-constant STATUS-ACTIVE    u1)
(define-constant STATUS-FINISHED  u2)
(define-constant STATUS-CANCELLED u3)
(define-constant STATUS-DRAW      u4)

;; -------------------------------------------------------
;; Constants -- Settlement results (mirror EVM GameResult)
;; -------------------------------------------------------

(define-constant RESULT-WHITE u1)
(define-constant RESULT-BLACK u2)
(define-constant RESULT-DRAW  u3)

;; -------------------------------------------------------
;; Constants -- Elo
;; -------------------------------------------------------

(define-constant STARTING-ELO u1200)
(define-constant K-FACTOR      u32)
(define-constant MIN-RATING    u100)
(define-constant ELO-DIFF-CAP  u400)

;; -------------------------------------------------------
;; Constants -- Expiry backstop (~1 day at 10-min blocks)
;; -------------------------------------------------------

(define-constant EXPIRY-BLOCKS u144)

;; -------------------------------------------------------
;; Constants -- Owner
;; -------------------------------------------------------

(define-constant CONTRACT-OWNER tx-sender)

;; -------------------------------------------------------
;; Error Codes
;; -------------------------------------------------------

(define-constant ERR-NOT-AUTHORIZED   (err u700))
(define-constant ERR-GAME-NOT-FOUND   (err u701))
(define-constant ERR-INVALID-OPPONENT (err u703))
(define-constant ERR-GAME-NOT-ACTIVE  (err u705))
(define-constant ERR-GAME-NOT-WAITING (err u706))
(define-constant ERR-NOT-YOUR-GAME    (err u707))
(define-constant ERR-NO-DRAW-PROPOSED (err u709))
(define-constant ERR-ALREADY-PROPOSED (err u710))
(define-constant ERR-CANT-ACCEPT-OWN  (err u711))
(define-constant ERR-TRANSFER-FAILED  (err u712))
(define-constant ERR-INVALID-RESULT   (err u715)) ;; settle-game with a non-1/2/3 result
(define-constant ERR-NOT-EXPIRED      (err u716)) ;; reclaim-expired before EXPIRY-BLOCKS

;; -------------------------------------------------------
;; Storage
;; -------------------------------------------------------

(define-data-var game-nonce uint u0)

;; Settlement oracle -- the only principal allowed to declare a winner/draw.
;; Defaults to the deployer; rotate via set-oracle.
(define-data-var oracle principal CONTRACT-OWNER)

(define-map games
  uint
  {
    white:         principal,
    black:         (optional principal),
    wager:         uint,
    status:        uint,
    created-at:    uint,
    draw-proposer: (optional principal)
  }
)

(define-map player-stats
  principal
  {
    wins:         uint,
    losses:       uint,
    draws:        uint,
    rating:       uint,
    games-played: uint
  }
)

;; -------------------------------------------------------
;; Private -- Init Player
;; -------------------------------------------------------

(define-private (init-player-if-needed (player principal))
  (match (map-get? player-stats player)
    existing-stats true
    (map-set player-stats player {
      wins:         u0,
      losses:       u0,
      draws:        u0,
      rating:       STARTING-ELO,
      games-played: u0
    })
  )
)

;; -------------------------------------------------------
;; Private -- Elo Update (win/loss)
;; -------------------------------------------------------

(define-private (update-elo (winner principal) (loser principal))
  (let
    (
      (w-stats (default-to
        { wins: u0, losses: u0, draws: u0, rating: STARTING-ELO, games-played: u0 }
        (map-get? player-stats winner)))
      (l-stats (default-to
        { wins: u0, losses: u0, draws: u0, rating: STARTING-ELO, games-played: u0 }
        (map-get? player-stats loser)))
      (w-rating (get rating w-stats))
      (l-rating (get rating l-stats))
    )
    (if (>= w-rating l-rating)
      (let
        (
          (raw-diff      (- w-rating l-rating))
          (diff          (if (> raw-diff ELO-DIFF-CAP) ELO-DIFF-CAP raw-diff))
          (w-change-calc (/ (* K-FACTOR (- ELO-DIFF-CAP diff)) u800))
          (l-change-calc (/ (* K-FACTOR (+ ELO-DIFF-CAP diff)) u800))
          (w-change      (if (is-eq w-change-calc u0) u1 w-change-calc))
          (l-change      (if (is-eq l-change-calc u0) u1 l-change-calc))
        )
        (map-set player-stats winner
          (merge w-stats { rating: (+ w-rating w-change) }))
        (map-set player-stats loser
          (merge l-stats {
            rating: (if (> l-rating (+ l-change MIN-RATING))
                      (- l-rating l-change)
                      MIN-RATING)
          }))
      )
      (let
        (
          (raw-diff      (- l-rating w-rating))
          (diff          (if (> raw-diff ELO-DIFF-CAP) ELO-DIFF-CAP raw-diff))
          (w-change-calc (/ (* K-FACTOR (+ ELO-DIFF-CAP diff)) u800))
          (l-change-calc (/ (* K-FACTOR (- ELO-DIFF-CAP diff)) u800))
          (w-change      (if (is-eq w-change-calc u0) u1 w-change-calc))
          (l-change      (if (is-eq l-change-calc u0) u1 l-change-calc))
        )
        (map-set player-stats winner
          (merge w-stats { rating: (+ w-rating w-change) }))
        (map-set player-stats loser
          (merge l-stats {
            rating: (if (> l-rating (+ l-change MIN-RATING))
                      (- l-rating l-change)
                      MIN-RATING)
          }))
      )
    )
  )
)

;; -------------------------------------------------------
;; Private -- Elo Update (draw)
;; -------------------------------------------------------

(define-private (update-elo-draw (playerA principal) (playerB principal))
  (let
    (
      (a-stats (default-to
        { wins: u0, losses: u0, draws: u0, rating: STARTING-ELO, games-played: u0 }
        (map-get? player-stats playerA)))
      (b-stats (default-to
        { wins: u0, losses: u0, draws: u0, rating: STARTING-ELO, games-played: u0 }
        (map-get? player-stats playerB)))
      (a-rating (get rating a-stats))
      (b-rating (get rating b-stats))
    )
    (if (>= a-rating b-rating)
      (let
        (
          (raw-diff (- a-rating b-rating))
          (diff     (if (> raw-diff ELO-DIFF-CAP) ELO-DIFF-CAP raw-diff))
          (change   (/ (* K-FACTOR diff) u800))
        )
        (map-set player-stats playerA
          (merge a-stats {
            rating: (if (> a-rating (+ change MIN-RATING))
                      (- a-rating change)
                      MIN-RATING)
          }))
        (map-set player-stats playerB
          (merge b-stats { rating: (+ b-rating change) }))
      )
      (let
        (
          (raw-diff (- b-rating a-rating))
          (diff     (if (> raw-diff ELO-DIFF-CAP) ELO-DIFF-CAP raw-diff))
          (change   (/ (* K-FACTOR diff) u800))
        )
        (map-set player-stats playerB
          (merge b-stats {
            rating: (if (> b-rating (+ change MIN-RATING))
                      (- b-rating change)
                      MIN-RATING)
          }))
        (map-set player-stats playerA
          (merge a-stats { rating: (+ a-rating change) }))
      )
    )
  )
)

;; -------------------------------------------------------
;; Private -- End Game (win/loss)
;; -------------------------------------------------------

(define-private (end-game-with-winner
  (game-id uint)
  (game    { white: principal, black: (optional principal), wager: uint,
             status: uint, created-at: uint, draw-proposer: (optional principal) })
  (winner  principal)
  (loser   principal)
)
  (let
    (
      (total-pot (* (get wager game) u2))
    )
    (map-set games game-id (merge game { status: STATUS-FINISHED }))

    (if (> total-pot u0)
      (unwrap! (contract-call? .playchessifyToken gateway-release total-pot winner)
               ERR-TRANSFER-FAILED)
      true
    )

    (map-set player-stats winner
      (merge
        (default-to
          { wins: u0, losses: u0, draws: u0, rating: STARTING-ELO, games-played: u0 }
          (map-get? player-stats winner))
        (let ((s (default-to
                   { wins: u0, losses: u0, draws: u0, rating: STARTING-ELO, games-played: u0 }
                   (map-get? player-stats winner))))
          { wins:         (+ (get wins s) u1),
            games-played: (+ (get games-played s) u1) }
        )
      )
    )

    (map-set player-stats loser
      (merge
        (default-to
          { wins: u0, losses: u0, draws: u0, rating: STARTING-ELO, games-played: u0 }
          (map-get? player-stats loser))
        (let ((s (default-to
                   { wins: u0, losses: u0, draws: u0, rating: STARTING-ELO, games-played: u0 }
                   (map-get? player-stats loser))))
          { losses:       (+ (get losses s) u1),
            games-played: (+ (get games-played s) u1) }
        )
      )
    )

    (update-elo winner loser)
    (ok winner)
  )
)

;; -------------------------------------------------------
;; Private -- End Game (draw): split refund + stats + Elo
;; -------------------------------------------------------

(define-private (end-game-draw
  (game-id      uint)
  (game         { white: principal, black: (optional principal), wager: uint,
                  status: uint, created-at: uint, draw-proposer: (optional principal) })
  (black-player principal)
)
  (let
    (
      (wager (get wager game))
    )
    (map-set games game-id (merge game { status: STATUS-DRAW }))

    (if (> wager u0)
      (begin
        (try! (contract-call? .playchessifyToken gateway-release wager (get white game)))
        (try! (contract-call? .playchessifyToken gateway-release wager black-player))
      )
      true
    )

    (let
      (
        (w-stats (default-to
          { wins: u0, losses: u0, draws: u0, rating: STARTING-ELO, games-played: u0 }
          (map-get? player-stats (get white game))))
        (b-stats (default-to
          { wins: u0, losses: u0, draws: u0, rating: STARTING-ELO, games-played: u0 }
          (map-get? player-stats black-player)))
      )
      (map-set player-stats (get white game)
        (merge w-stats {
          draws:        (+ (get draws w-stats) u1),
          games-played: (+ (get games-played w-stats) u1)
        }))
      (map-set player-stats black-player
        (merge b-stats {
          draws:        (+ (get draws b-stats) u1),
          games-played: (+ (get games-played b-stats) u1)
        }))
    )

    (update-elo-draw (get white game) black-player)
    (ok true)
  )
)

;; ============================================================
;; PUBLIC -- Game Lifecycle
;; ============================================================

(define-public (create-game (wager uint))
  (let
    (
      (game-id (var-get game-nonce))
    )
    (if (> wager u0)
      (try! (contract-call? .playchessifyToken transfer
        wager tx-sender .playchessifyToken none
      ))
      true
    )

    (init-player-if-needed tx-sender)

    (map-set games game-id {
      white:         tx-sender,
      black:         none,
      wager:         wager,
      status:        STATUS-WAITING,
      created-at:    block-height,
      draw-proposer: none
    })

    (var-set game-nonce (+ game-id u1))

    (print { event: "game-created", game-id: game-id, white: tx-sender, wager: wager })
    (ok game-id)
  )
)

(define-public (join-game (game-id uint))
  (let
    (
      (game (unwrap! (map-get? games game-id) ERR-GAME-NOT-FOUND))
    )
    (asserts! (is-eq (get status game) STATUS-WAITING) ERR-GAME-NOT-WAITING)
    (asserts! (not (is-eq tx-sender (get white game)))  ERR-INVALID-OPPONENT)

    (if (> (get wager game) u0)
      (try! (contract-call? .playchessifyToken transfer
        (get wager game) tx-sender .playchessifyToken none
      ))
      true
    )

    (init-player-if-needed tx-sender)

    (map-set games game-id (merge game {
      black:  (some tx-sender),
      status: STATUS-ACTIVE
    }))

    (print { event: "game-joined", game-id: game-id, black: tx-sender })
    (ok true)
  )
)

(define-public (resign (game-id uint))
  (let
    (
      (game   (unwrap! (map-get? games game-id) ERR-GAME-NOT-FOUND))
      (caller tx-sender)
    )
    (asserts! (is-eq (get status game) STATUS-ACTIVE) ERR-GAME-NOT-ACTIVE)
    (asserts!
      (or (is-eq caller (get white game))
          (is-some (filter-eq (get black game) caller)))
      ERR-NOT-YOUR-GAME
    )

    (let
      (
        (winner (if (is-eq caller (get white game))
                  (unwrap! (get black game) ERR-GAME-NOT-FOUND)
                  (get white game)))
      )
      (print { event: "resign", game-id: game-id, loser: caller, winner: winner })
      (end-game-with-winner game-id game winner caller)
    )
  )
)

(define-public (propose-draw (game-id uint))
  (let
    (
      (game   (unwrap! (map-get? games game-id) ERR-GAME-NOT-FOUND))
      (caller tx-sender)
    )
    (asserts! (is-eq (get status game) STATUS-ACTIVE) ERR-GAME-NOT-ACTIVE)
    (asserts!
      (or (is-eq caller (get white game))
          (is-some (filter-eq (get black game) caller)))
      ERR-NOT-YOUR-GAME
    )
    (asserts! (not (is-eq (get draw-proposer game) (some caller))) ERR-ALREADY-PROPOSED)

    (map-set games game-id (merge game { draw-proposer: (some caller) }))
    (print { event: "draw-proposed", game-id: game-id, proposer: caller })
    (ok true)
  )
)

(define-public (accept-draw (game-id uint))
  (let
    (
      (game   (unwrap! (map-get? games game-id) ERR-GAME-NOT-FOUND))
      (caller tx-sender)
    )
    (asserts! (is-eq (get status game) STATUS-ACTIVE) ERR-GAME-NOT-ACTIVE)
    (asserts!
      (or (is-eq caller (get white game))
          (is-some (filter-eq (get black game) caller)))
      ERR-NOT-YOUR-GAME
    )
    (asserts! (is-some (get draw-proposer game))                   ERR-NO-DRAW-PROPOSED)
    (asserts! (not (is-eq (get draw-proposer game) (some caller))) ERR-CANT-ACCEPT-OWN)

    (let
      (
        (black-player (unwrap! (get black game) ERR-GAME-NOT-FOUND))
      )
      (print { event: "draw-accepted", game-id: game-id, white: (get white game), black: black-player })
      (end-game-draw game-id game black-player)
    )
  )
)

(define-public (cancel-game (game-id uint))
  (let
    (
      (game (unwrap! (map-get? games game-id) ERR-GAME-NOT-FOUND))
    )
    (asserts! (is-eq (get status game) STATUS-WAITING) ERR-GAME-NOT-WAITING)
    (asserts! (is-eq tx-sender (get white game))        ERR-NOT-AUTHORIZED)

    (map-set games game-id (merge game { status: STATUS-CANCELLED }))

    (if (> (get wager game) u0)
      (try! (contract-call? .playchessifyToken gateway-release
        (get wager game)
        (get white game)
      ))
      true
    )

    (print { event: "game-cancelled", game-id: game-id, white: (get white game) })
    (ok true)
  )
)

;; ============================================================
;; PUBLIC -- Oracle Settlement
;; ============================================================

;; Oracle declares the terminal result. result: 1 white, 2 black, 3 draw.
;; The oracle replays the authoritative move list off-chain; this only records
;; the outcome and moves escrow. Idempotent -- a non-Active game reverts.
(define-public (settle-game (game-id uint) (result uint))
  (let
    (
      (game (unwrap! (map-get? games game-id) ERR-GAME-NOT-FOUND))
    )
    (asserts! (is-eq tx-sender (var-get oracle))       ERR-NOT-AUTHORIZED)
    (asserts! (is-eq (get status game) STATUS-ACTIVE)  ERR-GAME-NOT-ACTIVE)
    (asserts!
      (or (is-eq result RESULT-WHITE)
          (is-eq result RESULT-BLACK)
          (is-eq result RESULT-DRAW))
      ERR-INVALID-RESULT
    )

    (let
      (
        (black-player (unwrap! (get black game) ERR-GAME-NOT-FOUND))
      )
      (if (is-eq result RESULT-DRAW)
        (begin
          (print { event: "game-settled", game-id: game-id, result: result })
          (end-game-draw game-id game black-player)
        )
        (let
          (
            (winner (if (is-eq result RESULT-WHITE) (get white game) black-player))
            (loser  (if (is-eq result RESULT-WHITE) black-player (get white game)))
          )
          (print { event: "game-settled", game-id: game-id, result: result, winner: winner })
          (try! (end-game-with-winner game-id game winner loser))
          (ok true)
        )
      )
    )
  )
)

;; Oracle-independent backstop: after EXPIRY-BLOCKS with the game still Active,
;; either participant recovers the escrow (split refund). Marks CANCELLED.
(define-public (reclaim-expired (game-id uint))
  (let
    (
      (game   (unwrap! (map-get? games game-id) ERR-GAME-NOT-FOUND))
      (caller tx-sender)
    )
    (asserts! (is-eq (get status game) STATUS-ACTIVE) ERR-GAME-NOT-ACTIVE)
    (asserts!
      (or (is-eq caller (get white game))
          (is-some (filter-eq (get black game) caller)))
      ERR-NOT-YOUR-GAME
    )
    (asserts!
      (>= (- block-height (get created-at game)) EXPIRY-BLOCKS)
      ERR-NOT-EXPIRED
    )

    (let
      (
        (black-player (unwrap! (get black game) ERR-GAME-NOT-FOUND))
        (wager        (get wager game))
      )
      (map-set games game-id (merge game { status: STATUS-CANCELLED }))

      (if (> wager u0)
        (begin
          (try! (contract-call? .playchessifyToken gateway-release wager (get white game)))
          (try! (contract-call? .playchessifyToken gateway-release wager black-player))
        )
        true
      )

      (print { event: "wager-reclaimed", game-id: game-id, by: caller })
      (ok true)
    )
  )
)

;; ============================================================
;; READ-ONLY
;; ============================================================

(define-read-only (get-game (game-id uint))
  (ok (map-get? games game-id))
)

(define-read-only (get-game-status (game-id uint))
  (ok (get status (unwrap! (map-get? games game-id) ERR-GAME-NOT-FOUND)))
)

(define-read-only (get-total-games)
  (ok (var-get game-nonce))
)

(define-read-only (get-oracle)
  (ok (var-get oracle))
)

(define-read-only (can-reclaim (game-id uint))
  (match (map-get? games game-id)
    game (ok (and
               (is-eq (get status game) STATUS-ACTIVE)
               (>= (- block-height (get created-at game)) EXPIRY-BLOCKS)))
    (ok false)
  )
)

(define-read-only (get-player-stats (player principal))
  (ok (default-to
    { wins: u0, losses: u0, draws: u0, rating: STARTING-ELO, games-played: u0 }
    (map-get? player-stats player)
  ))
)

(define-read-only (get-rating (player principal))
  (ok (get rating (default-to
    { wins: u0, losses: u0, draws: u0, rating: STARTING-ELO, games-played: u0 }
    (map-get? player-stats player)
  )))
)

;; ============================================================
;; OWNER ADMIN
;; ============================================================

;; Set the settlement oracle (rotatable for key compromise / rotation).
(define-public (set-oracle (new-oracle principal))
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    (var-set oracle new-oracle)
    (print { event: "oracle-updated", oracle: new-oracle })
    (ok new-oracle)
  )
)

;; ============================================================
;; PRIVATE -- Utility
;; ============================================================

(define-private (filter-eq (opt (optional principal)) (target principal))
  (match opt
    val (if (is-eq val target) (some val) none)
    none
  )
)
