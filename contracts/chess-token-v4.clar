;; ============================================================
;; chess-token-v4.clar
;; SIP-010 Fungible Token -- CHESS
;; v4: Fixes gateway-release vault address bug from v3.
;;
;; BUG FIXED (v3 line 123):
;;   Was: (ft-transfer? chess-token amount .chess-token recipient)
;;   Fix: (ft-transfer? chess-token amount .chess-token-v4 recipient)
;;   Tokens are deposited into .chess-token-v4 (this contract), not
;;   into the old .chess-token address. The wrong source meant every
;;   payout would fail if .chess-token held no balance.
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

;; -------------------------------------------------------
;; Storage
;; -------------------------------------------------------

(define-data-var mint-enabled bool true)
(define-map faucet-last-claim principal uint)

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
;; Gateway Release -- privileged outflow (v4 fix)
;;
;; FIXED: source is now .chess-token-v4 (this contract, the vault)
;; instead of the old .chess-token address which held no balance.
;; Only .chess-game-v2 may call this.
;; -------------------------------------------------------

(define-public (gateway-release (amount uint) (recipient principal))
  (begin
    (asserts! (is-eq contract-caller .chess-game-v2) ERR-NOT-AUTHORIZED)
    (asserts! (> amount u0)                          ERR-INVALID-AMOUNT)
    (ft-transfer? chess-token amount .chess-token-v4 recipient)
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

;; -------------------------------------------------------
;; Read Helpers
;; -------------------------------------------------------

(define-read-only (is-mint-enabled)
  (ok (var-get mint-enabled))
)

(define-read-only (get-vault-balance)
  (ok (ft-get-balance chess-token .chess-token-v4))
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
