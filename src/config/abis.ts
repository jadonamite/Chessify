export const CHESS_TOKEN_ABI = [
  { "type": "function", "name": "approve", "stateMutability": "nonpayable", "inputs": [{ "name": "spender", "type": "address" }, { "name": "amount", "type": "uint256" }], "outputs": [{ "type": "bool" }] },
  { "type": "function", "name": "balanceOf", "stateMutability": "view", "inputs": [{ "name": "account", "type": "address" }], "outputs": [{ "type": "uint256" }] },
  { "type": "function", "name": "allowance", "stateMutability": "view", "inputs": [{ "name": "owner", "type": "address" }, { "name": "spender", "type": "address" }], "outputs": [{ "type": "uint256" }] },
  { "type": "function", "name": "faucetClaim", "stateMutability": "nonpayable", "inputs": [], "outputs": [] },
  { "type": "function", "name": "decimals", "stateMutability": "view", "inputs": [], "outputs": [{ "type": "uint8" }] }
] as const

export const CHESS_GAME_ABI = [
  { "type": "function", "name": "createGame", "stateMutability": "nonReentrant", "inputs": [{ "name": "wager", "type": "uint256" }], "outputs": [{ "name": "gameId", "type": "uint256" }] },
  { "type": "function", "name": "joinGame", "stateMutability": "nonReentrant", "inputs": [{ "name": "gameId", "type": "uint256" }], "outputs": [] },
  { "type": "function", "name": "submitMove", "stateMutability": "nonpayable", "inputs": [{ "name": "gameId", "type": "uint256" }], "outputs": [] },
  { "type": "function", "name": "resign", "stateMutability": "nonReentrant", "inputs": [{ "name": "gameId", "type": "uint256" }], "outputs": [] },
  { "type": "function", "name": "reportWin", "stateMutability": "nonReentrant", "inputs": [{ "name": "gameId", "type": "uint256" }], "outputs": [] },
  { "type": "function", "name": "getGame", "stateMutability": "view", "inputs": [{ "name": "gameId", "type": "uint256" }], "outputs": [{ "type": "tuple", "components": [
    { "name": "white", "type": "address" },
    { "name": "black", "type": "address" },
    { "name": "wager", "type": "uint256" },
    { "name": "status", "type": "uint8" },
    { "name": "result", "type": "uint8" },
    { "name": "turn", "type": "address" },
    { "name": "moveCount", "type": "uint256" },
    { "name": "createdAt", "type": "uint256" },
    { "name": "lastMoveBlock", "type": "uint256" },
    { "name": "drawProposer", "type": "address" }
  ]}] },
  { "type": "function", "name": "playerStats", "stateMutability": "view", "inputs": [{ "name": "player", "type": "address" }], "outputs": [{ "type": "uint256", "name": "wins" }, { "type": "uint256", "name": "losses" }, { "type": "uint256", "name": "draws" }, { "type": "uint256", "name": "rating" }, { "type": "uint256", "name": "gamesPlayed" }] },
  { "type": "function", "name": "gameNonce", "stateMutability": "view", "inputs": [], "outputs": [{ "type": "uint256" }] },
  { "type": "event", "name": "GameCreated", "inputs": [{ "name": "gameId", "type": "uint256", "indexed": true }, { "name": "white", "type": "address", "indexed": true }, { "name": "wager", "type": "uint256", "indexed": false }] },
  { "type": "event", "name": "GameJoined", "inputs": [{ "name": "gameId", "type": "uint256", "indexed": true }, { "name": "black", "type": "address", "indexed": true }] },
  { "type": "event", "name": "MoveMade", "inputs": [{ "name": "gameId", "type": "uint256", "indexed": true }, { "name": "player", "type": "address", "indexed": true }, { "name": "moveCount", "type": "uint256", "indexed": false }] }
] as const

