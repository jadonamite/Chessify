// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {ChessToken} from "../src/ChessToken.sol";
import {ChessGame} from "../src/ChessGame.sol";

/// @notice Base deploy: ChessToken → ChessGame(token) → wires oracle + minter.
///         Owner = deployer (0xF679… master). No transferOwnership.
///
/// Required env:
///   DEPLOYER_PRIVATE_KEY  — master wallet, deploys + owns both contracts
///   ORACLE_ADDRESS        — settlement oracle (set as ChessGame.oracle)
///   MINTER_ADDRESS        — server minter (set as ChessToken.minter); may equal oracle
///
/// Usage (run by Jadon, key from env):
///   forge script script/Deploy.s.sol:Deploy --rpc-url base --broadcast
contract Deploy is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address oracleAddr = vm.envAddress("ORACLE_ADDRESS");
        address minterAddr = vm.envAddress("MINTER_ADDRESS");

        vm.startBroadcast(deployerKey);

        ChessToken token = new ChessToken();
        ChessGame game = new ChessGame(address(token));

        game.setOracle(oracleAddr);
        token.setMinter(minterAddr);

        vm.stopBroadcast();

        console.log("ChessToken:", address(token));
        console.log("ChessGame: ", address(game));
        console.log("Oracle:    ", oracleAddr);
        console.log("Minter:    ", minterAddr);
    }
}
