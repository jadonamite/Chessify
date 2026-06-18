// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title ChessToken — Free-to-play ERC20 for Chessify Protocol on Base
/// @notice Faucet-based token. Users claim free CHESS tokens before playing.
///         Zero financial risk. Deploy first, then pass this address to ChessGame.

contract ChessToken is ERC20, Ownable {

    // ─────────────────────────────────────────────
    //  Constants
    // ─────────────────────────────────────────────

    uint8   private constant _DECIMALS     = 6;
    uint256 public  constant FAUCET_AMOUNT  = 1_000 * 10 ** _DECIMALS;  // 1,000 CHESS per claim
    uint256 public  constant FAUCET_COOLDOWN = 43_200;                   // ~1 day on Base (~2s blocks)

    // ─────────────────────────────────────────────
    //  State
    // ─────────────────────────────────────────────

    bool public mintEnabled = true;

    /// @notice Server wallet permitted to provision CHESS to gasless (smart-account)
    ///         wallets, so a 0-balance EOA never has to spend gas on faucetClaim. Mints a
    ///         valueless faucet token only — it can never touch game escrow.
    address public minter;

    mapping(address => uint256) public lastFaucetClaim;

    // ─────────────────────────────────────────────
    //  Errors
    // ─────────────────────────────────────────────

    error MintDisabled();
    error FaucetCooldown(uint256 blocksRemaining);
    error InvalidAmount();
    error NotMinter();

    // ─────────────────────────────────────────────
    //  Events
    // ─────────────────────────────────────────────

    event FaucetClaimed(address indexed player, uint256 amount);
    event MintToggled(bool enabled);
    event MinterUpdated(address indexed minter);

    // ─────────────────────────────────────────────
    //  Modifiers
    // ─────────────────────────────────────────────

    modifier onlyMinter() {
        if (msg.sender != minter) revert NotMinter();
        _;
    }

    // ─────────────────────────────────────────────
    //  Constructor
    // ─────────────────────────────────────────────

    constructor() ERC20("Chess Token", "CHESS") Ownable(msg.sender) {}

    // ─────────────────────────────────────────────
    //  ERC20 Override
    // ─────────────────────────────────────────────

    function decimals() public pure override returns (uint8) {
        return _DECIMALS;
    }

    // ─────────────────────────────────────────────
    //  Faucet
    // ─────────────────────────────────────────────

    /// @notice Claim 1,000 CHESS. One claim per ~24 hours.
    function faucetClaim() external {
        if (!mintEnabled) revert MintDisabled();

        uint256 lastClaim = lastFaucetClaim[msg.sender];
        uint256 elapsed   = block.number - lastClaim;

        if (lastClaim != 0 && elapsed < FAUCET_COOLDOWN) {
            revert FaucetCooldown(FAUCET_COOLDOWN - elapsed);
        }

        lastFaucetClaim[msg.sender] = block.number;
        _mint(msg.sender, FAUCET_AMOUNT);

        emit FaucetClaimed(msg.sender, FAUCET_AMOUNT);
    }

    /// @notice Blocks remaining until next faucet claim is available.
    function faucetCooldownRemaining(address account) external view returns (uint256) {
        uint256 lastClaim = lastFaucetClaim[account];
        if (lastClaim == 0) return 0;
        uint256 nextEligible = lastClaim + FAUCET_COOLDOWN;
        if (block.number >= nextEligible) return 0;
        return nextEligible - block.number;
    }

    // ─────────────────────────────────────────────
    //  Owner Mint
    // ─────────────────────────────────────────────

    /// @notice Mint tokens to a recipient (tournaments, rewards).
    function mint(address to, uint256 amount) external onlyOwner {
        if (!mintEnabled) revert MintDisabled();
        if (amount == 0) revert InvalidAmount();
        _mint(to, amount);
    }

    /// @notice Batch mint to multiple recipients.
    function batchMint(address[] calldata recipients, uint256[] calldata amounts) external onlyOwner {
        if (!mintEnabled) revert MintDisabled();
        require(recipients.length == amounts.length, "Length mismatch");
        for (uint256 i = 0; i < recipients.length; i++) {
            _mint(recipients[i], amounts[i]);
        }
    }

    // ─────────────────────────────────────────────
    //  Minter — Server provisions CHESS to gasless wallets
    // ─────────────────────────────────────────────

    /// @notice Set the minter (server wallet that provisions CHESS to gasless users).
    function setMinter(address newMinter) external onlyOwner {
        minter = newMinter;
        emit MinterUpdated(newMinter);
    }

    /// @notice Minter provisions CHESS to a recipient (e.g. a fresh smart-account wallet)
    ///         without that wallet spending gas on faucetClaim.
    function mintTo(address to, uint256 amount) external onlyMinter {
        if (!mintEnabled) revert MintDisabled();
        if (amount == 0) revert InvalidAmount();
        _mint(to, amount);
    }

    // ─────────────────────────────────────────────
    //  Owner Controls
    // ─────────────────────────────────────────────

    function setMintEnabled(bool enabled) external onlyOwner {
        mintEnabled = enabled;
        emit MintToggled(enabled);
    }
}
