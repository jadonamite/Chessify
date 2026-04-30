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
  { "type": "function", "name": "playerStats", "stateMutability": "view", "inputs": [{ "name": "player_", "type": "address" }], "outputs": [{ "type": "uint256", "name": "wins" }, { "type": "uint256", "name": "losses" }, { "type": "uint256", "name": "draws" }, { "type": "uint256", "name": "rating" }, { "type": "uint256", "name": "gamesPlayed" }] },
  { "type": "function", "name": "gameNonce", "stateMutability": "view", "inputs": [], "outputs": [{ "type": "uint256" }] },
  { "type": "event", "name": "GameCreated", "inputs": [{ "name": "gameId", "type": "uint256", "indexed": true }, { "name": "white", "type": "address", "indexed": true }, { "name": "wager", "type": "uint256", "indexed": false }] },
  { "type": "event", "name": "GameJoined", "inputs": [{ "name": "gameId", "type": "uint256", "indexed": true }, { "name": "black", "type": "address", "indexed": true }] },
  { "type": "event", "name": "MoveMade", "inputs": [{ "name": "gameId", "type": "uint256", "indexed": true }, { "name": "player_", "type": "address", "indexed": true }, { "name": "moveCount", "type": "uint256", "indexed": false }] }
] as const
