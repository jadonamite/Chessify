# ♟️ Chessify Protocol

A **live, mainnet, free-to-play, multi-chain chess protocol** deployed on **Stacks (Bitcoin L2)** and **Celo (EVM)**. 

Chessify allows players to wager free-to-mint CHESS tokens on fully on-chain chess matches, utilizing a premium "Cyber-Industrial" design system.

---

## 📐 Architecture Overview

The protocol has been consolidated from a legacy modular system into a streamlined **2-contract architecture** per chain, ensuring lower gas costs and faster execution.

### Stacks (Clarity)
- **`chess-token-v3.clar`**: SIP-010 token + Escrow Vault.
- **`chess-game.clar`**: Game engine, Elo rating system, and Timeout management.
- **`automata-agent.clar`**: On-chain attestation for AI agent actions.

### Celo (Solidity)
- **`ChessToken.sol`**: ERC-20 token with faucet and batch-minting.
- **`ChessGame.sol`**: Game engine mirroring the Stacks logic (Elo, lifecycle, escrow).

---

## 🚀 Protocol Status

| Layer | Component | Status |
| :--- | :--- | :--- |
| **Blockchain** | Smart Contracts (Stacks & Celo) | ✅ **DONE** |
| **Network** | Mainnet Deployment (Stacks & Celo) | ✅ **DONE** |
| **Frontend** | UI/UX & Landing Pages | 🏗️ **IN PROGRESS** |
| **Integration** | Wallet Handlers & Chain Hooks | 🏗️ **IN PROGRESS** |

---

## 🔥 Economic Model

### Layer 1 Gas (STX / CELO)
Used strictly for transaction fees. The protocol is designed to be "zero-risk" by isolating game wagers from the native gas tokens.

### Layer 2 Economy (CHESS Token)
A free-to-access in-game currency used for wagers, rewards, and ranking.
- **Faucet**: 1,000 CHESS per day per wallet.
- **Wagers**: Players agree on CHESS amounts (e.g., 100 CHESS) before starting.
- **Security**: Wagers are locked in the contract-owned vault (escrow) and released only upon game resolution.

---

## 🎮 Lifecycle Flow

1. **Initialization**: Player A creates a match with a CHESS wager. Tokens are locked in the contract vault.
2. **Matching**: Player B joins the match, locking an equal CHESS amount.
3. **Gameplay**: Players alternate moves. Turn order and timeouts are enforced on-chain.
4. **Resolution**: Match ends via Checkmate (`report-win`), Resignation, Draw, or Timeout. 
5. **Payout**: The contract automatically releases the total pot to the winner (or refunds on draw) and updates Elo ratings.

---

## 🛠️ Tech Stack

- **Contracts**: Clarity (Stacks), Solidity (Celo)
- **Frontend**: Next.js 16, TypeScript, Tailwind CSS 4.x
- **Animation**: Framer Motion, Three.js (R3F)
- **Providers**: Wagmi, Viem (EVM), Stacks Connect
- **Validation**: Chess.js, React-Chessboard

---

## 📖 Deployed Details

**Stacks Deployer**: `SP6X0MXEEGZX14ZTK7XQXJ76W35ZJDP9NZBT6F39`  
**Celo Token**: `0xE370aad742dF8DC8Ae9c0F0b9f265334D39e2197`  
**Celo Game**: `0xf85f00D39A84b5180390548Ea9f76B0458607E78`

---

*“Play for the pride of the chain, stay for the thrill of the move.”*
