;; ============================================================
;; chess-game-v2.clar
;; On-chain Chess Protocol -- Game Engine, Escrow, Elo
;;
;; v2 changes from chess-game.clar:
;;   1. Uses chess-token-v4 (fixes vault address bug).
;;   2. report-win: requires move-count >= 1 and caller must be
;;      the off-turn player (i.e. they just submitted a move).
;;      Prevents stealing the pot at game start with 0 moves.
;;   3. accept-draw: calls update-elo-draw so draws affect ratings.
;;   4. Adds print events on all state transitions for indexers.
;;
;; GAME LIFECYCLE (unchanged):
;;   create-game -> join-game -> [submit-move]* -> end
;;   End paths: resign | report-win | propose/accept-draw | claim-timeout | cancel-game
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
;; Constants -- Elo
;; -------------------------------------------------------

(define-constant STARTING-ELO u1200)
(define-constant K-FACTOR      u32)
(define-constant MIN-RATING    u100)
(define-constant ELO-DIFF-CAP  u400)

;; -------------------------------------------------------
;; Constants -- Timeout
;; ~3 days at 10-min blocks
;; -------------------------------------------------------

(define-constant DEFAULT-TIMEOUT u432)

;; -------------------------------------------------------
;; Constants -- Owner
;; -------------------------------------------------------

(define-constant CONTRACT-OWNER tx-sender)

;; -------------------------------------------------------
;; Error Codes
;; -------------------------------------------------------

(define-constant ERR-NOT-AUTHORIZED   (err u700))
(define-constant ERR-GAME-NOT-FOUND   (err u701))
(define-constant ERR-NOT-YOUR-TURN    (err u702))
(define-constant ERR-INVALID-OPPONENT (err u703))
(define-constant ERR-GAME-NOT-ACTIVE  (err u705))
(define-constant ERR-GAME-NOT-WAITING (err u706))
(define-constant ERR-NOT-YOUR-GAME    (err u707))
(define-constant ERR-TIMEOUT-NOT-MET  (err u708))
(define-constant ERR-NO-DRAW-PROPOSED (err u709))
(define-constant ERR-ALREADY-PROPOSED (err u710))
(define-constant ERR-CANT-ACCEPT-OWN  (err u711))
(define-constant ERR-TRANSFER-FAILED  (err u712))
;; v2 additions
(define-constant ERR-TOO-EARLY        (err u713)) ;; report-win before any moves
(define-constant ERR-WRONG-TURN       (err u714)) ;; report-win when it's your turn (you haven't moved yet)

;; -------------------------------------------------------
;; Storage
;; -------------------------------------------------------

(define-data-var game-nonce    uint u0)
(define-data-var timeout-blocks uint DEFAULT-TIMEOUT)

