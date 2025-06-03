// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./NavsReceiver.sol";

/**
 * AMLTestContract - Demonstrates AML compliance checking with NAVS
 * 
 * This contract shows how to use the NavsAml library for:
 * - Single address sanctions checking
 */
contract AMLTestContract is NavsReceiver {
    
    // Events for demonstrating AML results
    event AddressSanctionResult(bytes32 indexed taskId, address checkedAddress, bool isSanctioned);
    
    /**
     * Check if a single address is sanctioned
     */
    function checkAddressSanction(address addr) external returns (bytes32 taskId) {
        return NavsAml.isAddressSanctioned(addr, 0.1 ether);
    }
    
    // Internal virtual callback overrides
    
    /**
     * Handle single address sanction check results
     */
    function _onIsAddressSanctioned(
        bytes32 taskId, 
        address address_param, 
        bool result, 
        string memory error
    ) internal virtual override {
        if (bytes(error).length > 0) {
            // Handle error case
            return;
        }
        
        emit AddressSanctionResult(taskId, address_param, result);
        
        // Take appropriate action based on result
        if (result) {
            // Address is sanctioned - implement your compliance logic
            // e.g., block transactions, flag for review, etc.
        }
    }
    
}