;; ============================================================
;; chess-token.clar
;; SIP-010 Fungible Token - CHESS
;; Contract 1 of 7 - Chess Protocol on Stacks
;; ============================================================

;; -------------------------------------------------------
;; SIP-010 Trait Definition
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
;; Token Definition
;; -------------------------------------------------------

(define-fungible-token chess-token)

;; -------------------------------------------------------
;; Constants
;; -------------------------------------------------------

(define-constant CONTRACT-OWNER tx-sender)

(define-constant TOKEN-NAME "Chess Token")
(define-constant TOKEN-SYMBOL "CHESS")
(define-constant TOKEN-DECIMALS u6)
(define-constant TOKEN-URI u"https://chess.protocol/token-metadata.json")

(define-constant FAUCET-AMOUNT u1000000000)  ;; 1,000 CHESS (6 decimals)
(define-constant FAUCET-COOLDOWN u144)       ;; ~1 day in blocks

(define-constant ERR-NOT-AUTHORIZED     (err u100))
(define-constant ERR-MINT-DISABLED      (err u101))
(define-constant ERR-INVALID-AMOUNT     (err u102))
(define-constant ERR-FAUCET-COOLDOWN    (err u105))
(define-constant ERR-SAME-SENDER        (err u106))

;; -------------------------------------------------------
;; Storage
;; -------------------------------------------------------

(define-data-var mint-enabled bool true)

(define-map faucet-last-claim
  principal
  uint
)

;; -------------------------------------------------------
;; SIP-010 Read-Only Functions
;; -------------------------------------------------------

(define-read-only (get-name)
  (ok TOKEN-NAME)
)

(define-read-only (get-symbol)
  (ok TOKEN-SYMBOL)
)

(define-read-only (get-decimals)
  (ok TOKEN-DECIMALS)
)

(define-read-only (get-balance (account principal))
  (ok (ft-get-balance chess-token account))
)

(define-read-only (get-total-supply)
  (ok (ft-get-supply chess-token))
)

(define-read-only (get-token-uri)
  (ok (some TOKEN-URI))
)

;; -------------------------------------------------------
;; SIP-010 Transfer
;; -------------------------------------------------------

(define-public (transfer
  (amount uint)
  (sender principal)
  (recipient principal)
  (memo (optional (buff 34)))
)
  (begin
    (asserts! (is-eq tx-sender sender) ERR-NOT-AUTHORIZED)
    (asserts! (> amount u0) ERR-INVALID-AMOUNT)
    (asserts! (not (is-eq sender recipient)) ERR-SAME-SENDER)
    (try! (ft-transfer? chess-token amount sender recipient))
    (match memo m (print m) 0x)
    (ok true)
  )
)

;; -------------------------------------------------------
;; Mint (Owner Only)
;; -------------------------------------------------------

(define-public (mint (amount uint) (recipient principal))
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    (asserts! (var-get mint-enabled) ERR-MINT-DISABLED)
    (asserts! (> amount u0) ERR-INVALID-AMOUNT)
    (try! (ft-mint? chess-token amount recipient))
    (ok true)
  )
)

;; -------------------------------------------------------
;; Faucet - Anyone claims 1,000 CHESS per day
;; -------------------------------------------------------

(define-public (faucet-claim)
  (let
    (
      (last-claim (default-to u0 (map-get? faucet-last-claim tx-sender)))
      (current-height stacks-block-height)
    )
    (asserts! (var-get mint-enabled) ERR-MINT-DISABLED)
    (asserts! (>= (- current-height last-claim) FAUCET-COOLDOWN) ERR-FAUCET-COOLDOWN)
    (map-set faucet-last-claim tx-sender current-height)
    (try! (ft-mint? chess-token FAUCET-AMOUNT tx-sender))
    (ok FAUCET-AMOUNT)
  )
)

;; -------------------------------------------------------
;; Batch Mint - Owner seeds tournaments / rewards
;; -------------------------------------------------------

(define-public (batch-mint
  (recipients (list 10 { recipient: principal, amount: uint }))
)
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    (asserts! (var-get mint-enabled) ERR-MINT-DISABLED)
    (ok (map mint-to-recipient recipients))
  )
)

(define-private (mint-to-recipient (entry { recipient: principal, amount: uint }))
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

(define-read-only (get-faucet-cooldown-remaining (account principal))
  (let
    (
      (last-claim (default-to u0 (map-get? faucet-last-claim account)))
      (next-eligible (+ last-claim FAUCET-COOLDOWN))
      (current-height stacks-block-height)
    )
    (if (>= current-height next-eligible)
      (ok u0)
      (ok (- next-eligible current-height))
    )
  )
)