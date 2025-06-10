// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Script.sol";
import "../contracts/FairlaunchERC20.sol";

contract DeployScript is Script {
    function run() external {
        vm.startBroadcast();
        
        console.log("Deploying with account:", msg.sender);
        console.log("Account balance:", msg.sender.balance);
        
        // Deploy FairlaunchERC20
        FairlaunchERC20 fairlaunchToken = new FairlaunchERC20("FairLaunch Token", "FAIR");
        console.log("FairlaunchERC20 deployed to:", address(fairlaunchToken));
        
        // Fund the contract with ETH for paying NAVS stakes
        (bool success, ) = address(fairlaunchToken).call{value: 0.1 ether}("");
        require(success, "Failed to fund FairlaunchERC20 contract");
        console.log("Funded FairlaunchERC20 with 0.1 ETH");
        
        vm.stopBroadcast();
        
        console.log("=== DEPLOYMENT COMPLETE ===");
        console.log("FairlaunchERC20 address:", address(fairlaunchToken));
        console.log("Token name:", fairlaunchToken.name());
        console.log("Token symbol:", fairlaunchToken.symbol());
        console.log("Max supply:", fairlaunchToken.MAX_SUPPLY());
        console.log("Network: Base Sepolia (84532)");
        console.log("========================");
    }
}