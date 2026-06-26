;; ============================================================
;; playchessifyToken.clar
;; SIP-010 Fungible Token -- CHESS  (permanent vault)
;;
;; Successor to chess-token-v4. Two changes make this the LAST token
;; we ever need to deploy:
;;
;;   1. RE-KEYABLE LOCK (allow-list):
;;      gateway-release used to be welded to a single hardcoded game
;;      (chess-token-v4 -> .chess-game-v2). Here it checks an
;;      owner-managed allow-list (authorized-games). Any future game
;;      engine can be authorized in one owner call -- no token redeploy,
;;      no escrow migration -- and two engines can run at once during a
;;      migration. This is the fix for the welded-name bind.
;;
;;   2. MINTER ROLE (mirrors playchessify ChessToken.mintTo/setMinter):
;;      a dedicated, owner-settable minter principal can mint via mint-to
;;      WITHOUT being the contract owner, so the gas-sponsor/minter
;;      backend can provision CHESS with a low-value hot key.
;;
;; The vault (this contract's own holdings) holds all staked CHESS;
;; gateway-release is the privileged outflow an authorized engine uses
;; to pay winners / refund draws / reclaim expired escrow.
;; ============================================================

(define-trait sip-010-trait
  (
    (transfer (uint principal principal (optional (buff 34))) (response bool uint))
    (get-name () (response (string-ascii 32) uint))
    (get-symbol () (response (string-ascii 32) uint))
    (get-decimals () (response uint uint))
    (get-balance (principal) (response uint uint))
    (get-total-supply () (response uint uint))
    (get-token-uri () (response (optional (string-utf8 256)) uint))
  )
)

(define-fungible-token chess-token)

;; -------------------------------------------------------
;; Constants
;; -------------------------------------------------------

(define-constant CONTRACT-OWNER tx-sender)

(define-constant TOKEN-NAME     "Chess Token")
(define-constant TOKEN-SYMBOL   "CHESS")
(define-constant TOKEN-DECIMALS u6)
(define-constant TOKEN-URI      u"https://chessify.protocol/token-metadata.json")

(define-constant FAUCET-AMOUNT   u1000000000) ;; 1,000 CHESS (6 decimals)
(define-constant FAUCET-COOLDOWN u144)        ;; ~1 day (~144 blocks/day)

(define-constant ERR-NOT-AUTHORIZED  (err u100))
(define-constant ERR-MINT-DISABLED   (err u101))
(define-constant ERR-INVALID-AMOUNT  (err u102))
(define-constant ERR-FAUCET-COOLDOWN (err u105))
(define-constant ERR-SAME-SENDER     (err u106))
(define-constant ERR-NOT-MINTER      (err u107)) ;; mint-to by a non-minter

;; -------------------------------------------------------
;; Storage
;; -------------------------------------------------------

(define-data-var mint-enabled bool true)
(define-map faucet-last-claim principal uint)

;; Re-keyable lock: principals (game engines) allowed to call gateway-release.
;; Owner-managed; multiple may be enabled at once (e.g. during a migration).
(define-map authorized-games principal bool)

;; Dedicated minter -- may call mint-to without being the owner.
;; Defaults to the deployer; rotate via set-minter.
(define-data-var minter principal CONTRACT-OWNER)

;; -------------------------------------------------------
;; SIP-010 Read-Only
;; -------------------------------------------------------

(define-read-only (get-name)         (ok TOKEN-NAME))
(define-read-only (get-symbol)       (ok TOKEN-SYMBOL))
(define-read-only (get-decimals)     (ok TOKEN-DECIMALS))
(define-read-only (get-token-uri)    (ok (some TOKEN-URI)))
(define-read-only (get-total-supply) (ok (ft-get-supply chess-token)))

(define-read-only (get-balance (account principal))
  (ok (ft-get-balance chess-token account))
)

;; -------------------------------------------------------
;; SIP-010 Transfer
;; -------------------------------------------------------

(define-public (transfer
  (amount    uint)
  (sender    principal)
  (recipient principal)
  (memo      (optional (buff 34)))
)
  (begin
    (asserts! (is-eq tx-sender sender)       ERR-NOT-AUTHORIZED)
    (asserts! (> amount u0)                  ERR-INVALID-AMOUNT)
    (asserts! (not (is-eq sender recipient)) ERR-SAME-SENDER)
    (try! (ft-transfer? chess-token amount sender recipient))
    (match memo m (print m) 0x)
    (ok true)
  )
)

;; -------------------------------------------------------
;; Gateway Release -- privileged vault outflow
;;
;; Pays out of THIS contract's own holdings (the vault) to recipient.
;; Caller must be an authorized game engine (allow-list). Replaces v4's
;; welded `(is-eq contract-caller .chess-game-v2)` check.
;; -------------------------------------------------------

(define-public (gateway-release (amount uint) (recipient principal))
  (begin
    (asserts! (default-to false (map-get? authorized-games contract-caller))
              ERR-NOT-AUTHORIZED)
    (asserts! (> amount u0) ERR-INVALID-AMOUNT)
    (ft-transfer? chess-token amount (as-contract tx-sender) recipient)
  )
)

;; -------------------------------------------------------
;; Faucet -- 1,000 CHESS per wallet per day
;; -------------------------------------------------------

(define-public (faucet-claim)
  (let
    (
      (last-claim     (default-to u0 (map-get? faucet-last-claim tx-sender)))
      (current-height block-height)
    )
    (asserts! (var-get mint-enabled) ERR-MINT-DISABLED)
    (asserts!
      (>= (- current-height last-claim) FAUCET-COOLDOWN)
      ERR-FAUCET-COOLDOWN
    )
    (map-set faucet-last-claim tx-sender current-height)
    (try! (ft-mint? chess-token FAUCET-AMOUNT tx-sender))
    (print { event: "faucet-claim", recipient: tx-sender, amount: FAUCET-AMOUNT })
    (ok FAUCET-AMOUNT)
  )
)

;; -------------------------------------------------------
;; Mint -- Owner Only
;; -------------------------------------------------------

(define-public (mint (amount uint) (recipient principal))
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    (asserts! (var-get mint-enabled)           ERR-MINT-DISABLED)
    (asserts! (> amount u0)                    ERR-INVALID-AMOUNT)
    (try! (ft-mint? chess-token amount recipient))
    (ok true)
  )
)

