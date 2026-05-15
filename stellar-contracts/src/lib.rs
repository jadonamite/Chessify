#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, token, Address, Env,
};

// ══════════════════════════════════════════════════════════════════════════════
//  Error codes
// ══════════════════════════════════════════════════════════════════════════════

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum ChessError {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    GameNotFound = 3,
    NotYourGame = 4,
    NotYourTurn = 5,
    GameNotWaiting = 6,
    GameNotActive = 7,
    CannotJoinOwnGame = 8,
    TimeoutNotReached = 9,
    NoDrawProposed = 10,
    AlreadyProposedDraw = 11,
    CannotAcceptOwnDraw = 12,
}

// ══════════════════════════════════════════════════════════════════════════════
//  Enums
// ══════════════════════════════════════════════════════════════════════════════

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum GameStatus {
    Waiting = 0,
    Active = 1,
    Finished = 2,
    Cancelled = 3,
    Draw = 4,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum GameResult {
    None = 0,
    WhiteWins = 1,
    BlackWins = 2,
    DrawResult = 3,
    Cancelled = 4,
}

// ══════════════════════════════════════════════════════════════════════════════
//  Data structures
// ══════════════════════════════════════════════════════════════════════════════

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Game {
    pub white: Address,
    pub black: Address,           // zero-like sentinel when empty (set to white initially)
    pub wager: i128,
    pub status: GameStatus,
    pub result: GameResult,
    pub turn: Address,            // whose turn it is
    pub move_count: u32,
    pub created_at: u64,          // ledger timestamp (seconds)
    pub last_move_ts: u64,        // ledger timestamp of last move
    pub draw_proposer: Address,   // set to white as sentinel for "none"
    pub has_black: bool,          // false until a second player joins
    pub draw_proposed: bool,      // whether a draw is currently proposed
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PlayerStats {
    pub wins: u32,
    pub losses: u32,
    pub draws: u32,
    pub rating: u32,
    pub games_played: u32,
}

// ══════════════════════════════════════════════════════════════════════════════
//  Storage keys
// ══════════════════════════════════════════════════════════════════════════════

#[contracttype]
pub enum DataKey {
    Initialized,
    Admin,
    Token,
    TimeoutSecs,
    GameCounter,
    Game(u32),
    Stats(Address),
}

// ══════════════════════════════════════════════════════════════════════════════
//  Constants
// ══════════════════════════════════════════════════════════════════════════════

const STARTING_ELO: u32 = 1200;
const K_FACTOR: u32 = 32;
const MIN_RATING: u32 = 100;
const DEFAULT_TIMEOUT: u64 = 1800; // 30 minutes in seconds

// ══════════════════════════════════════════════════════════════════════════════
//  Contract
// ══════════════════════════════════════════════════════════════════════════════

#[contract]
pub struct ChessGameContract;

#[contractimpl]
impl ChessGameContract {
    // ─── Initialization ─────────────────────────────────────────────────

    /// Set up the contract with the token address and admin.
    /// Can only be called once.
    pub fn initialize(
        env: Env,
        admin: Address,
        token: Address,
        timeout_secs: u64,
    ) -> Result<(), ChessError> {
        if env.storage().instance().has(&DataKey::Initialized) {
            return Err(ChessError::AlreadyInitialized);
        }

        let timeout = if timeout_secs == 0 {
            DEFAULT_TIMEOUT
        } else {
            timeout_secs
        };

        env.storage().instance().set(&DataKey::Initialized, &true);
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(&DataKey::TimeoutSecs, &timeout);
        env.storage().instance().set(&DataKey::GameCounter, &0u32);

        Ok(())
    }

    // ─── Game lifecycle ─────────────────────────────────────────────────

    /// Create a new game. Pass wager = 0 for a free game.
    /// Caller must have approved this contract to spend `wager` tokens.
    pub fn create_game(env: Env, creator: Address, wager: i128) -> Result<u32, ChessError> {
        creator.require_auth();
        Self::require_init(&env)?;

        let token_addr: Address = env.storage().instance().get(&DataKey::Token).unwrap();

        // Lock wager
        if wager > 0 {
            let token_client = token::Client::new(&env, &token_addr);
            token_client.transfer(&creator, &env.current_contract_address(), &wager);
        }

        // Init stats
        Self::init_player(&env, &creator);

        // Allocate game ID
        let game_id: u32 = env.storage().instance().get(&DataKey::GameCounter).unwrap();
        env.storage()
            .instance()
            .set(&DataKey::GameCounter, &(game_id + 1));

        let now = env.ledger().timestamp();

        let game = Game {
            white: creator.clone(),
            black: creator.clone(),       // sentinel — no opponent yet
            wager,
            status: GameStatus::Waiting,
            result: GameResult::None,
            turn: creator.clone(),        // white moves first
            move_count: 0,
            created_at: now,
            last_move_ts: now,
            draw_proposer: creator.clone(), // sentinel
            has_black: false,
            draw_proposed: false,
        };

        env.storage().persistent().set(&DataKey::Game(game_id), &game);

        // Publish event
        env.events()
            .publish(("game_created", creator), game_id);

        Ok(game_id)
    }

    /// Join an open game. Wager is automatically matched.
    pub fn join_game(env: Env, player: Address, game_id: u32) -> Result<(), ChessError> {
        player.require_auth();
        Self::require_init(&env)?;

        let mut game: Game = env
            .storage()
            .persistent()
            .get(&DataKey::Game(game_id))
            .ok_or(ChessError::GameNotFound)?;

        if game.status != GameStatus::Waiting {
            return Err(ChessError::GameNotWaiting);
        }
        if player == game.white {
            return Err(ChessError::CannotJoinOwnGame);
        }

        // Lock matching wager
        if game.wager > 0 {
            let token_addr: Address =
                env.storage().instance().get(&DataKey::Token).unwrap();
            let token_client = token::Client::new(&env, &token_addr);
            token_client.transfer(&player, &env.current_contract_address(), &game.wager);
        }

        Self::init_player(&env, &player);

        game.black = player.clone();
        game.has_black = true;
        game.status = GameStatus::Active;
        game.last_move_ts = env.ledger().timestamp();

        env.storage()
            .persistent()
            .set(&DataKey::Game(game_id), &game);

        env.events().publish(("game_joined", player), game_id);

        Ok(())
    }

    /// Record a move — flips turn and resets the timeout clock.
    /// No move data is stored on-chain; chess.js validates client-side.
    pub fn submit_move(env: Env, player: Address, game_id: u32) -> Result<(), ChessError> {
        player.require_auth();
        Self::require_init(&env)?;

        let mut game: Game = env
            .storage()
            .persistent()
            .get(&DataKey::Game(game_id))
            .ok_or(ChessError::GameNotFound)?;

        if game.status != GameStatus::Active {
            return Err(ChessError::GameNotActive);
        }
        if player != game.turn {
            return Err(ChessError::NotYourTurn);
        }

        // Flip turn
        game.turn = if player == game.white {
            game.black.clone()
        } else {
            game.white.clone()
        };
        game.move_count += 1;
        game.last_move_ts = env.ledger().timestamp();

        // Clear pending draw proposal
        game.draw_proposed = false;

        env.storage()
            .persistent()
            .set(&DataKey::Game(game_id), &game);

        env.events()
            .publish(("move_made", player), (game_id, game.move_count));

        Ok(())
    }

    /// Resign — caller loses, opponent wins automatically.
    pub fn resign(env: Env, player: Address, game_id: u32) -> Result<(), ChessError> {
        player.require_auth();
        Self::require_init(&env)?;

        let mut game: Game = env
            .storage()
            .persistent()
            .get(&DataKey::Game(game_id))
            .ok_or(ChessError::GameNotFound)?;

        if game.status != GameStatus::Active {
            return Err(ChessError::GameNotActive);
        }
        if player != game.white && player != game.black {
            return Err(ChessError::NotYourGame);
        }

        let (winner, loser) = if player == game.white {
            (game.black.clone(), game.white.clone())
        } else {
            (game.white.clone(), game.black.clone())
        };

        let result = if winner == game.white {
            GameResult::WhiteWins
        } else {
            GameResult::BlackWins
        };

        Self::end_game(&env, &mut game, GameStatus::Finished, result, &winner, &loser);

        env.storage()
            .persistent()
            .set(&DataKey::Game(game_id), &game);

        env.events()
            .publish(("game_resigned", loser), (game_id, winner));

        Ok(())
    }

    /// Report checkmate — caller claims they won.
    /// Trust model: CHESS tokens are free, so risk of false reports is minimal.
    /// chess.js validates actual game state on the frontend.
    pub fn report_win(env: Env, player: Address, game_id: u32) -> Result<(), ChessError> {
        player.require_auth();
        Self::require_init(&env)?;

        let mut game: Game = env
            .storage()
            .persistent()
            .get(&DataKey::Game(game_id))
            .ok_or(ChessError::GameNotFound)?;

        if game.status != GameStatus::Active {
            return Err(ChessError::GameNotActive);
        }
        if player != game.white && player != game.black {
            return Err(ChessError::NotYourGame);
        }

        let winner = player.clone();
        let loser = if player == game.white {
            game.black.clone()
        } else {
            game.white.clone()
        };

        let result = if winner == game.white {
            GameResult::WhiteWins
        } else {
            GameResult::BlackWins
        };

        Self::end_game(&env, &mut game, GameStatus::Finished, result, &winner, &loser);

        env.storage()
            .persistent()
            .set(&DataKey::Game(game_id), &game);

        env.events()
            .publish(("checkmate_reported", winner), (game_id, loser));

        Ok(())
    }

    /// Claim timeout win — opponent hasn't moved within the timeout window.
    pub fn claim_timeout(env: Env, player: Address, game_id: u32) -> Result<(), ChessError> {
        player.require_auth();
        Self::require_init(&env)?;

        let mut game: Game = env
            .storage()
            .persistent()
            .get(&DataKey::Game(game_id))
            .ok_or(ChessError::GameNotFound)?;

        if game.status != GameStatus::Active {
            return Err(ChessError::GameNotActive);
        }
        if player != game.white && player != game.black {
            return Err(ChessError::NotYourGame);
        }
        // Claimer must NOT be the one whose turn it is
        if player == game.turn {
            return Err(ChessError::NotYourTurn);
        }

        let timeout: u64 = env.storage().instance().get(&DataKey::TimeoutSecs).unwrap();
        let now = env.ledger().timestamp();
        if now - game.last_move_ts < timeout {
            return Err(ChessError::TimeoutNotReached);
        }

        let winner = player.clone();
        let loser = game.turn.clone(); // the one who timed out

        let result = if winner == game.white {
            GameResult::WhiteWins
        } else {
            GameResult::BlackWins
        };

        Self::end_game(&env, &mut game, GameStatus::Finished, result, &winner, &loser);

        env.storage()
            .persistent()
            .set(&DataKey::Game(game_id), &game);

        env.events()
            .publish(("timeout_claimed", winner), (game_id, loser));

        Ok(())
    }

    /// Propose a draw.
    pub fn propose_draw(env: Env, player: Address, game_id: u32) -> Result<(), ChessError> {
        player.require_auth();
        Self::require_init(&env)?;

        let mut game: Game = env
            .storage()
            .persistent()
            .get(&DataKey::Game(game_id))
            .ok_or(ChessError::GameNotFound)?;

        if game.status != GameStatus::Active {
            return Err(ChessError::GameNotActive);
        }
        if player != game.white && player != game.black {
            return Err(ChessError::NotYourGame);
        }
        if game.draw_proposed && game.draw_proposer == player {
            return Err(ChessError::AlreadyProposedDraw);
        }

        game.draw_proposed = true;
        game.draw_proposer = player.clone();

        env.storage()
            .persistent()
            .set(&DataKey::Game(game_id), &game);

        env.events()
            .publish(("draw_proposed", player), game_id);

        Ok(())
    }

    /// Accept a pending draw proposal. Both players get their wager back.
    pub fn accept_draw(env: Env, player: Address, game_id: u32) -> Result<(), ChessError> {
        player.require_auth();
        Self::require_init(&env)?;

        let mut game: Game = env
            .storage()
            .persistent()
            .get(&DataKey::Game(game_id))
            .ok_or(ChessError::GameNotFound)?;

        if game.status != GameStatus::Active {
            return Err(ChessError::GameNotActive);
        }
        if player != game.white && player != game.black {
            return Err(ChessError::NotYourGame);
        }
        if !game.draw_proposed {
            return Err(ChessError::NoDrawProposed);
        }
        if game.draw_proposer == player {
            return Err(ChessError::CannotAcceptOwnDraw);
        }

        game.status = GameStatus::Draw;
        game.result = GameResult::DrawResult;

        // Refund both players
        if game.wager > 0 {
            let token_addr: Address =
                env.storage().instance().get(&DataKey::Token).unwrap();
            let token_client = token::Client::new(&env, &token_addr);
            token_client.transfer(
                &env.current_contract_address(),
                &game.white,
                &game.wager,
            );
            token_client.transfer(
                &env.current_contract_address(),
                &game.black,
                &game.wager,
            );
        }

        // Update stats
        let mut white_stats = Self::get_or_init_stats(&env, &game.white);
        let mut black_stats = Self::get_or_init_stats(&env, &game.black);
        white_stats.draws += 1;
        white_stats.games_played += 1;
        black_stats.draws += 1;
        black_stats.games_played += 1;
        env.storage()
            .persistent()
            .set(&DataKey::Stats(game.white.clone()), &white_stats);
        env.storage()
            .persistent()
            .set(&DataKey::Stats(game.black.clone()), &black_stats);

        env.storage()
            .persistent()
            .set(&DataKey::Game(game_id), &game);

        env.events().publish(("draw_accepted",), game_id);

        Ok(())
    }

    /// Cancel a game that hasn't started yet. Only the creator can cancel.
    pub fn cancel_game(env: Env, player: Address, game_id: u32) -> Result<(), ChessError> {
        player.require_auth();
        Self::require_init(&env)?;

        let mut game: Game = env
            .storage()
            .persistent()
            .get(&DataKey::Game(game_id))
            .ok_or(ChessError::GameNotFound)?;

        if game.status != GameStatus::Waiting {
            return Err(ChessError::GameNotWaiting);
        }
        if player != game.white {
            return Err(ChessError::NotYourGame);
        }

        game.status = GameStatus::Cancelled;
        game.result = GameResult::Cancelled;

        // Refund creator
        if game.wager > 0 {
            let token_addr: Address =
                env.storage().instance().get(&DataKey::Token).unwrap();
            let token_client = token::Client::new(&env, &token_addr);
            token_client.transfer(
                &env.current_contract_address(),
                &game.white,
                &game.wager,
            );
        }

        env.storage()
            .persistent()
            .set(&DataKey::Game(game_id), &game);

        env.events()
            .publish(("game_cancelled", player), game_id);

        Ok(())
    }

    // ─── Read functions ─────────────────────────────────────────────────

    /// Get full game data.
    pub fn get_game(env: Env, game_id: u32) -> Result<Game, ChessError> {
        env.storage()
            .persistent()
            .get(&DataKey::Game(game_id))
            .ok_or(ChessError::GameNotFound)
    }

    /// Get a player's stats.
    pub fn get_player_stats(env: Env, player: Address) -> PlayerStats {
        Self::get_or_init_stats(&env, &player)
    }

    /// Total number of games created.
    pub fn total_games(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::GameCounter)
            .unwrap_or(0)
    }

    /// Check if a game can be timed out right now.
    pub fn can_claim_timeout(env: Env, game_id: u32) -> bool {
        let game: Option<Game> = env.storage().persistent().get(&DataKey::Game(game_id));
        match game {
            Some(g) => {
                if g.status != GameStatus::Active {
                    return false;
                }
                let timeout: u64 =
                    env.storage().instance().get(&DataKey::TimeoutSecs).unwrap_or(DEFAULT_TIMEOUT);
                env.ledger().timestamp() - g.last_move_ts >= timeout
            }
            None => false,
        }
    }

    /// Seconds remaining until timeout is claimable.
    pub fn seconds_until_timeout(env: Env, game_id: u32) -> u64 {
        let game: Option<Game> = env.storage().persistent().get(&DataKey::Game(game_id));
        match game {
            Some(g) => {
                if g.status != GameStatus::Active {
                    return 0;
                }
                let timeout: u64 =
                    env.storage().instance().get(&DataKey::TimeoutSecs).unwrap_or(DEFAULT_TIMEOUT);
                let elapsed = env.ledger().timestamp() - g.last_move_ts;
                if elapsed >= timeout {
                    0
                } else {
                    timeout - elapsed
                }
            }
            None => 0,
        }
    }

    // ─── Admin ──────────────────────────────────────────────────────────

    /// Update the timeout duration (in seconds). Admin only.
    pub fn set_timeout(env: Env, admin: Address, timeout_secs: u64) -> Result<(), ChessError> {
        admin.require_auth();
        Self::require_init(&env)?;

        let stored_admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        if admin != stored_admin {
            return Err(ChessError::NotYourGame); // reuse error for unauthorized
        }

        env.storage()
            .instance()
            .set(&DataKey::TimeoutSecs, &timeout_secs);

        Ok(())
    }

    // ─── Internal helpers ───────────────────────────────────────────────

    fn require_init(env: &Env) -> Result<(), ChessError> {
        if !env.storage().instance().has(&DataKey::Initialized) {
            return Err(ChessError::NotInitialized);
        }
        Ok(())
    }

    fn init_player(env: &Env, player: &Address) {
        let key = DataKey::Stats(player.clone());
        if !env.storage().persistent().has(&key) {
            let stats = PlayerStats {
                wins: 0,
                losses: 0,
                draws: 0,
                rating: STARTING_ELO,
                games_played: 0,
            };
            env.storage().persistent().set(&key, &stats);
        }
    }

    fn get_or_init_stats(env: &Env, player: &Address) -> PlayerStats {
        let key = DataKey::Stats(player.clone());
        env.storage().persistent().get(&key).unwrap_or(PlayerStats {
            wins: 0,
            losses: 0,
            draws: 0,
            rating: STARTING_ELO,
            games_played: 0,
        })
    }

    /// End a game: set status/result, transfer pot to winner, update Elo.
    fn end_game(
        env: &Env,
        game: &mut Game,
        status: GameStatus,
        result: GameResult,
        winner: &Address,
        loser: &Address,
    ) {
        game.status = status;
        game.result = result;

        // Transfer total pot to winner
        let total_pot = game.wager * 2;
        if total_pot > 0 {
            let token_addr: Address = env.storage().instance().get(&DataKey::Token).unwrap();
            let token_client = token::Client::new(env, &token_addr);
            token_client.transfer(&env.current_contract_address(), winner, &total_pot);
        }

        // Update stats
        let mut winner_stats = Self::get_or_init_stats(env, winner);
        let mut loser_stats = Self::get_or_init_stats(env, loser);

        winner_stats.wins += 1;
        winner_stats.games_played += 1;
        loser_stats.losses += 1;
        loser_stats.games_played += 1;

        // Update Elo ratings
        Self::update_elo(&mut winner_stats, &mut loser_stats);

        env.storage()
            .persistent()
            .set(&DataKey::Stats(winner.clone()), &winner_stats);
        env.storage()
            .persistent()
            .set(&DataKey::Stats(loser.clone()), &loser_stats);
    }

    /// Simplified Elo calculation using integer math.
    /// Underdog wins = bigger gain, favorite wins = smaller gain.
    fn update_elo(winner: &mut PlayerStats, loser: &mut PlayerStats) {
        let w_rating = winner.rating;
        let l_rating = loser.rating;

        let (winner_change, loser_change) = if w_rating >= l_rating {
            // Winner was favored — smaller gain
            let diff = core::cmp::min(w_rating - l_rating, 400);
            (
                core::cmp::max(K_FACTOR * (400 - diff) / 800, 1),
                core::cmp::max(K_FACTOR * (400 + diff) / 800, 1),
            )
        } else {
            // Winner was underdog — bigger gain
            let diff = core::cmp::min(l_rating - w_rating, 400);
            (
                core::cmp::max(K_FACTOR * (400 + diff) / 800, 1),
                core::cmp::max(K_FACTOR * (400 - diff) / 800, 1),
            )
        };

        winner.rating += winner_change;

        if loser.rating > loser_change + MIN_RATING {
            loser.rating -= loser_change;
        } else {
            loser.rating = MIN_RATING;
        }
    }
}