// Base ChessGame is a leaner contract than Celo's: a 5-field getGame tuple,
// a single two-step `settleDraw` (instead of propose/accept), a `drawProposal`
// view, and no submitMove/claimTimeout/cancelGame. Kept separate so Celo's
// 10-field tuple decode is never broken.
export const BASE_CHESS_GAME_ABI = [
  { "type": "function", "name": "createGame", "stateMutability": "nonpayable", "inputs": [{ "name": "wager", "type": "uint256" }], "outputs": [{ "name": "gameId", "type": "uint256" }] },
  { "type": "function", "name": "joinGame", "stateMutability": "nonpayable", "inputs": [{ "name": "gameId", "type": "uint256" }], "outputs": [] },
  { "type": "function", "name": "resign", "stateMutability": "nonpayable", "inputs": [{ "name": "gameId", "type": "uint256" }], "outputs": [] },
  { "type": "function", "name": "reportWin", "stateMutability": "nonpayable", "inputs": [{ "name": "gameId", "type": "uint256" }], "outputs": [] },
  { "type": "function", "name": "settleDraw", "stateMutability": "nonpayable", "inputs": [{ "name": "gameId", "type": "uint256" }], "outputs": [] },
  { "type": "function", "name": "getGame", "stateMutability": "view", "inputs": [{ "name": "gameId", "type": "uint256" }], "outputs": [{ "type": "tuple", "components": [
    { "name": "white", "type": "address" },
    { "name": "black", "type": "address" },
    { "name": "wager", "type": "uint256" },
    { "name": "status", "type": "uint8" },
    { "name": "result", "type": "uint8" }
  ]}] },
  { "type": "function", "name": "getPlayerStats", "stateMutability": "view", "inputs": [{ "name": "player", "type": "address" }], "outputs": [{ "type": "tuple", "components": [
    { "name": "wins", "type": "uint256" },
    { "name": "losses", "type": "uint256" },
    { "name": "draws", "type": "uint256" },
    { "name": "rating", "type": "uint256" },
    { "name": "gamesPlayed", "type": "uint256" }
  ]}] },
  { "type": "function", "name": "totalGames", "stateMutability": "view", "inputs": [], "outputs": [{ "type": "uint256" }] },
  { "type": "function", "name": "drawProposal", "stateMutability": "view", "inputs": [{ "name": "gameId", "type": "uint256" }], "outputs": [{ "type": "address" }] },
  { "type": "event", "name": "GameCreated", "inputs": [{ "name": "gameId", "type": "uint256", "indexed": true }, { "name": "white", "type": "address", "indexed": true }, { "name": "wager", "type": "uint256", "indexed": false }] },
  { "type": "event", "name": "GameJoined", "inputs": [{ "name": "gameId", "type": "uint256", "indexed": true }, { "name": "black", "type": "address", "indexed": true }] },
  { "type": "event", "name": "GameResigned", "inputs": [{ "name": "gameId", "type": "uint256", "indexed": true }, { "name": "loser", "type": "address", "indexed": true }, { "name": "winner", "type": "address", "indexed": true }] },
  { "type": "event", "name": "CheckmateReported", "inputs": [{ "name": "gameId", "type": "uint256", "indexed": true }, { "name": "winner", "type": "address", "indexed": true }, { "name": "loser", "type": "address", "indexed": true }] },
  { "type": "event", "name": "DrawProposed", "inputs": [{ "name": "gameId", "type": "uint256", "indexed": true }, { "name": "proposer", "type": "address", "indexed": true }] },
  { "type": "event", "name": "DrawSettled", "inputs": [{ "name": "gameId", "type": "uint256", "indexed": true }] }
] as const