;; -------------------------------------------------------
;; Mint To -- Minter Only (backend gas-sponsor provisioning)
;;
;; Lets the dedicated minter key provision CHESS to players without the
;; owner key. Mirrors playchessify ChessToken.mintTo(onlyMinter).
;; -------------------------------------------------------

(define-public (mint-to (amount uint) (recipient principal))
  (begin
    (asserts! (is-eq tx-sender (var-get minter)) ERR-NOT-MINTER)
    (asserts! (var-get mint-enabled)             ERR-MINT-DISABLED)
    (asserts! (> amount u0)                      ERR-INVALID-AMOUNT)
    (try! (ft-mint? chess-token amount recipient))
    (print { event: "mint-to", recipient: recipient, amount: amount })
    (ok true)
  )
)

;; -------------------------------------------------------
;; Batch Mint -- Owner seeds up to 10 recipients at once
;; -------------------------------------------------------

(define-public (batch-mint
  (recipients (list 10 { recipient: principal, amount: uint }))
)
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    (asserts! (var-get mint-enabled)           ERR-MINT-DISABLED)
    (ok (map mint-to-one recipients))
  )
)

(define-private (mint-to-one (entry { recipient: principal, amount: uint }))
  (ft-mint? chess-token (get amount entry) (get recipient entry))
)

;; -------------------------------------------------------
;; Owner Controls
;; -------------------------------------------------------

(define-public (set-mint-enabled (enabled bool))
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    (var-set mint-enabled enabled)
    (ok enabled)
  )
)

;; Add or remove a game engine from the gateway-release allow-list.
(define-public (set-authorized-game (game principal) (enabled bool))
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    (map-set authorized-games game enabled)
    (print { event: "authorized-game-set", game: game, enabled: enabled })
    (ok enabled)
  )
)

;; Rotate the dedicated minter (key compromise / rotation).
(define-public (set-minter (new-minter principal))
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    (var-set minter new-minter)
    (print { event: "minter-updated", minter: new-minter })
    (ok new-minter)
  )
)

;; -------------------------------------------------------
;; Read Helpers
;; -------------------------------------------------------

(define-read-only (is-mint-enabled)
  (ok (var-get mint-enabled))
)

(define-read-only (get-minter)
  (ok (var-get minter))
)

(define-read-only (is-authorized-game (game principal))
  (ok (default-to false (map-get? authorized-games game)))
)

(define-read-only (get-vault-balance)
  (ok (ft-get-balance chess-token (as-contract tx-sender)))
)

(define-read-only (get-faucet-cooldown-remaining (account principal))
  (let
    (
      (last-claim     (default-to u0 (map-get? faucet-last-claim account)))
      (next-eligible  (+ last-claim FAUCET-COOLDOWN))
      (current-height block-height)
    )
    (if (>= current-height next-eligible)
      (ok u0)
      (ok (- next-eligible current-height))
    )
  )
)
