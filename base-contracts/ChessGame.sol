// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title ChessGame — On-chain chess protocol for Chessify on Base
///
/// @notice Handles game lifecycle, wagers (CHESS token), escrow, and player stats.
///         Chess rules are validated client-side by chess.js. Moves are synced via
///         an off-chain Redis relay — only game outcomes are settled on-chain.
///
/// DEPLOYMENT ORDER:
///   1. Deploy ChessToken
///   2. Deploy ChessGame(chessTokenAddress)
///   3. Players call ChessToken.approve(chessGameAddress, amount) before wagering
///
/// TRUST MODEL:
///   - resign()      → caller loses (can only hurt yourself)
///   - reportWin()   → caller claims checkmate or timeout win (acceptable for free tokens)
///   - settleDraw()  → two-step: both players must agree before pot is split

contract ChessGame is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // ══════════════════════════════════════════════
    //  Types
    // ══════════════════════════════════════════════

    enum GameStatus {
        Waiting,   // 0 — created, waiting for opponent
        Active,    // 1 — both players joined, game in progress
        Finished,  // 2 — game ended (win/loss)
        Draw       // 3 — game ended in draw
    }

    enum GameResult {
        None,        // 0 — game in progress
        WhiteWins,   // 1
        BlackWins,   // 2
        DrawResult   // 3
    }

    struct Game {
        address white;
        address black;
        uint256 wager;      // 0 = free game
        GameStatus status;
        GameResult result;
    }

    struct PlayerStats {
        uint256 wins;
        uint256 losses;
        uint256 draws;
        uint256 rating;       // Elo (starts at 1200)
        uint256 gamesPlayed;
    }

    // ══════════════════════════════════════════════
    //  State
    // ══════════════════════════════════════════════

    IERC20 public immutable chessToken;

    uint256 public gameNonce;
    uint256 public constant STARTING_ELO = 1200;
    uint256 public constant K_FACTOR     = 32;
    uint256 public constant MIN_RATING   = 100;

    mapping(uint256 => Game)        public games;
    mapping(address => PlayerStats) public playerStats;

    // Separate from the Game struct — avoids bloating every stored game
    // with a field that is only populated for the brief draw-negotiation window.
    mapping(uint256 => address) private _drawProposal;

    // ══════════════════════════════════════════════
    //  Errors
    // ══════════════════════════════════════════════

    error GameNotFound();
    error NotYourGame();
    error GameNotWaiting();
    error GameNotActive();
    error CannotJoinOwnGame();
    error AlreadyProposedDraw();

    // ══════════════════════════════════════════════
    //  Events
    // ══════════════════════════════════════════════

    event GameCreated(uint256 indexed gameId, address indexed white, uint256 wager);
    event GameJoined(uint256 indexed gameId, address indexed black);
    event GameResigned(uint256 indexed gameId, address indexed loser, address indexed winner);
    event CheckmateReported(uint256 indexed gameId, address indexed winner, address indexed loser);
    event DrawProposed(uint256 indexed gameId, address indexed proposer);
    event DrawSettled(uint256 indexed gameId);

    // ══════════════════════════════════════════════
    //  Constructor
    // ══════════════════════════════════════════════

    constructor(address _chessToken) Ownable(msg.sender) {
        chessToken = IERC20(_chessToken);
    }

    // ══════════════════════════════════════════════
    //  Game Lifecycle
    // ══════════════════════════════════════════════

    /// @notice Create a new game. Pass wager = 0 for a free game.
    ///         If wagering, caller must have approved this contract to spend CHESS tokens.
    function createGame(uint256 wager) external nonReentrant returns (uint256 gameId) {
        gameId = gameNonce++;

        if (wager > 0) {
            chessToken.safeTransferFrom(msg.sender, address(this), wager);
        }

        _initPlayerIfNeeded(msg.sender);

        games[gameId] = Game({
            white:  msg.sender,
            black:  address(0),
            wager:  wager,
            status: GameStatus.Waiting,
            result: GameResult.None
        });

        emit GameCreated(gameId, msg.sender, wager);
    }

    /// @notice Join an open game. Wager is matched automatically.
    function joinGame(uint256 gameId) external nonReentrant {
        Game storage game = games[gameId];
        if (game.white == address(0))          revert GameNotFound();
        if (game.status != GameStatus.Waiting) revert GameNotWaiting();
        if (msg.sender == game.white)          revert CannotJoinOwnGame();

        if (game.wager > 0) {
            chessToken.safeTransferFrom(msg.sender, address(this), game.wager);
        }

        _initPlayerIfNeeded(msg.sender);

        game.black  = msg.sender;
        game.status = GameStatus.Active;

        emit GameJoined(gameId, msg.sender);
    }

    /// @notice Resign — caller loses, opponent wins automatically.
    ///         You can only concede your own position; no one can resign for you.
    function resign(uint256 gameId) external nonReentrant {
        Game storage game = games[gameId];
        if (game.status != GameStatus.Active)                      revert GameNotActive();
        if (msg.sender != game.white && msg.sender != game.black)  revert NotYourGame();

        address winner = (msg.sender == game.white) ? game.black : game.white;
        GameResult result = (winner == game.white) ? GameResult.WhiteWins : GameResult.BlackWins;

        _endGame(game, GameStatus.Finished, result, winner, msg.sender);

        emit GameResigned(gameId, msg.sender, winner);
    }

    /// @notice Report a win — caller claims checkmate or a client-side timeout.
    ///         Trust model: CHESS tokens are free, so the cost of a false claim is
    ///         minimal. Chess.js enforces game rules on the client.
    function reportWin(uint256 gameId) external nonReentrant {
        Game storage game = games[gameId];
        if (game.status != GameStatus.Active)                      revert GameNotActive();
        if (msg.sender != game.white && msg.sender != game.black)  revert NotYourGame();

        address winner = msg.sender;
        address loser  = (msg.sender == game.white) ? game.black : game.white;
        GameResult result = (winner == game.white) ? GameResult.WhiteWins : GameResult.BlackWins;

        _endGame(game, GameStatus.Finished, result, winner, loser);

        emit CheckmateReported(gameId, winner, loser);
    }

    /// @notice Settle a draw — requires agreement from both players.
    ///
    ///         First call  (either player) → records the proposal.
    ///         Second call (the other player) → splits the pot and ends the game.
    ///
    ///         If the proposer calls again before their opponent responds, it reverts.
    ///         Making a move on the relay does NOT cancel the proposal on-chain — the
    ///         frontend should call this only when chess.js has confirmed a drawn position.
    function settleDraw(uint256 gameId) external nonReentrant {
        Game storage game = games[gameId];
        if (game.status != GameStatus.Active)                      revert GameNotActive();
        if (msg.sender != game.white && msg.sender != game.black)  revert NotYourGame();

        address existing = _drawProposal[gameId];

        if (existing == address(0)) {
            // First call — record the proposal
            _drawProposal[gameId] = msg.sender;
            emit DrawProposed(gameId, msg.sender);
            return;
        }

        // Proposer cannot accept their own draw
        if (existing == msg.sender) revert AlreadyProposedDraw();

        // Both agreed — settle
        delete _drawProposal[gameId];

        game.status = GameStatus.Draw;
        game.result = GameResult.DrawResult;

        if (game.wager > 0) {
            chessToken.safeTransfer(game.white, game.wager);
            chessToken.safeTransfer(game.black, game.wager);
        }

        playerStats[game.white].draws++;
        playerStats[game.white].gamesPlayed++;
        playerStats[game.black].draws++;
        playerStats[game.black].gamesPlayed++;

        emit DrawSettled(gameId);
    }

    // ══════════════════════════════════════════════
    //  Read Functions
    // ══════════════════════════════════════════════

    function getGame(uint256 gameId) external view returns (Game memory) {
        return games[gameId];
    }

    function getPlayerStats(address player) external view returns (PlayerStats memory) {
        return playerStats[player];
    }

    function totalGames() external view returns (uint256) {
        return gameNonce;
    }

    /// @notice Returns the address that proposed a draw for a given game, or address(0) if none.
    function drawProposal(uint256 gameId) external view returns (address) {
        return _drawProposal[gameId];
    }

    // ══════════════════════════════════════════════
    //  Internal — Game End + Elo
    // ══════════════════════════════════════════════

    function _endGame(
        Game storage game,
        GameStatus status,
        GameResult result,
        address winner,
        address loser
    ) internal {
        game.status = status;
        game.result = result;

        uint256 totalPot = game.wager * 2;
        if (totalPot > 0) {
            chessToken.safeTransfer(winner, totalPot);
        }

        playerStats[winner].wins++;
        playerStats[winner].gamesPlayed++;
        playerStats[loser].losses++;
        playerStats[loser].gamesPlayed++;

        _updateElo(winner, loser);
    }

    /// @dev Simplified integer Elo. Underdog wins = bigger gain. Favourite wins = smaller gain.
    function _updateElo(address winner, address loser) internal {
        uint256 winnerRating = playerStats[winner].rating;
        uint256 loserRating  = playerStats[loser].rating;

        uint256 diff;
        uint256 winnerChange;
        uint256 loserChange;

        if (winnerRating >= loserRating) {
            diff = winnerRating - loserRating;
            if (diff > 400) diff = 400;
            winnerChange = K_FACTOR * (400 - diff) / 800;
            loserChange  = K_FACTOR * (400 + diff) / 800;
        } else {
            diff = loserRating - winnerRating;
            if (diff > 400) diff = 400;
            winnerChange = K_FACTOR * (400 + diff) / 800;
            loserChange  = K_FACTOR * (400 - diff) / 800;
        }

        if (winnerChange == 0) winnerChange = 1;
        if (loserChange  == 0) loserChange  = 1;

        playerStats[winner].rating += winnerChange;

        if (playerStats[loser].rating > loserChange + MIN_RATING) {
            playerStats[loser].rating -= loserChange;
        } else {
            playerStats[loser].rating = MIN_RATING;
        }
    }

    function _initPlayerIfNeeded(address player) internal {
        if (playerStats[player].rating == 0) {
            playerStats[player].rating = STARTING_ELO;
        }
    }
}
