// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface INchedoVault {
    function lock() external;
}

/// @title NchedoBait
/// @notice Holds a small reward that only the canary key can take, and locks
/// the vault in the same transaction it pays out.
///
/// The canary key lives in the same .env as the vault owner key. That is the
/// whole point: it only works if the two leak together. Anyone reading a leaked
/// .env sees two keys — one that can move 5 MON in fifteen minutes, and one that
/// can move 0.5 MON right now. Taking the fast one is not a mistake an attacker
/// has to make. It is just the option that pays first.
///
/// No legitimate process ever signs with the canary key. A claim is not a
/// heuristic, a score, or an anomaly. It is proof.
contract NchedoBait {
    error NotCanary();
    error AlreadyClaimed();
    error TransferFailed();
    error ZeroAddress();

    INchedoVault public immutable vault;
    address public immutable canary;

    bool public claimed;
    address public claimedBy;
    uint64 public claimedAt;

    event Baited(address indexed from, uint256 amount, uint256 balance);
    event BaitClaimed(address indexed by, uint256 amount, uint64 at);

    constructor(address _vault, address _canary) payable {
        if (_vault == address(0) || _canary == address(0)) revert ZeroAddress();
        vault = INchedoVault(_vault);
        canary = _canary;
        if (msg.value > 0) emit Baited(msg.sender, msg.value, msg.value);
    }

    /// @notice Take the money. You cannot take it without pulling the alarm.
    function claim() external {
        if (msg.sender != canary) revert NotCanary();
        if (claimed) revert AlreadyClaimed();

        claimed = true;
        claimedBy = msg.sender;
        claimedAt = uint64(block.timestamp);

        // Lock first. There is no ordering, no revert path, and no gas trick
        // that lets the caller keep the payout and skip this line.
        vault.lock();

        uint256 amount = address(this).balance;
        (bool ok,) = msg.sender.call{value: amount}("");
        if (!ok) revert TransferFailed();

        emit BaitClaimed(msg.sender, amount, uint64(block.timestamp));
    }

    receive() external payable {
        emit Baited(msg.sender, msg.value, address(this).balance);
    }

    // --- views --------------------------------------------------------------

    function reward() external view returns (uint256) {
        return claimed ? 0 : address(this).balance;
    }

    function snapshot()
        external
        view
        returns (address _vault, address _canary, bool _claimed, address _by, uint64 _at, uint256 _reward)
    {
        return (address(vault), canary, claimed, claimedBy, claimedAt, claimed ? 0 : address(this).balance);
    }
}
