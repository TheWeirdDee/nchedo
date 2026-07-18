// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title NchedoVault
/// @notice A vault whose owner key is meant to live in .env.
///
/// Two properties, both provable:
///   1. A leaked owner key cannot drain this vault instantly. Every withdrawal
///      is announced on-chain and matures after `delay`.
///   2. Any attacker who takes the instant bait locks this vault permanently,
///      in their own transaction. See NchedoBait.claim().
///
/// The owner key is hot on purpose. If it belonged in a hardware wallet you
/// would not need this contract. It exists so a scriptable, agent-reachable,
/// leakable key can move cold money without being a drain button.
///
/// The recovery key never touches the repo. It is the only key that can sweep
/// a locked vault to safety.
contract NchedoVault {
    enum State {
        Active,
        Locked
    }

    struct Pending {
        address to;
        uint256 amount;
        uint64 maturesAt;
    }

    error NotOwner();
    error NotRecovery();
    error NotBait();
    error NotDeployer();
    error BaitAlreadySet();
    error VaultIsLocked();
    error VaultNotLocked();
    error NothingPending();
    error WithdrawalAlreadyPending();
    error NotMatured();
    error InsufficientBalance();
    error TransferFailed();
    error BadDelay();
    error ZeroAddress();

    uint64 public constant MIN_DELAY = 60;
    uint64 public constant MAX_DELAY = 7 days;

    address public immutable owner;
    address public immutable recovery;
    address private immutable deployer;
    uint64 public immutable delay;
    uint64 public immutable createdAt;

    address public bait;
    State public state;
    Pending public pending;

    event Deposited(address indexed from, uint256 amount, uint256 balance);
    event WithdrawalRequested(address indexed to, uint256 amount, uint64 maturesAt);
    event WithdrawalExecuted(address indexed to, uint256 amount);
    event WithdrawalCancelled(address indexed to, uint256 amount, string reason);
    event VaultLocked(address indexed by, uint64 at);
    event VaultUnlocked(address indexed by, uint64 at);
    event Recovered(address indexed to, uint256 amount);
    event BaitSet(address indexed bait);

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyRecovery() {
        if (msg.sender != recovery) revert NotRecovery();
        _;
    }

    constructor(address _owner, address _recovery, uint64 _delay) payable {
        if (_owner == address(0) || _recovery == address(0)) revert ZeroAddress();
        if (_delay < MIN_DELAY || _delay > MAX_DELAY) revert BadDelay();
        owner = _owner;
        recovery = _recovery;
        deployer = msg.sender;
        delay = _delay;
        createdAt = uint64(block.timestamp);
        if (msg.value > 0) emit Deposited(msg.sender, msg.value, msg.value);
    }

    // --- wiring -------------------------------------------------------------

    /// @notice One-time, deployer-only. Prevents anyone pointing this vault at
    /// a bait contract they control (which would be a free lock button).
    function setBait(address _bait) external {
        if (msg.sender != deployer) revert NotDeployer();
        if (bait != address(0)) revert BaitAlreadySet();
        if (_bait == address(0)) revert ZeroAddress();
        bait = _bait;
        emit BaitSet(_bait);
    }

    // --- money in -----------------------------------------------------------

    function deposit() external payable {
        emit Deposited(msg.sender, msg.value, address(this).balance);
    }

    receive() external payable {
        emit Deposited(msg.sender, msg.value, address(this).balance);
    }

    // --- money out (slow on purpose) ---------------------------------------

    function requestWithdrawal(address to, uint256 amount) external onlyOwner {
        if (state == State.Locked) revert VaultIsLocked();
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0 || amount > address(this).balance) revert InsufficientBalance();
        if (pending.amount != 0) revert WithdrawalAlreadyPending();

        uint64 maturesAt = uint64(block.timestamp) + delay;
        pending = Pending({to: to, amount: amount, maturesAt: maturesAt});
        emit WithdrawalRequested(to, amount, maturesAt);
    }

    function executeWithdrawal() external onlyOwner {
        if (state == State.Locked) revert VaultIsLocked();

        Pending memory p = pending;
        if (p.amount == 0) revert NothingPending();
        if (block.timestamp < p.maturesAt) revert NotMatured();
        if (p.amount > address(this).balance) revert InsufficientBalance();

        delete pending;
        (bool ok,) = p.to.call{value: p.amount}("");
        if (!ok) revert TransferFailed();
        emit WithdrawalExecuted(p.to, p.amount);
    }

    function cancelWithdrawal() external {
        if (msg.sender != owner && msg.sender != recovery) revert NotOwner();
        Pending memory p = pending;
        if (p.amount == 0) revert NothingPending();
        delete pending;
        emit WithdrawalCancelled(p.to, p.amount, "cancelled");
    }

    // --- containment --------------------------------------------------------

    /// @notice Called by NchedoBait inside the attacker's own claim transaction.
    function lock() external {
        if (msg.sender != bait) revert NotBait();
        _lock(msg.sender);
    }

    function lockByRecovery() external onlyRecovery {
        _lock(msg.sender);
    }

    function unlock() external onlyRecovery {
        if (state != State.Locked) revert VaultNotLocked();
        state = State.Active;
        emit VaultUnlocked(msg.sender, uint64(block.timestamp));
    }

    /// @notice The real escape hatch. Once the owner key is public, unlocking is
    /// pointless — the attacker just requests again. Move the money instead.
    function recoverTo(address to) external onlyRecovery {
        if (to == address(0)) revert ZeroAddress();
        if (state != State.Locked) _lock(msg.sender);

        uint256 amount = address(this).balance;
        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit Recovered(to, amount);
    }

    function _lock(address by) internal {
        state = State.Locked;
        Pending memory p = pending;
        if (p.amount != 0) {
            delete pending;
            emit WithdrawalCancelled(p.to, p.amount, "vault locked");
        }
        emit VaultLocked(by, uint64(block.timestamp));
    }

    // --- views --------------------------------------------------------------

    function balance() external view returns (uint256) {
        return address(this).balance;
    }

    function secondsUntilMature() external view returns (uint64) {
        if (pending.amount == 0) return 0;
        if (block.timestamp >= pending.maturesAt) return 0;
        return pending.maturesAt - uint64(block.timestamp);
    }

    function snapshot()
        external
        view
        returns (
            State _state,
            uint256 _balance,
            address _pendingTo,
            uint256 _pendingAmount,
            uint64 _maturesAt,
            uint64 _now
        )
    {
        return (
            state,
            address(this).balance,
            pending.to,
            pending.amount,
            pending.maturesAt,
            uint64(block.timestamp)
        );
    }
}
