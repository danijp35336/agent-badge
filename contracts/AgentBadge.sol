// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/// @notice Minimal interface of the SPACE ID Agent ID contract (ERC-721, soulbound).
/// Only the functions AgentBadge actually uses are declared.
interface IAgentId {
    function balanceOf(address account) external view returns (uint256);
    function handleOf(address account) external view returns (string memory);
}

/// @title AgentBadge
/// @notice A free, soulbound on-chain badge + daily check-in streak for Agent ID holders.
/// @dev One badge per Agent ID holder (one per wallet). No owner, no admin functions,
///      no fees, no minting by anyone except the holder themself, no upgradeability.
///      Transfers are blocked (soulbound) except minting.
///      Days are UTC days: `block.timestamp / 1 days`.
contract AgentBadge is ERC721 {
    /// @notice The Agent ID contract (SPACE ID, BNB Chain). Immutable, set once.
    IAgentId public immutable agentId;

    uint256 private _nextTokenId = 1;

    /// @notice tokenId owned by a holder (0 = none).
    mapping(address => uint256) public tokenIdOf;
    /// @notice Current consecutive-day check-in streak.
    mapping(address => uint256) public streakOf;
    /// @notice UTC day number of the holder's last check-in (0 = never).
    mapping(address => uint256) public lastCheckInDay;

    event BadgeClaimed(address indexed holder, uint256 indexed tokenId);
    event CheckedIn(address indexed holder, uint256 streak, uint256 day);

    /// @param agentIdAddress The Agent ID contract address.
    ///        BNB Chain mainnet: 0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F
    constructor(address agentIdAddress) ERC721("AgentBadge", "ABADGE") {
        require(agentIdAddress != address(0), "AgentBadge: zero Agent ID address");
        agentId = IAgentId(agentIdAddress);
    }

    /// @notice Claim your one free badge. Caller must hold at least one Agent ID.
    function claimBadge() external {
        require(agentId.balanceOf(msg.sender) > 0, "AgentBadge: not an Agent ID holder");
        require(tokenIdOf[msg.sender] == 0, "AgentBadge: badge already claimed");
        uint256 tokenId = _nextTokenId++;
        tokenIdOf[msg.sender] = tokenId;
        _safeMint(msg.sender, tokenId);
        emit BadgeClaimed(msg.sender, tokenId);
    }

    /// @notice Check in once per UTC day. Consecutive days increment the streak;
    ///         a missed day resets it to 1.
    function checkIn() external {
        require(tokenIdOf[msg.sender] != 0, "AgentBadge: no badge claimed");
        uint256 day = block.timestamp / 1 days;
        require(lastCheckInDay[msg.sender] != day, "AgentBadge: already checked in today");
        if (lastCheckInDay[msg.sender] == day - 1) {
            streakOf[msg.sender] += 1;
        } else {
            streakOf[msg.sender] = 1;
        }
        lastCheckInDay[msg.sender] = day;
        emit CheckedIn(msg.sender, streakOf[msg.sender], day);
    }

    /// @notice True if the address holds an AgentBadge.
    function hasBadge(address account) external view returns (bool) {
        return tokenIdOf[account] != 0;
    }

    /// @notice Tier for a streak: Bronze < 7, Silver 7-29, Gold 30+.
    function tierOf(address account) external view returns (string memory) {
        uint256 streak = streakOf[account];
        if (streak >= 30) return "Gold";
        if (streak >= 7) return "Silver";
        return "Bronze";
    }

    /// @notice Soulbound: block every transfer. Only minting (from == address(0)) is allowed.
    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address)
    {
        address from = _ownerOf(tokenId);
        require(from == address(0), "AgentBadge: soulbound, transfers disabled");
        return super._update(to, tokenId, auth);
    }
}