(define-map games
  uint
  {
    white:           principal,
    black:           (optional principal),
    wager:           uint,
    status:          uint,
    turn:            principal,
    move-count:      uint,
    created-at:      uint,
    last-move-block: uint,
    draw-proposer:   (optional principal)
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
;; Standard expected-score approximation, K=32, diff cap 400.
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
;; Private -- Elo Update (draw) [v2 addition]
;;
;; For a draw the actual score is 0.5 for both players.
;; Change = K * (0.5 - expected_score)
;; Integer approximation: expected_high ~= (400 + diff) / 800
;; So high-rated player: change = K * (400 - (400+diff)) / 800
;;                              = -K * diff / 800 (slight loss)
;; Low-rated player gains the same amount.
;; At equal ratings diff=0, change=0, no Elo movement. Correct.
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
      ;; A was favoured: A loses a little, B gains a little
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
      ;; B was favoured: B loses a little, A gains a little
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
             status: uint, turn: principal, move-count: uint,
             created-at: uint, last-move-block: uint,
             draw-proposer: (optional principal) })
  (winner  principal)
  (loser   principal)
)
  (let
    (
      (total-pot (* (get wager game) u2))
    )
    (map-set games game-id (merge game { status: STATUS-FINISHED }))

    (if (> total-pot u0)
      (unwrap! (contract-call? .chess-token-v4 gateway-release total-pot winner)
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

;; ============================================================
;; PUBLIC -- Game Lifecycle
;; ============================================================

(define-public (create-game (wager uint))
  (let
    (
      (game-id (var-get game-nonce))
    )
    (if (> wager u0)
      (try! (contract-call? .chess-token-v4 transfer
        wager tx-sender .chess-token-v4 none
      ))
      true
    )

    (init-player-if-needed tx-sender)

    (map-set games game-id {
      white:           tx-sender,
      black:           none,
      wager:           wager,
      status:          STATUS-WAITING,
      turn:            tx-sender,
      move-count:      u0,
      created-at:      block-height,
      last-move-block: block-height,
      draw-proposer:   none
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
      (try! (contract-call? .chess-token-v4 transfer
        (get wager game) tx-sender .chess-token-v4 none
      ))
      true
    )

    (init-player-if-needed tx-sender)

    (map-set games game-id (merge game {
      black:           (some tx-sender),
      status:          STATUS-ACTIVE,
      last-move-block: block-height
    }))

    (print { event: "game-joined", game-id: game-id, black: tx-sender })
    (ok true)
  )
)

(define-public (submit-move (game-id uint))
  (let
    (
      (game (unwrap! (map-get? games game-id) ERR-GAME-NOT-FOUND))
    )
    (asserts! (is-eq (get status game) STATUS-ACTIVE) ERR-GAME-NOT-ACTIVE)
    (asserts! (is-eq tx-sender (get turn game))        ERR-NOT-YOUR-TURN)

    (let
      (
        (next-turn (if (is-eq tx-sender (get white game))
                     (unwrap! (get black game) ERR-GAME-NOT-FOUND)
                     (get white game)))
        (new-count (+ (get move-count game) u1))
      )
      (map-set games game-id (merge game {
        turn:            next-turn,
        move-count:      new-count,
        last-move-block: block-height,
        draw-proposer:   none
      }))
      (print { event: "move-submitted", game-id: game-id, player: tx-sender, move-count: new-count })
      (ok true)
    )
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

;; -------------------------------------------------------
;; Report Win (Checkmate) [v2 hardened]
;;
;; Guards added:
;;   1. move-count >= 1: at least one move must exist. Prevents
;;      draining the pot at game creation with zero moves played.
;;   2. caller != current turn: the caller must have just submitted
;;      their move (turn flipped to opponent). If it's your turn,
;;      you haven't moved yet and cannot claim checkmate.
;;
;; Move validity is still client-side (chess.js), matching the
;; original trust model. With CHESS tokens free-to-claim this
;; is acceptable; the guards prevent the trivial zero-move exploit.
;; -------------------------------------------------------

(define-public (report-win (game-id uint))
  (let
    (
      (game   (unwrap! (map-get? games game-id) ERR-GAME-NOT-FOUND))
      (caller tx-sender)
    )
    (asserts! (is-eq (get status game) STATUS-ACTIVE)  ERR-GAME-NOT-ACTIVE)
    (asserts!
      (or (is-eq caller (get white game))
          (is-some (filter-eq (get black game) caller)))
      ERR-NOT-YOUR-GAME
    )
    ;; [v2] require at least 1 move on the board
    (asserts! (>= (get move-count game) u1)            ERR-TOO-EARLY)
    ;; [v2] caller must NOT be the current turn (they just moved)
    (asserts! (not (is-eq caller (get turn game)))     ERR-WRONG-TURN)

    (let
      (
        (loser (if (is-eq caller (get white game))
                 (unwrap! (get black game) ERR-GAME-NOT-FOUND)
                 (get white game)))
      )
      (print { event: "report-win", game-id: game-id, winner: caller, loser: loser })
      (end-game-with-winner game-id game caller loser)
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

;; -------------------------------------------------------
;; Accept Draw [v2: calls update-elo-draw]
;; -------------------------------------------------------

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
        (wager        (get wager game))
      )
      (map-set games game-id (merge game { status: STATUS-DRAW }))

      (if (> wager u0)
        (begin
          (try! (contract-call? .chess-token-v4 gateway-release wager (get white game)))
          (try! (contract-call? .chess-token-v4 gateway-release wager black-player))
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

      ;; [v2] update Elo for draw outcome
      (update-elo-draw (get white game) black-player)

      (print { event: "draw-accepted", game-id: game-id, white: (get white game), black: black-player })
      (ok true)
    )
  )
)

(define-public (claim-timeout (game-id uint))
  (let
    (
      (game    (unwrap! (map-get? games game-id) ERR-GAME-NOT-FOUND))
      (caller  tx-sender)
    )
    (asserts! (is-eq (get status game) STATUS-ACTIVE) ERR-GAME-NOT-ACTIVE)
    (asserts!
      (or (is-eq caller (get white game))
          (is-some (filter-eq (get black game) caller)))
      ERR-NOT-YOUR-GAME
    )
    (asserts! (not (is-eq caller (get turn game))) ERR-NOT-YOUR-TURN)
    (asserts!
      (>= (- block-height (get last-move-block game))
          (var-get timeout-blocks))
      ERR-TIMEOUT-NOT-MET
    )

    (let
      (
        (loser  (get turn game))
        (winner caller)
      )
      (print { event: "timeout-claimed", game-id: game-id, winner: winner, loser: loser })
      (end-game-with-winner game-id game winner loser)
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
      (try! (contract-call? .chess-token-v4 gateway-release
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
;; READ-ONLY
;; ============================================================

(define-read-only (get-game (game-id uint))
  (ok (map-get? games game-id))
)

(define-read-only (get-game-status (game-id uint))
  (ok (get status (unwrap! (map-get? games game-id) ERR-GAME-NOT-FOUND)))
)

(define-read-only (get-current-turn (game-id uint))
  (ok (get turn (unwrap! (map-get? games game-id) ERR-GAME-NOT-FOUND)))
)

(define-read-only (get-total-games)
  (ok (var-get game-nonce))
)

(define-read-only (can-claim-timeout (game-id uint))
  (match (map-get? games game-id)
    game (ok (and
               (is-eq (get status game) STATUS-ACTIVE)
               (>= (- block-height (get last-move-block game))
                   (var-get timeout-blocks))))
    (ok false)
  )
)

(define-read-only (get-blocks-until-timeout (game-id uint))
  (match (map-get? games game-id)
    game
      (if (not (is-eq (get status game) STATUS-ACTIVE))
        (ok u0)
        (let
          (
            (elapsed  (- block-height (get last-move-block game)))
            (limit    (var-get timeout-blocks))
          )
          (if (>= elapsed limit)
            (ok u0)
            (ok (- limit elapsed))
          )
        )
      )
    (ok u0)
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

(define-public (set-timeout-blocks (blocks uint))
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    (var-set timeout-blocks blocks)
    (ok blocks)
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
