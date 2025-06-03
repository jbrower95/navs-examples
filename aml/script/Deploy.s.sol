// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "../contracts/UnemploymentCoin.sol";

contract DeployScript is Script {
    function run() external {
        vm.startBroadcast();
        
        console.log("Deploying with account:", msg.sender);
        console.log("Account balance:", msg.sender.balance);
        
        // Use TaskDispatch with enhanced callbacks (Base Sepolia)
        address taskDispatch = 0x1b5CBAe690E05ced9A93B2F901221e72D365c2a9;
        console.log("Using existing TaskDispatch at:", taskDispatch);
        
        // Deploy UnemploymentCoin
        UnemploymentCoin unemploymentCoin = new UnemploymentCoin();
        console.log("UnemploymentCoin deployed to:", address(unemploymentCoin));
        
        // Fund the contract with ETH for paying NAVS stakes
        (bool success, ) = address(unemploymentCoin).call{value: 0.1 ether}("");
        require(success, "Failed to fund UnemploymentCoin contract");
        console.log("Funded UnemploymentCoin with 0.1 ETH");
        
        vm.stopBroadcast();
        
        console.log("=== DEPLOYMENT COMPLETE ===");
        console.log("TaskDispatch address:", taskDispatch);
        console.log("UnemploymentCoin address:", address(unemploymentCoin));
        console.log("Network: Base Sepolia (84532)");
        console.log("========================");
    }
}