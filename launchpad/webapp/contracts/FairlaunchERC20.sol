// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./lib/NavsReceiver.sol";

/**
 * FairlaunchERC20 - Fair Launch Token with NAVS Allocation System
 * 
 * An ERC20 token where users can mint tokens according to their verified allocation.
 * Allocations are determined by off-chain logic through NAVS (Node-Assisted Verification Service)
 * to ensure fair distribution and prevent gaming of the system.
 * 
 * Features:
 * - Standard ERC20 functionality
 * - NAVS-powered allocation verification
 * - Per-address minting limits based on off-chain calculations
 * - EigenLayer-secured verification
 */
contract FairlaunchERC20 is ERC20, NavsReceiver {
    
    // Tracking minted amounts per address
    mapping(address => uint256) public minted;
    
    // Pending mint requests
    mapping(uint256 => PendingMint) public pendingMints;
    mapping(address => uint256) public activeMintChecks;
    
    struct PendingMint {
        address to;
    }
    
    // Token configuration
    uint256 public constant MAX_SUPPLY = 1000000000 * 10**18; // 1B tokens max supply
    uint256 public constant ALLOCATION_CHECK_STAKE = 0.01 ether; // Stake for allocation checks
    
    // Events
    event MintRequested(address indexed user, uint256 indexed taskId);
    event MintApproved(address indexed user, uint256 amount);
    event MintRejected(address indexed user, string reason);
    
    // Errors
    error AllocationCheckInProgress();
    error ExceedsMaxSupply();
    error ZeroAddress();
    error AlreadyMinted();
    error MintNotFound();
    
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {}
    
    // ============ MINT FUNCTIONALITY ============
    
    /**
     * Request to mint tokens based on user's allocation
     * 
     * Users can mint their full allocation exactly once.
     * The allocation amount is determined by off-chain logic through NAVS.
     */
    function mint() external {
        address user = msg.sender;
        
        if (user == address(0)) {
            revert ZeroAddress();
        }
        
        // Check if user has already minted
        if (minted[user] > 0) {
            revert AlreadyMinted();
        }
        
        // Check if allocation check already in progress
        if (activeMintChecks[user] != 0) {
            revert AllocationCheckInProgress();
        }
        
        // Request allocation verification via NAVS
        uint256 taskId = getTokenAllocation(user, ALLOCATION_CHECK_STAKE);
        
        // Track the pending mint
        pendingMints[taskId] = PendingMint({
            to: user
        });
        activeMintChecks[user] = taskId;
        
        emit MintRequested(user, taskId);
    }
    
    /**
     * Check mint status for a user
     */
    function getMintStatus(address user) external view returns (
        bool hasActiveMintCheck,
        uint256 activeTaskId,
        uint256 alreadyMinted
    ) {
        activeTaskId = activeMintChecks[user];
        hasActiveMintCheck = activeTaskId != 0;
        alreadyMinted = minted[user];
    }
    
    /**
     * Get user's total minted amount
     */
    function getUserMinted(address user) external view returns (uint256) {
        return minted[user];
    }
    
    // ============ NAVS CALLBACK HANDLERS ============
    
    /**
     * Handle allocation check results from NAVS
     * 
     * This callback is automatically called when EigenLayer validators
     * complete the allocation verification for an address.
     */
    function onGetTokenAllocation(
        uint256 taskId, 
        address address_param, 
        uint256 result, 
        string memory error
    ) internal override {
        PendingMint memory pendingMint = pendingMints[taskId];
        
        // Clear pending state
        delete pendingMints[taskId];
        delete activeMintChecks[pendingMint.to];
        
        // Handle error case
        if (bytes(error).length > 0) {
            emit MintRejected(pendingMint.to, error);
            return;
        }
        
        // Get user's full allocation
        uint256 userAllocation = result;
        
        // Check if allocation exceeds max supply
        if (totalSupply() + userAllocation > MAX_SUPPLY) {
            emit MintRejected(pendingMint.to, "Allocation exceeds remaining max supply");
            return;
        }
        
        // Mint the full allocation
        _processMint(pendingMint.to, userAllocation);
    }
    
    /**
     * Internal function to process approved mints
     */
    function _processMint(address to, uint256 amount) internal {
        _mint(to, amount);
        minted[to] = amount;
        
        emit MintApproved(to, amount);
    }
    
    // ============ EMERGENCY FUNCTIONS ============
    
    /**
     * Emergency function for demo purposes
     * In production, this would have proper access control
     */
    function emergencyWithdraw() external {
        payable(msg.sender).transfer(address(this).balance);
    }
    
    /**
     * Allow contract to receive ETH for paying NAVS stakes
     */
    receive() external payable {}
}