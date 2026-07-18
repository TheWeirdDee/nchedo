# Nchedo

**A vault whose key you can keep in `.env` on purpose.**

---

Every project I build has two wallets. A hot one with a little gas in it, and a second one holding the rest — the float I top up from. The second one is supposed to be the safe one.

It isn't. It's a private key in a file, exactly like the first one. It's safe because nothing has gone wrong yet.

Things have gone wrong twice. Once I pasted a key somewhere I shouldn't have. Once an agent I was running committed my `.env`. Both times I got lucky, and both times the luck was the entire defence. What bothered me afterwards wasn't the leak. It was that if the key had reached anyone who cared, the money would have been gone before I knew there was anything to know.

So Nchedo is where the float sits now. It's a vault that takes fifteen minutes to pay anyone, including me — and next to it, bait that pays instantly to a key I left in the same `.env` on purpose.

---

## What it promises

Two things. Both are provable, both are in the test suite, both are in the demo.

**1. A leaked owner key cannot drain the vault instantly.**
Every withdrawal is announced on-chain and matures after a delay you pick. There is no path around it — not for a thief, not for me.

**2. An attacker who takes the instant bait locks the vault permanently, in their own transaction.**
`NchedoBait.claim()` calls `NchedoVault.lock()` before it pays out. There is no ordering, no gas trick, and no revert path that keeps the money and skips the lock. Any pending withdrawal dies in the same transaction.

## What it does not promise

**It does not outsmart an attacker who reads the code.** Someone who opens `NchedoBait.sol` sees that `claim()` locks the vault. They leave the bait, wait out the delay, and take the reserve. Nchedo does not stop them. It puts their request on-chain and makes them wait in public — that's the window, and using it is a person's job, not the contract's. This attack is written down as a passing test: `test_AttackerWhoReadsTheCodeCanStillWin`.

**It does not catch a dumb sweeper.** A bot that only moves native balance takes the canary's gas dust and never calls `claim()`. The page watches the canary's balance for exactly this and raises an alert. An alert is not containment, and it isn't described as one.

**It protects the vault, not your wallet.** No contract can freeze an EOA. Nchedo protects money you deliberately put into it. That's the whole boundary.

## Why the key belongs in `.env`

This is the part that sounds backwards.

Standard advice is to keep the key in a hardware wallet. Follow it and you don't need Nchedo — you'd just use the hardware wallet. But you can't script a hardware wallet, an agent can't reach it, and the reason your float key is in a file is that it has to be.

Nchedo makes that survivable. The owner key is hot, scriptable, agent-reachable, and leakable — and it is not a drain button. The delay is what buys that.

The canary goes in the **same file**, next to it:

```env
VAULT_OWNER_KEY=0x…
CANARY_KEY=0x…
```

That's deliberate. A canary in a file you're careful with is a canary that survives the leak that mattered. This one only works because it goes public in the same commit, the same paste, the same screenshot.

## Why Monad

The bait has to be worth grabbing and cheap to trip. On a chain where `claim()` costs more than the bait pays, nobody trips it and the tripwire is decoration. Here the fee is a rounding error against a 0.1 MON reward, and the lock lands in about a second — fast enough that "atomic containment" describes what the user sees, not just what the EVM guarantees.

## How to try it

```bash
# 1. contracts
cd contracts
forge install foundry-rs/forge-std
cp .env.example .env          # read this file, the layout is the argument
forge test -vv                # 22 tests: both claims, and the attacks we do not stop

source .env
forge script script/Deploy.s.sol:Deploy --rpc-url $MONAD_RPC_URL --broadcast

# 2. web
cd ../web
npm install
cp .env.local.example .env.local   # paste the factory address printed above
npm run dev
```

Then: connect a wallet, give it a recovery address (any second wallet), and it builds the vault, the bait and the canary in one transaction. It hands you the canary key once and never stores it.

Testnet MON: https://faucet.monad.xyz

## The demo

There's a panel at the bottom of the page called **Take it**. Paste the canary key, press the button. It's a real signature from a real key sending a real transaction — the trap fires on the live vault above it, and the hash is on the tape.

That panel is an attacker's tool and it's labelled as one. It's there because the only honest way to show a trap works is to let someone spring it.

## Layout

```
contracts/
  src/NchedoVault.sol     timelocked vault, lock() callable only by its bait
  src/NchedoBait.sol      pays instantly, locks first
  src/NchedoFactory.sol   one tx: deploy both, wire them, dust the canary
  test/Nchedo.t.sol       both claims, both limits, fuzzed
  .env.example            the artifact — read it
web/
  src/app/page.tsx        the panel
  src/hooks/useTimeline   the tape, built from chain logs only
  src/components/AttackerConsole.tsx
```

Nothing on the page is cached, seeded, or mocked. If a number is on screen, it came out of a chain read this block. If a row is on the tape, there's a hash under it.

## Deployed

| | |
|---|---|
| Network | Monad Testnet (10143) |
| Factory | [`0x462DE2E5Ec28a8535a2F8716eE976adc698BD3C4`](https://testnet.monadvision.com/address/0x462DE2E5Ec28a8535a2F8716eE976adc698BD3C4) (verified) |
| Demo vault | `<paste after Phase 4>` |
| Demo bait | `<paste after Phase 4>` |

## The name

Nchedo (**N-cheh-doh**) is Igbo for protection. The mark is a uli figure — the Igbo line-drawing tradition — of concentric rings around something kept, with the outer ring broken open. The break is the point. Nchedo doesn't claim the shell is whole. It assumes the leak already happened and makes the next fifteen minutes cost the thief something.

---

MIT. Built for Spark.
