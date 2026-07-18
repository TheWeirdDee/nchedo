// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {NchedoVault} from "../src/NchedoVault.sol";
import {NchedoBait} from "../src/NchedoBait.sol";
import {NchedoFactory} from "../src/NchedoFactory.sol";

/// Nchedo makes exactly two promises. Every test below is one of them, or the
/// scaffolding needed to state one of them honestly.
///
///   CLAIM 1  A leaked owner key cannot drain the vault instantly.
///   CLAIM 2  An attacker who takes the instant bait locks the vault
///            permanently, in their own transaction.
///
/// It makes no third promise. testAttackerWhoReadsTheCodeCanStillWin is here on
/// purpose: it is the attack we do not stop, written down, passing.
contract NchedoTest is Test {
    NchedoFactory factory;
    NchedoVault vault;
    NchedoBait bait;

    // The owner key lives in .env. That is the design, not the bug.
    uint256 constant OWNER_PK = 0xA11CE;
    // The canary lives in the same .env, so it leaks in the same commit.
    uint256 constant CANARY_PK = 0xBA17;
    // The recovery key never goes near the repo.
    uint256 constant RECOVERY_PK = 0xC01D;

    address owner = vm.addr(OWNER_PK);
    address canary = vm.addr(CANARY_PK);
    address recovery = vm.addr(RECOVERY_PK);
    address thief = makeAddr("thief");
    address safeHouse = makeAddr("safeHouse");

    uint64 constant DELAY = 15 minutes;
    uint256 constant VAULT_AMOUNT = 5 ether;
    uint256 constant BAIT_AMOUNT = 0.5 ether;
    uint256 constant CANARY_GAS = 0.02 ether;

    function setUp() public {
        factory = new NchedoFactory();
        vm.deal(owner, 10 ether);

        vm.prank(owner);
        (address v, address b) = factory.createVault{value: VAULT_AMOUNT + BAIT_AMOUNT + CANARY_GAS}(
            recovery, canary, DELAY, BAIT_AMOUNT, CANARY_GAS
        );

        vault = NchedoVault(payable(v));
        bait = NchedoBait(payable(b));
    }

    // --- wiring -------------------------------------------------------------

    function test_FactoryWiresEverythingInOneTransaction() public view {
        assertEq(vault.owner(), owner);
        assertEq(vault.recovery(), recovery);
        assertEq(vault.delay(), DELAY);
        assertEq(vault.bait(), address(bait));
        assertEq(address(bait.vault()), address(vault));
        assertEq(bait.canary(), canary);

        assertEq(address(vault).balance, VAULT_AMOUNT);
        assertEq(address(bait).balance, BAIT_AMOUNT);
        // Dusted so a sweeper sees a live wallet and a thief can pay for gas.
        assertEq(canary.balance, CANARY_GAS);
    }

    function test_BaitCannotBeRepointed() public {
        vm.expectRevert(NchedoVault.NotDeployer.selector);
        vm.prank(thief);
        vault.setBait(thief);
    }

    // --- CLAIM 1 ------------------------------------------------------------

    /// A leaked owner key cannot drain the vault instantly.
    function test_Claim1_LeakedOwnerKeyCannotDrainInstantly() public {
        // The thief has the owner key. Full authority. No restrictions.
        vm.startPrank(owner);
        vault.requestWithdrawal(thief, VAULT_AMOUNT);

        vm.expectRevert(NchedoVault.NotMatured.selector);
        vault.executeWithdrawal();

        skip(DELAY - 1);
        vm.expectRevert(NchedoVault.NotMatured.selector);
        vault.executeWithdrawal();
        vm.stopPrank();

        // Money still home. The whole promise is the fifteen minutes.
        assertEq(address(vault).balance, VAULT_AMOUNT);
        assertEq(thief.balance, 0);
    }

    function test_Claim1_TheRequestIsAnnouncedOnChain() public {
        vm.expectEmit(true, false, false, true, address(vault));
        emit NchedoVault.WithdrawalRequested(thief, VAULT_AMOUNT, uint64(block.timestamp) + DELAY);

        vm.prank(owner);
        vault.requestWithdrawal(thief, VAULT_AMOUNT);
    }

    function test_HonestWithdrawalWorksAfterTheDelay() public {
        vm.startPrank(owner);
        vault.requestWithdrawal(owner, 1 ether);
        skip(DELAY);
        vault.executeWithdrawal();
        vm.stopPrank();

        assertEq(address(vault).balance, VAULT_AMOUNT - 1 ether);
    }

    function test_OnlyOwnerCanRequest() public {
        vm.expectRevert(NchedoVault.NotOwner.selector);
        vm.prank(thief);
        vault.requestWithdrawal(thief, 1 ether);
    }

    function test_OneWithdrawalAtATime() public {
        vm.startPrank(owner);
        vault.requestWithdrawal(owner, 1 ether);
        vm.expectRevert(NchedoVault.WithdrawalAlreadyPending.selector);
        vault.requestWithdrawal(owner, 1 ether);
        vm.stopPrank();
    }

    // --- CLAIM 2 ------------------------------------------------------------

    /// An attacker who takes the instant bait locks the vault, in their own tx.
    function test_Claim2_ClaimingTheBaitLocksTheVaultAtomically() public {
        assertEq(uint8(vault.state()), uint8(NchedoVault.State.Active));

        vm.prank(canary);
        bait.claim();

        assertEq(uint8(vault.state()), uint8(NchedoVault.State.Locked));
        // They did get paid. That is not a bug — it is the price of the alarm.
        assertEq(canary.balance, CANARY_GAS + BAIT_AMOUNT);
    }

    /// The scene the demo plays: withdrawal counting down, thief takes the fast
    /// money, the pending 5 MON dies mid-flight.
    function test_Claim2_ClaimCancelsThePendingWithdrawal() public {
        vm.prank(owner);
        vault.requestWithdrawal(thief, VAULT_AMOUNT);

        skip(DELAY / 2);

        vm.expectEmit(true, false, false, true, address(vault));
        emit NchedoVault.WithdrawalCancelled(thief, VAULT_AMOUNT, "vault locked");

        vm.prank(canary);
        bait.claim();

        (,, address to, uint256 amount,,) = vault.snapshot();
        assertEq(to, address(0));
        assertEq(amount, 0);

        // Wait out the original delay. There is nothing left to execute.
        skip(DELAY);
        vm.expectRevert(NchedoVault.VaultIsLocked.selector);
        vm.prank(owner);
        vault.executeWithdrawal();

        assertEq(address(vault).balance, VAULT_AMOUNT);
        assertEq(thief.balance, 0);
    }

    function test_Claim2_LockedVaultRejectsEverythingFromTheOwnerKey() public {
        vm.prank(canary);
        bait.claim();

        vm.startPrank(owner);
        vm.expectRevert(NchedoVault.VaultIsLocked.selector);
        vault.requestWithdrawal(owner, 1 ether);

        vm.expectRevert(NchedoVault.VaultIsLocked.selector);
        vault.executeWithdrawal();
        vm.stopPrank();
    }

    /// The lock is not a policy the payout obeys. It is in the payout's path.
    function test_Claim2_NoOrderingLetsThemKeepTheMoneyAndSkipTheLock() public {
        vm.prank(canary);
        bait.claim();

        assertTrue(bait.claimed());
        assertEq(uint8(vault.state()), uint8(NchedoVault.State.Locked));

        vm.expectRevert(NchedoBait.AlreadyClaimed.selector);
        vm.prank(canary);
        bait.claim();
    }

    /// Zero false positives, structurally. Not tuned — nobody else can sign.
    function test_Claim2_OnlyTheCanaryCanTripIt() public {
        vm.expectRevert(NchedoBait.NotCanary.selector);
        vm.prank(thief);
        bait.claim();

        vm.expectRevert(NchedoBait.NotCanary.selector);
        vm.prank(owner);
        bait.claim();

        assertEq(uint8(vault.state()), uint8(NchedoVault.State.Active));
    }

    // --- what we do NOT promise ---------------------------------------------

    /// Written down so nobody has to catch us with it.
    ///
    /// A thief who reads NchedoBait.sol sees that claim() locks the vault. They
    /// leave the 0.5 MON, wait out the fifteen minutes, and take the 5 MON. The
    /// canary never fires. Nchedo does not stop this attacker.
    ///
    /// What it does to them: it puts WithdrawalRequested on-chain and makes them
    /// wait fifteen minutes in public. That is the window. Using it is a person's
    /// job, not the contract's.
    function test_AttackerWhoReadsTheCodeCanStillWin() public {
        vm.startPrank(owner); // thief holding the leaked key
        vault.requestWithdrawal(thief, VAULT_AMOUNT);
        skip(DELAY);
        vault.executeWithdrawal();
        vm.stopPrank();

        assertEq(thief.balance, VAULT_AMOUNT);
        assertEq(uint8(vault.state()), uint8(NchedoVault.State.Active));
    }

    /// And this is what the window is for.
    function test_TheWindowIsUsableIfSomeoneIsWatching() public {
        vm.prank(owner);
        vault.requestWithdrawal(thief, VAULT_AMOUNT);

        skip(DELAY / 3); // owner sees WithdrawalRequested, knows it wasn't them

        vm.prank(recovery);
        vault.recoverTo(safeHouse);

        assertEq(safeHouse.balance, VAULT_AMOUNT);
        assertEq(address(vault).balance, 0);
        assertEq(uint8(vault.state()), uint8(NchedoVault.State.Locked));
    }

    /// A sweeper that only moves native balance takes the canary's gas dust and
    /// never calls claim(). The tripwire does not fire. The page watches the
    /// canary balance for exactly this, and it is an alert, not containment.
    function test_DumbSweeperTakesTheDustAndDoesNotTripIt() public {
        vm.prank(canary);
        (bool ok,) = thief.call{value: canary.balance}("");
        assertTrue(ok);

        assertEq(canary.balance, 0);
        assertFalse(bait.claimed());
        assertEq(uint8(vault.state()), uint8(NchedoVault.State.Active));
    }

    // --- recovery -----------------------------------------------------------

    function test_RecoveryCanSweepALockedVault() public {
        vm.prank(canary);
        bait.claim();

        vm.prank(recovery);
        vault.recoverTo(safeHouse);

        assertEq(safeHouse.balance, VAULT_AMOUNT);
        assertEq(address(vault).balance, 0);
    }

    function test_OwnerKeyCannotRecover() public {
        vm.prank(canary);
        bait.claim();

        vm.expectRevert(NchedoVault.NotRecovery.selector);
        vm.prank(owner);
        vault.recoverTo(owner);
    }

    function test_OwnerKeyCannotUnlock() public {
        vm.prank(canary);
        bait.claim();

        vm.expectRevert(NchedoVault.NotRecovery.selector);
        vm.prank(owner);
        vault.unlock();

        vm.prank(recovery);
        vault.unlock();
        assertEq(uint8(vault.state()), uint8(NchedoVault.State.Active));
    }

    function test_RecoveryCanLockOnSuspicionAlone() public {
        vm.prank(recovery);
        vault.lockByRecovery();
        assertEq(uint8(vault.state()), uint8(NchedoVault.State.Locked));
    }

    function test_DepositsStillWork() public {
        vm.deal(thief, 1 ether);
        vm.prank(thief);
        (bool ok,) = address(vault).call{value: 1 ether}("");
        assertTrue(ok);
        assertEq(address(vault).balance, VAULT_AMOUNT + 1 ether);
    }

    // --- fuzz ---------------------------------------------------------------

    function testFuzz_NoAmountEscapesBeforeMaturity(uint256 amount, uint64 wait) public {
        amount = bound(amount, 1, VAULT_AMOUNT);
        wait = uint64(bound(wait, 0, DELAY - 1));

        vm.startPrank(owner);
        vault.requestWithdrawal(thief, amount);
        skip(wait);
        vm.expectRevert(NchedoVault.NotMatured.selector);
        vault.executeWithdrawal();
        vm.stopPrank();

        assertEq(address(vault).balance, VAULT_AMOUNT);
    }

    function testFuzz_ClaimAlwaysLocksNoMatterWhen(uint64 wait) public {
        wait = uint64(bound(wait, 0, 30 days));
        skip(wait);

        vm.prank(canary);
        bait.claim();
        assertEq(uint8(vault.state()), uint8(NchedoVault.State.Locked));
    }
}
