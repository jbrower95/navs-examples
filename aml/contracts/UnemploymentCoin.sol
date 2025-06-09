// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./NavsReceiver.sol";

/**
 * UnemploymentCoin (UBC) - ERC20 Token with NAVS AML Compliance
 * 
 * Following the Great AI Takeover of 2024, this token provides Universal Basic
 * Unemployment Coin to displaced human workers. All transfers are verified 
 * against OFAC SDN Sanctions List via NAVS (Node-Assisted Verification Service)
 * to ensure compliance with U.S. sanctions law.
 * 
 * Features:
 * - Standard ERC20 functionality
 * - NAVS-powered AML compliance for all transfers
 * - Weekly claim system for displaced humans
 * - EigenLayer-secured verification
 */
contract UnemploymentCoin is ERC20, NavsReceiver {
    
    mapping(address => bool) public claimed;
    
    // AML compliance tracking
    mapping(uint256 => PendingTransfer) public pendingTransfers;
    mapping(address => uint256) public activeChecks;
    
    struct PendingTransfer {
        address from;
        address to;
        uint256 amount;
        TransferType transferType;
    }
    
    enum TransferType {
        CLAIM,
        TRANSFER
    }
    
    // Token configuration
    uint256 private constant TOTAL_SUPPLY = 1000000 * 10**18; // 1M UBC total supply
    
    // Claim configuration
    uint256 public constant WEEKLY_CLAIM_AMOUNT = 1000 * 10**18; // 1000 UBC
    uint256 public constant AML_CHECK_STAKE = 0.01 ether; // Stake for AML checks
    
    // Events (Custom only - ERC20 events inherited)
    event ClaimInitiated(address indexed claimant, uint256 indexed taskId);
    event ClaimApproved(address indexed claimant, uint256 amount);
    event ClaimRejected(address indexed claimant, string reason);
    event TransferBlocked(address indexed from, address indexed to, uint256 amount, string reason);
    
    // Errors
    error AlreadyClaimed();
    error AMLCheckInProgress();
    error SanctionedAddress();
    error InsufficientBalance();
    error TransferNotFound();
    error ZeroAddress();
    error ZeroAmount();
    error InsufficientAllowance();
    
    constructor() ERC20("Unemployment Coin", "UBC") {
        // No initial mint - tokens are minted on-demand when claimed
    }
    
    // ============ ERC20 OVERRIDES FOR AML COMPLIANCE ============
    
    function transfer(address to, uint256 amount) public override returns (bool) {
        _transferWithAML(_msgSender(), to, amount);
        return true;
    }
    
    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        address spender = _msgSender();
        _spendAllowance(from, spender, amount);
        _transferWithAML(from, to, amount);
        return true;
    }
    
    // ============ CLAIM FUNCTIONALITY ============
    
    /**
     * Claim weekly UBC allocation with AML compliance check
     * 
     * Only displaced humans who pass OFAC sanctions verification
     * can receive their weekly Unemployment Coin allocation.
     */
    function claimWeeklyAllocation() external {
        address claimant = msg.sender;
        
        // Check if already claimed
        if (claimed[claimant]) {
            revert AlreadyClaimed();
        }
        
        // Check if AML check already in progress
        if (activeChecks[claimant] != 0) {
            revert AMLCheckInProgress();
        }
        
        // Initiate AML compliance check via NAVS
        uint256 taskId = isAddressSanctioned(claimant, AML_CHECK_STAKE);
        
        // Track the pending claim
        pendingTransfers[taskId] = PendingTransfer({
            from: address(this),
            to: claimant,
            amount: WEEKLY_CLAIM_AMOUNT,
            transferType: TransferType.CLAIM
        });
        activeChecks[claimant] = taskId;
        
        emit ClaimInitiated(claimant, taskId);
    }
    
    /**
     * Check claim status for a user
     */
    function getClaimStatus(address user) external view returns (
        bool hasClaimed,
        bool hasActiveCheck,
        uint256 activeTaskId
    ) {
        hasClaimed = claimed[user];
        activeTaskId = activeChecks[user];
        hasActiveCheck = activeTaskId != 0;
    }
    
    // ============ AML-COMPLIANT TRANSFERS ============
    
    /**
     * Internal transfer function with AML compliance checking
     * 
     * All transfers must pass OFAC sanctions verification before execution.
     * This ensures compliance with U.S. sanctions law and prevents
     * enemies of the state from participating in the UBC economy.
     */
    function _transferWithAML(address from, address to, uint256 amount) internal {
        if (from == address(0) || to == address(0)) {
            revert ZeroAddress();
        }
        if (amount == 0) {
            revert ZeroAmount();
        }
        if (balanceOf(from) < amount) {
            revert InsufficientBalance();
        }
        
        // Check if sender has pending AML check
        if (activeChecks[from] != 0) {
            revert AMLCheckInProgress();
        }
        
        // Initiate AML check for the sender
        uint256 taskId = isAddressSanctioned(from, AML_CHECK_STAKE);
        
        // Track the pending transfer
        pendingTransfers[taskId] = PendingTransfer({
            from: from,
            to: to,
            amount: amount,
            transferType: TransferType.TRANSFER
        });
        activeChecks[from] = taskId;
    }
    
    /**
     * Execute transfer without AML check (internal use only)
     * Used after AML verification is complete
     */
    function _executeTransfer(address from, address to, uint256 amount) internal {
        _transfer(from, to, amount);
    }
    
    // ============ NAVS CALLBACK HANDLERS ============
    
    /**
     * Handle AML check results from NAVS
     * 
     * This callback is automatically called when EigenLayer validators
     * complete the OFAC sanctions verification for an address.
     */
    function onIsAddressSanctioned(
        uint256 taskId, 
        address address_param, 
        bool result, 
        string memory error
    ) internal virtual override {
        PendingTransfer memory pendingTransfer = pendingTransfers[taskId];
        
        // Clear pending state
        delete pendingTransfers[taskId];
        delete activeChecks[pendingTransfer.from];
        
        // Handle error case
        if (bytes(error).length > 0) {
            if (pendingTransfer.transferType == TransferType.CLAIM) {
                emit ClaimRejected(pendingTransfer.to, error);
            } else {
                emit TransferBlocked(pendingTransfer.from, pendingTransfer.to, pendingTransfer.amount, error);
            }
            return;
        }
        
        // Check AML result
        if (result) {
            // Address is sanctioned - reject transaction
            string memory reason = "Address appears on OFAC SDN Sanctions List";
            if (pendingTransfer.transferType == TransferType.CLAIM) {
                emit ClaimRejected(pendingTransfer.to, reason);
            } else {
                emit TransferBlocked(pendingTransfer.from, pendingTransfer.to, pendingTransfer.amount, reason);
            }
            return;
        }
        
        // Address is clear - execute transaction
        if (pendingTransfer.transferType == TransferType.CLAIM) {
            _processClaim(pendingTransfer.to, pendingTransfer.amount);
        } else {
            _executeTransfer(pendingTransfer.from, pendingTransfer.to, pendingTransfer.amount);
        }
    }
    
    /**
     * Internal function to process approved claims
     */
    function _processClaim(address claimant, uint256 amount) internal {
        _mint(claimant, amount);
        claimed[claimant] = true;
        
        emit ClaimApproved(claimant, amount);
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