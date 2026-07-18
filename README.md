# Nchedo

**Nchedo** (Igbo: *Nchèdọ*, pronounced roughly "N-cheh-doh") means **protection**.

The name is honest about the design. Nchedo does not pretend a private key can never leak. It assumes the leak may already have happened, and adds a layer that delays loss, exposes the theft, and locks the protected funds the moment the tripwire fires.

**A leaked deployment key should not mean instant loss of deployment funds.**

Nchedo is a timelocked deployment vault with an on-chain canary. It gives hot, scriptable keys a containment layer instead of assuming they will never leak.

---

While building Web3 projects I made two security mistakes. Once I pasted a private key somewhere I shouldn't have. Another time an AI coding agent committed my `.env`. Both times I got lucky — and the luck was the entire defence. That made me realise my deployment float depended more on luck than design. Nchedo is where the float sits now: a vault that takes fifteen minutes to pay anyone, including me, next to bait that pays instantly to a key I leave in `.env` on purpose.

## What it promises

Two things. Both are provable, both are in the test suite, both are in the demo.

**1. A leaked owner key cannot drain the vault instantly.**
Every withdrawal is announced on-chain and matures after a delay you pick. There is no path around it — not for a thief, not for me.

**2. An attacker who takes the instant bait locks the vault permanently, in their own transaction.**
`NchedoBait.claim()` calls `NchedoVault.lock()` before it pays out. There is no ordering, no gas trick, and no revert path that keeps the money and skips the lock. Any pending withdrawal dies in the same transaction.

## How it works

```
  Owner key (hot, in .env)        Canary key (bait, same .env)
           │                                  │
           │ requestWithdrawal()              │ claim() — pays instantly
           ▼                                  │
     NchedoVault ◄──────── lock() ────── NchedoBait
     pays after a public delay,      the lock fires inside the
     always, for everyone            thief's own transaction
```

One factory transaction deploys the vault and the bait, wires them together, and dusts the canary with gas so a thief can afford to spend it.

## Why this isn't just another secret scanner

Secret scanners tell you a credential leaked. Nchedo changes what that credential can do after it leaks. Detection is off-chain advice; enforcement here is on-chain — the delay is consensus, and the lock is part of the thief's own transaction.

## Why the key belongs in `.env`

Some keys have to stay hot because automation requires them. You can't script a hardware wallet, an agent can't reach it, and the reason your float key is in a file is that it has to be. Nchedo makes that survivable: the owner key stays hot, scriptable, agent-reachable, and leakable — and it is not a drain button. The delay is what buys that.

The canary goes in the **same file**, next to it:

```env
VAULT_OWNER_KEY=0x…
CANARY_KEY=0x…
```

That's deliberate. A canary in a file you're careful with is a canary that survives the leak that mattered. This one only works because it goes public in the same commit, the same paste, the same screenshot.

## Why Monad

Nchedo is built around frequent, inexpensive on-chain interactions. The bait has to be cheap enough that taking it isn't irrational, and the lock has to land fast enough that containment feels immediate. Monad's low-cost, low-latency execution makes both practical: the fee is a rounding error against a 0.1 MON reward, and the lock lands in about a second — "atomic containment" describes what the user sees, not just what the EVM guarantees.

## What it does not promise

**It does not outsmart an attacker who reads the code.** Someone who opens `NchedoBait.sol` sees that `claim()` locks the vault. They leave the bait, wait out the delay, and take the reserve. Nchedo does not stop them. It puts their request on-chain and makes them wait in public — that's the window, and using it is a person's job, not the contract's. This attack is written down as a passing test: `test_AttackerWhoReadsTheCodeCanStillWin`.

**It does not catch a dumb sweeper.** A bot that only moves native balance takes the canary's gas dust and never calls `claim()`. The page watches the canary's balance for exactly this and raises an alert. An alert is not containment, and it isn't described as one.

**It protects the vault, not your wallet.** No contract can freeze an EOA. Nchedo protects money you deliberately put into it. That's the whole boundary.

<!--
## Screenshots

Capture these five from the running app, save under docs/screens/, then uncomment:

![Landing page](docs/screens/landing.png)
![Vault panel with live countdown](docs/screens/panel.png)
![The tape — chain-log timeline](docs/screens/tape.png)
![Attacker console](docs/screens/attacker.png)
![Locked state after the bait is taken](docs/screens/locked.png)
-->

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

There's a panel on the page called **Take it**. Paste the canary key, press the button. It's a real signature from a real key sending a real transaction — the trap fires on the live vault above it, and the hash is on the tape.

That panel is an attacker's tool and it's labelled as one. It's there because the only honest way to show a trap works is to let someone spring it.

Nothing on the page is cached, seeded, or mocked. If a number is on screen, it came out of a chain read this block. If a row is on the tape, there's a hash under it.

## Deployed

| | |
|---|---|
| Network | Monad Testnet (10143) |
| Factory | [`0x462DE2E5Ec28a8535a2F8716eE976adc698BD3C4`](https://testnet.monadvision.com/address/0x462DE2E5Ec28a8535a2F8716eE976adc698BD3C4) (verified) |
| Demo vault | [`0xB87Da78f5FCC94BeEF0042997D4B7689032F9dE0`](https://testnet.monadvision.com/address/0xB87Da78f5FCC94BeEF0042997D4B7689032F9dE0) |
| Demo bait | [`0x6734c260d14DF4823FCA97c4624155959d6cC2DB`](https://testnet.monadvision.com/address/0x6734c260d14DF4823FCA97c4624155959d6cC2DB) |

## Name and identity

The mark is a uli figure — the Igbo line-drawing tradition of thin curvilinear forms — concentric rings around something kept, with the outer ring broken open. The break is the point. Nchedo doesn't claim the shell is whole. It assumes the leak already happened and makes the next fifteen minutes cost the thief something.

---

MIT. Built for Spark — solving a problem I actually had while building Web3 applications.