// ─────────────────────────────────────────────────────────────────────────────
// ORACLE-MODEL EVM ABIs (next deploy — NOT yet live).
//
// The 2026-06 contract port converged celo-contracts/ and base-contracts/
// ChessGame.sol into ONE shape (identical except EXPIRY_BLOCKS), so a single ABI
// serves both EVM chains. The 7-field getGame tuple dropped turn/moveCount/
// lastMoveBlock and settlement moved server-side: a winner can ONLY be declared
// by the oracle via settleGame. Draws use Celo-style propose/accept.
//
// ⚠️ The deployed Celo + Base contracts still run the legacy player-submitted
// model (CHESS_GAME_ABI / BASE_CHESS_GAME_ABI above). Do NOT point reads/writes
// at this ABI until the oracle contracts are redeployed and setOracle is called.
// Kept as a separate export so nothing live decodes against it by accident.
export const EVM_CHESS_ORACLE_ABI = [
  { "type": "function", "name": "createGame", "stateMutability": "nonpayable", "inputs": [{ "name": "wager", "type": "uint256" }], "outputs": [{ "name": "gameId", "type": "uint256" }] },
  { "type": "function", "name": "joinGame", "stateMutability": "nonpayable", "inputs": [{ "name": "gameId", "type": "uint256" }], "outputs": [] },
  { "type": "function", "name": "resign", "stateMutability": "nonpayable", "inputs": [{ "name": "gameId", "type": "uint256" }], "outputs": [] },
  { "type": "function", "name": "proposeDraw", "stateMutability": "nonpayable", "inputs": [{ "name": "gameId", "type": "uint256" }], "outputs": [] },
  { "type": "function", "name": "acceptDraw", "stateMutability": "nonpayable", "inputs": [{ "name": "gameId", "type": "uint256" }], "outputs": [] },
  { "type": "function", "name": "cancelGame", "stateMutability": "nonpayable", "inputs": [{ "name": "gameId", "type": "uint256" }], "outputs": [] },
  { "type": "function", "name": "settleGame", "stateMutability": "nonpayable", "inputs": [{ "name": "gameId", "type": "uint256" }, { "name": "result", "type": "uint8" }], "outputs": [] },
  { "type": "function", "name": "reclaimExpired", "stateMutability": "nonpayable", "inputs": [{ "name": "gameId", "type": "uint256" }], "outputs": [] },
  { "type": "function", "name": "setOracle", "stateMutability": "nonpayable", "inputs": [{ "name": "newOracle", "type": "address" }], "outputs": [] },
  { "type": "function", "name": "oracle", "stateMutability": "view", "inputs": [], "outputs": [{ "type": "address" }] },
  { "type": "function", "name": "canReclaim", "stateMutability": "view", "inputs": [{ "name": "gameId", "type": "uint256" }], "outputs": [{ "type": "bool" }] },
  { "type": "function", "name": "getGame", "stateMutability": "view", "inputs": [{ "name": "gameId", "type": "uint256" }], "outputs": [{ "type": "tuple", "components": [
    { "name": "white", "type": "address" },
    { "name": "black", "type": "address" },
    { "name": "wager", "type": "uint256" },
    { "name": "status", "type": "uint8" },
    { "name": "result", "type": "uint8" },
    { "name": "createdAt", "type": "uint256" },
    { "name": "drawProposer", "type": "address" }
  ]}] },
  { "type": "function", "name": "getPlayerStats", "stateMutability": "view", "inputs": [{ "name": "player", "type": "address" }], "outputs": [{ "type": "tuple", "components": [
    { "name": "wins", "type": "uint256" },
    { "name": "losses", "type": "uint256" },
    { "name": "draws", "type": "uint256" },
    { "name": "rating", "type": "uint256" },
    { "name": "gamesPlayed", "type": "uint256" }
  ]}] },
  { "type": "function", "name": "playerStats", "stateMutability": "view", "inputs": [{ "name": "player", "type": "address" }], "outputs": [{ "type": "uint256", "name": "wins" }, { "type": "uint256", "name": "losses" }, { "type": "uint256", "name": "draws" }, { "type": "uint256", "name": "rating" }, { "type": "uint256", "name": "gamesPlayed" }] },
  { "type": "function", "name": "totalGames", "stateMutability": "view", "inputs": [], "outputs": [{ "type": "uint256" }] },
  { "type": "function", "name": "gameNonce", "stateMutability": "view", "inputs": [], "outputs": [{ "type": "uint256" }] },
  { "type": "event", "name": "GameCreated", "inputs": [{ "name": "gameId", "type": "uint256", "indexed": true }, { "name": "white", "type": "address", "indexed": true }, { "name": "wager", "type": "uint256", "indexed": false }] },
  { "type": "event", "name": "GameJoined", "inputs": [{ "name": "gameId", "type": "uint256", "indexed": true }, { "name": "black", "type": "address", "indexed": true }] },
  { "type": "event", "name": "GameResigned", "inputs": [{ "name": "gameId", "type": "uint256", "indexed": true }, { "name": "loser", "type": "address", "indexed": true }, { "name": "winner", "type": "address", "indexed": true }] },
  { "type": "event", "name": "GameSettled", "inputs": [{ "name": "gameId", "type": "uint256", "indexed": true }, { "name": "result", "type": "uint8", "indexed": false }, { "name": "winner", "type": "address", "indexed": false }] },
  { "type": "event", "name": "DrawProposed", "inputs": [{ "name": "gameId", "type": "uint256", "indexed": true }, { "name": "proposer", "type": "address", "indexed": true }] },
  { "type": "event", "name": "DrawAccepted", "inputs": [{ "name": "gameId", "type": "uint256", "indexed": true }] },
  { "type": "event", "name": "GameCancelled", "inputs": [{ "name": "gameId", "type": "uint256", "indexed": true }, { "name": "creator", "type": "address", "indexed": true }] },
  { "type": "event", "name": "WagerReclaimed", "inputs": [{ "name": "gameId", "type": "uint256", "indexed": true }, { "name": "by", "type": "address", "indexed": true }] },
  { "type": "event", "name": "OracleUpdated", "inputs": [{ "name": "oracle", "type": "address", "indexed": true }] }
] as const

// Token ABI with the minter role (next deploy). The minter (a server hot key)
// can mintTo arbitrary recipients — used by the gas-sponsor flow to provision
// CHESS to fresh wallets without them spending gas on faucetClaim. Faucet +
// ERC-20 surface unchanged from CHESS_TOKEN_ABI.
export const EVM_CHESS_TOKEN_ABI = [
  { "type": "function", "name": "approve", "stateMutability": "nonpayable", "inputs": [{ "name": "spender", "type": "address" }, { "name": "amount", "type": "uint256" }], "outputs": [{ "type": "bool" }] },
  { "type": "function", "name": "balanceOf", "stateMutability": "view", "inputs": [{ "name": "account", "type": "address" }], "outputs": [{ "type": "uint256" }] },
  { "type": "function", "name": "allowance", "stateMutability": "view", "inputs": [{ "name": "owner", "type": "address" }, { "name": "spender", "type": "address" }], "outputs": [{ "type": "uint256" }] },
  { "type": "function", "name": "faucetClaim", "stateMutability": "nonpayable", "inputs": [], "outputs": [] },
  { "type": "function", "name": "mintTo", "stateMutability": "nonpayable", "inputs": [{ "name": "to", "type": "address" }, { "name": "amount", "type": "uint256" }], "outputs": [] },
  { "type": "function", "name": "setMinter", "stateMutability": "nonpayable", "inputs": [{ "name": "newMinter", "type": "address" }], "outputs": [] },
  { "type": "function", "name": "minter", "stateMutability": "view", "inputs": [], "outputs": [{ "type": "address" }] },
  { "type": "function", "name": "decimals", "stateMutability": "view", "inputs": [], "outputs": [{ "type": "uint8" }] }
] as const
