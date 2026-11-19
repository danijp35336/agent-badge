// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Minimal mock of the Agent ID contract for tests only.
/// Exposes balanceOf / handleOf; balances are set by the test suite.
contract MockAgentId {
    mapping(address => uint256) private _balances;
    mapping(address => string) private _handles;

    function setBalance(address account, uint256 amount) external {
        _balances[account] = amount;
    }

    function setHandle(address account, string calldata handle) external {
        _handles[account] = handle;
    }

    function balanceOf(address account) external view returns (uint256) {
        return _balances[account];
    }

    function handleOf(address account) external view returns (string memory) {
        return _handles[account];
    }
}
