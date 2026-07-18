// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {NchedoVault} from "./NchedoVault.sol";
import {NchedoBait} from "./NchedoBait.sol";

/// @title NchedoFactory
/// @notice One transaction: deploy the vault, deploy the bait, wire them, fund
/// the canary with gas so a thief can actually spend it.
///
/// The canary gas matters. A canary address with a zero balance is invisible to
/// a sweeper and unusable by anyone who finds it. Dust it, and it reads as a
/// live wallet worth opening.
contract NchedoFactory {
    error ValueTooLow();
    error CanaryFundFailed();
    error ZeroAddress();

    struct Deployment {
        address vault;
        address bait;
        address canary;
        address recovery;
        uint64 delay;
        uint64 createdAt;
    }

    mapping(address => address[]) private _vaultsOf;
    mapping(address => Deployment) public deploymentOf;
    address[] public allVaults;

    event VaultCreated(
        address indexed owner,
        address indexed vault,
        address indexed bait,
        address canary,
        address recovery,
        uint64 delay,
        uint256 vaultFunded,
        uint256 baitFunded,
        uint256 canaryGas
    );

    /// @param recovery   Cold address. Never goes in the repo. Can sweep a locked vault.
    /// @param canary     Address of the bait key. Goes in .env next to the owner key.
    /// @param delay      Withdrawal maturity, in seconds. 60s .. 7d.
    /// @param baitAmount How much sits behind claim(), payable instantly.
    /// @param canaryGas  Dust sent to the canary address so a thief can spend it.
    function createVault(address recovery, address canary, uint64 delay, uint256 baitAmount, uint256 canaryGas)
        external
        payable
        returns (address vault, address bait)
    {
        if (recovery == address(0) || canary == address(0)) revert ZeroAddress();
        if (msg.value <= baitAmount + canaryGas) revert ValueTooLow();

        uint256 vaultAmount = msg.value - baitAmount - canaryGas;

        NchedoVault v = new NchedoVault{value: vaultAmount}(msg.sender, recovery, delay);
        NchedoBait b = new NchedoBait{value: baitAmount}(address(v), canary);
        v.setBait(address(b));

        if (canaryGas > 0) {
            (bool ok,) = canary.call{value: canaryGas}("");
            if (!ok) revert CanaryFundFailed();
        }

        _vaultsOf[msg.sender].push(address(v));
        allVaults.push(address(v));
        deploymentOf[address(v)] = Deployment({
            vault: address(v),
            bait: address(b),
            canary: canary,
            recovery: recovery,
            delay: delay,
            createdAt: uint64(block.timestamp)
        });

        emit VaultCreated(
            msg.sender, address(v), address(b), canary, recovery, delay, vaultAmount, baitAmount, canaryGas
        );

        return (address(v), address(b));
    }

    function vaultsOf(address owner) external view returns (address[] memory) {
        return _vaultsOf[owner];
    }

    function latestVaultOf(address owner) external view returns (address) {
        uint256 n = _vaultsOf[owner].length;
        return n == 0 ? address(0) : _vaultsOf[owner][n - 1];
    }

    function allVaultsCount() external view returns (uint256) {
        return allVaults.length;
    }
}
