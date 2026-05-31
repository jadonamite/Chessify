;; ============================================================
;; chess-token.clar
;; SIP-010 Fungible Token -- CHESS
;; Contract 1 of 2 -- Chessify Protocol on Stacks
;;
;; DEPLOYMENT ORDER:
;;   1. Deploy chess-token.clar
;;   2. Deploy chess-game.clar (pass .chess-token address as vault)
;;
;; CLARITY 4 TOKEN FLOW (no as-contract needed):
;;   IN  (user -> vault):  user calls transfer, recipient = .chess-token
;;   OUT (vault -> user):  chess-game calls gateway-release
;;       ft-transfer? runs inside this contract's context,
;;       so it can move tokens from .chess-token's own balance
;;       without needing as-contract.
;;
;; TRUST MODEL:
;;   Only .chess-game may call gateway-release.
;;   All other outflows go through standard SIP-010 transfer.
;; ============================================================

;; -------------------------------------------------------
;; SIP-010 Trait
;; -------------------------------------------------------

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

;; -------------------------------------------------------
;; Token
;; -------------------------------------------------------

(define-fungible-token chess-token)

;; -------------------------------------------------------
;; Constants
;; -------------------------------------------------------

(define-constant CONTRACT-OWNER tx-sender)

(define-constant TOKEN-NAME     "Chess Token")
(define-constant TOKEN-SYMBOL   "CHESS")
(define-constant TOKEN-DECIMALS u6)
(define-constant TOKEN-URI      u"https://chessify.protocol/token-metadata.json")

(define-constant FAUCET-AMOUNT   u1000000000) ;; 1,000 CHESS (with 6 decimals)
(define-constant FAUCET-COOLDOWN u144)        ;; ~1 day at ~144 Stacks blocks/day

;; Errors
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
;; Standard user-initiated transfer -- tx-sender must be sender.
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
;; Gateway Release -- Clarity 4 privileged outflow
;;
;; Only .chess-game may call this function.
;; ft-transfer? runs inside this contract's context so it
;; can spend tokens held in .chess-token's own balance
;; with no as-contract required.
;;
;; Token flow: .chess-token vault -> recipient (winner/refund)
;; -------------------------------------------------------

(define-public (gateway-release (amount uint) (recipient principal))
  (begin
    (asserts! (is-eq contract-caller .chess-game) ERR-NOT-AUTHORIZED)
    (asserts! (> amount u0)                       ERR-INVALID-AMOUNT)
    ;; as-contract sets tx-sender = .chess-token-v3 so ft-transfer? can spend
    ;; tokens held in this contract's own vault balance (Clarity 2 requires tx-sender == from).
    (as-contract (ft-transfer? chess-token amount tx-sender recipient))
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
    (ok FAUCET-AMOUNT)
  )
)

;; -------------------------------------------------------
;; Mint -- Owner Only
;; Used to seed tournaments and reward pools.
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
  (ok (ft-get-balance chess-token .chess-token-v3))
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
