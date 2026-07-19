"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Lenis from "lenis";
import { useAccount, useConnect } from "wagmi";
import { Mark } from "@/components/Mark";
import { monad, EXPLORER, addressUrl, REPO_URL } from "@/lib/chain";
import { short, FACTORY_ADDRESS } from "@/lib/format";

/**
 * Landing only — the pitch is the product here. The dashboard lives at /panel
 * and nothing on this page polls chain logs. The visual language is the app's
 * own: enamel, bone plates, brass hardware, and the tape.
 */
export default function LandingPage() {
  const { isConnected } = useAccount();
  const { connect, connectors } = useConnect();

  // Inertia scrolling for the long pitch. Reduced motion keeps native scroll.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ autoRaf: true, anchors: true, lerp: 0.12 });
    return () => lenis.destroy();
  }, []);

  const handleConnect = () => {
    const conn = connectors[0];
    if (!conn) {
      alert("No wallet connector found. Please install MetaMask and try again.");
      return;
    }
    connect({ connector: conn });
  };

  const primary = isConnected ? (
    <Link href="/create" className="btn btn-brass !px-8 !py-3">
      Build a vault
    </Link>
  ) : (
    <button className="btn btn-brass !px-8 !py-3" onClick={handleConnect}>
      Connect wallet
    </button>
  );

  return (
    <main className="min-h-dvh flex flex-col">
      {/* ---- nav ---- */}
      <header className="sticky top-0 z-40 border-b border-brass/25 bg-enamel-lo/95">
        <div className="mx-auto max-w-6xl px-5 sm:px-8 h-14 flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Mark size={24} />
            <span className="font-[family-name:var(--font-display)] text-lg font-extrabold tracking-tight">
              Nchedo
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-5 ml-2">
            <a href="#problem" className="eyebrow hover:!text-brass-hi transition-colors">
              The problem
            </a>
            <a href="#how" className="eyebrow hover:!text-brass-hi transition-colors">
              How it works
            </a>
            <a href="#keys" className="eyebrow hover:!text-brass-hi transition-colors">
              The keys
            </a>
            <Link href="/docs" className="eyebrow hover:!text-brass-hi transition-colors">
              Docs
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-4">
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="eyebrow hover:!text-brass-hi transition-colors hidden sm:inline"
            >
              GitHub ↗
            </a>
            <span className="datum text-[10px] text-steel/70 hidden sm:inline">
              {monad.name} · {monad.id}
            </span>
            <Link href="/panel" className="btn !py-1.5">
              Open the panel
            </Link>
          </div>
        </div>
      </header>

      {/* ---- hero ---- */}
      {/* Fills the first screen exactly; the ledger strip below starts at the fold. */}
      <section className="mx-auto w-full max-w-6xl px-5 sm:px-8 py-12 lg:py-10 lg:min-h-[calc(100dvh-3.5rem)] grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-14 items-center">
        <div>
          <Reveal>
            <span className="plate inline-block px-2.5 py-1 text-[10px] font-semibold tracking-[0.18em] uppercase">
              A vault whose key you can keep in .env
            </span>
          </Reveal>
          <Reveal delay={90}>
            <h1
              className="font-[family-name:var(--font-display)] font-extrabold tracking-tighter leading-[0.95] mt-6 text-balance"
              style={{ fontSize: "clamp(2.4rem, 5.2vw, 4.25rem)" }}
            >
              Your deploy key is going to leak.
            </h1>
          </Reveal>
          <Reveal delay={180}>
            <p className="text-[15px] sm:text-base text-bone-dim mt-6 max-w-[52ch] leading-relaxed">
              Not because you are careless — because it has to be hot. It lives in a file, an agent reads it,
              a script signs with it. Nchedo is the vault that already assumes the file is public: slow money
              next to a tripwire, on Monad.
            </p>
          </Reveal>
          <Reveal delay={270}>
            <div className="flex flex-wrap items-center gap-3 mt-8">
              {primary}
              <Link href="/panel" className="btn !px-8 !py-3">
                Open the panel
              </Link>
            </div>
            <p className="datum text-[10px] text-steel/70 mt-4">
              one transaction deploys the vault, the bait, and the canary
            </p>
          </Reveal>
        </div>

        {/* the leak, replayed */}
        <Reveal delay={200}>
          <div className="panel">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-brass/20">
              <span className="datum text-[11px] text-bone">.env</span>
              <span className="eyebrow !text-oxide-hi">pushed to a public repo · 09:14:07</span>
            </div>
            <div className="px-4 py-4 space-y-2 datum text-[11px] leading-relaxed">
              <p className="text-steel break-all">MONAD_RPC_URL=https://testnet-rpc.monad.xyz</p>
              <p className="text-bone-dim break-all">VAULT_OWNER_KEY=0x5bd8…c2b9</p>
              <div className="flex items-center gap-2 -mx-2 px-2 py-1 bg-brass/10 border-l-2 border-brass">
                <p className="text-brass-hi break-all">
                  CANARY_KEY=0x967e…7e92<span className="caret">▍</span>
                </p>
                <span className="plate ml-auto shrink-0 px-1.5 py-0.5 text-[8px] font-semibold tracking-[0.16em] uppercase">
                  tripwire
                </span>
              </div>
            </div>
            <div className="tape border-t border-brass/20 px-4 py-2">
              <TapeLine at="1.4s" time="09:14:39" text="key tried on the fast money" />
              <TapeLine at="2.2s" time="09:14:41" text="bait taken" amount="0.100 MON" alarm />
              <TapeLine at="3.0s" time="09:14:41" text="VAULT LOCKED" alarm bold />
            </div>
            <div className="flex items-center gap-2 px-4 py-2.5 border-t border-brass/20">
              <span className="lamp hero-lamp" />
              <span className="eyebrow">vault</span>
              <span className="datum text-[10px] text-bone-dim ml-auto">4.900 MON · untouched</span>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ---- ledger strip ---- */}
      <div className="border-y border-brass/25 bg-enamel-lo/60">
        <div className="mx-auto max-w-6xl px-5 sm:px-8 py-3 grid grid-cols-2 md:flex md:items-center md:justify-between gap-x-8 gap-y-2">
          <Fact>one transaction · vault + bait + canary</Fact>
          <Fact>withdrawals mature in the open</Fact>
          <Fact>the lock fires in the thief&apos;s own transaction</Fact>
          <Fact>no servers · every number is a chain read</Fact>
        </div>
      </div>

      {/* ---- the problem ---- */}
      <section id="problem" className="scroll-mt-20 mx-auto w-full max-w-6xl px-5 sm:px-8 pt-12 md:pt-16 lg:pt-20 pb-4 md:pb-8 lg:pb-10 grid grid-cols-1 lg:grid-cols-[1fr_1.05fr] gap-10 lg:gap-16 lg:items-center">
        <div>
          <Reveal>
            <h2
              className="font-[family-name:var(--font-display)] font-extrabold tracking-tighter leading-[1.02] text-balance"
              style={{ fontSize: "clamp(1.75rem, 3.4vw, 2.6rem)" }}
            >
              The key has to stay hot. That is the whole problem.
            </h2>
          </Reveal>
          <Reveal delay={120}>
            <p className="text-[14px] text-bone-dim mt-6 max-w-[56ch] leading-relaxed">
              Cold storage works by making signing hard. But a deploy key that signs ten times a day cannot
              live in a drawer. It sits in .env, readable by every agent and script you run, and one day it is
              in a public repo, a paste, a screenshot.
            </p>
            <p className="text-[14px] text-bone-dim mt-4 max-w-[56ch] leading-relaxed">
              The usual answer is to rotate fast and hope you noticed in time. Nchedo&apos;s answer is to
              decide, in advance, exactly what the leak is allowed to cost.
            </p>
          </Reveal>
        </div>

        <div className="space-y-6">
          <Reveal delay={100}>
            <div className="panel">
              <div className="px-4 py-2.5 border-b border-brass/20">
                <span className="eyebrow">any other hot wallet</span>
              </div>
              <div className="tape px-4 py-2">
                <TapeRow time="03:11:04" text=".env hits a public repo" />
                <TapeRow time="03:11:07" text="drained" amount="4.982 MON" alarm bold />
              </div>
              <p className="text-[11px] text-steel px-4 py-2.5 border-t border-brass/20">
                Leaked keys get swept within seconds — bots watch public pushes for them.
              </p>
            </div>
          </Reveal>
          <Reveal delay={220}>
            <div className="panel">
              <div className="px-4 py-2.5 border-b border-brass/20">
                <span className="eyebrow !text-brass-hi">nchedo · attacker grabs the bait</span>
              </div>
              <div className="tape px-4 py-2">
                <TapeRow time="03:11:07" text="bait taken" amount="0.100 MON" alarm />
                <TapeRow time="03:11:07" text="VAULT LOCKED" alarm bold />
                <TapeRow time="03:26:12" text="swept to safety" amount="4.900 MON" safe />
              </div>
              <p className="text-[11px] text-steel px-4 py-2.5 border-t border-brass/20">
                The thief keeps 0.100 MON. That was always the price of the alarm.
              </p>
            </div>
          </Reveal>
          <Reveal delay={300}>
            <div className="panel">
              <div className="px-4 py-2.5 border-b border-brass/20">
                <span className="eyebrow !text-brass-hi">nchedo · attacker ignores the bait</span>
              </div>
              <div className="tape px-4 py-2">
                <TapeRow time="03:11:07" text="withdrawal requested" amount="4.900 MON" />
                <TapeRow time="03:11:20" text="owner sees it — 15-min public window" />
                <TapeRow time="03:12:04" text="swept by recovery key" amount="4.900 MON" safe />
              </div>
              <p className="text-[11px] text-steel px-4 py-2.5 border-t border-brass/20">
                The canary never fires here. The delay is what buys the time — someone has to use it.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---- how it works ---- */}
      <section id="how" className="scroll-mt-20">
        <div className="mx-auto w-full max-w-6xl px-5 sm:px-8 pt-4 md:pt-8 lg:pt-10 pb-10 md:pb-16 lg:pb-20">
          <Reveal>
            <h2
              className="font-[family-name:var(--font-display)] font-extrabold tracking-tighter leading-[1.02] text-balance max-w-[24ch]"
              style={{ fontSize: "clamp(1.75rem, 3.4vw, 2.6rem)" }}
            >
              Three moves. Two of them are yours.
            </h2>
          </Reveal>

          <div className="mt-10 md:mt-12 space-y-12 md:space-y-14">
            <Step n="01" title="Build it.">
              <p>
                One transaction deploys the vault and the bait, wires them together, and dusts the canary with
                gas so a thief can afford to spend it. You choose the reserve, the bait, the delay, and a
                recovery address that never touches the repo.
              </p>
              <Schematic />
            </Step>

            <Step n="02" title="Leak it on purpose.">
              <p>
                The canary key goes into the same .env as your deploy key. Not a safer file — the same file. A
                canary you are careful with is a canary that survives the leak that mattered. It only works if
                the two keys travel together: same commit, same paste, same screenshot.
              </p>
              <div className="panel px-4 py-3 datum text-[11px] space-y-1.5">
                <p className="text-bone-dim">VAULT_OWNER_KEY=0x5bd8…c2b9</p>
                <p className="text-brass-hi bg-brass/10 border-l-2 border-brass -mx-2 px-2 py-0.5">
                  CANARY_KEY=0x967e…7e92
                </p>
              </div>
            </Step>

            <Step n="03" title="Let it spring.">
              <p>
                Nothing legitimate ever signs with the canary, so one signature is not a score or an anomaly —
                it is proof. The bait pays the thief instantly, and the same transaction locks the vault and
                kills any withdrawal in flight. You sweep the reserve with the recovery key.
              </p>
              <div className="panel scored relative px-4 py-3 flex items-center gap-3">
                <span className="lamp lamp-locked" />
                <span className="plate px-2 py-0.5 text-[9px] font-semibold tracking-[0.16em] uppercase">
                  locked
                </span>
                <span className="datum text-[11px] text-oxide-hi ml-auto">withdrawal killed mid-flight</span>
              </div>
            </Step>
          </div>
        </div>
      </section>

      {/* ---- the keys ---- */}
      <section id="keys" className="scroll-mt-20 mx-auto w-full max-w-6xl px-5 sm:px-8 py-16 lg:py-20">
        <Reveal>
          <h2
            className="font-[family-name:var(--font-display)] font-extrabold tracking-tighter leading-[1.02] text-balance max-w-[26ch]"
            style={{ fontSize: "clamp(1.75rem, 3.4vw, 2.6rem)" }}
          >
            Three keys. Only one is allowed to be careless.
          </h2>
        </Reveal>

        <div className="mt-10 border-y border-brass/20 divide-y divide-brass/20">
          <KeyRow name="deploy key" lives=".env" delay={0}>
            Hot and scriptable. Signs deploys all day and refills from the vault on a delay. The one that
            leaks — and the one a leak can no longer drain.
          </KeyRow>
          <KeyRow name="canary key" lives=".env · same file, on purpose" delay={120}>
            Spends exactly once, ever. Whoever signs with it gets 0.100 MON instantly and locks the vault in
            the same transaction. That is the entire detector.
          </KeyRow>
          <KeyRow name="recovery key" lives="never in the repo" delay={240}>
            Cold, on another machine, ideally in a drawer. The only key that can unlock a locked vault or
            sweep it to safety.
          </KeyRow>
        </div>
      </section>

      {/* ---- the machine, at a glance ---- */}
      <section className="mx-auto w-full max-w-6xl px-5 sm:px-8 pb-16 lg:pb-20">
        <Reveal>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            {/* slow money */}
            <Tile className="md:col-span-2">
              <h3 className="font-[family-name:var(--font-display)] text-lg font-bold tracking-tight">
                Slow money
              </h3>
              <p className="text-[12px] text-bone-dim mt-2 leading-relaxed">
                Every withdrawal is announced on-chain and waits out the delay in public.
              </p>
              <div className="mt-auto pt-5">
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="eyebrow">leaving the vault</span>
                  <span className="datum text-[11px] text-bone">08:42</span>
                </div>
                <div className="h-1.5 bg-enamel-lo">
                  <div className="h-full w-[42%] bg-brass" />
                </div>
              </div>
            </Tile>

            {/* the announcement queue */}
            <Tile className="md:col-span-2">
              <span className="eyebrow">in flight · visible to everyone</span>
              <div className="mt-3 space-y-2">
                <QueueRow amount="0.500" to="0x5bd8…23E3" note="matures 09:29" />
                <QueueRow amount="1.250" to="0xC877…6e57" note="matures 11:04" />
                <QueueRow amount="0.100" to="0x41aa…09F1" note="cancelled" dead />
              </div>
              <p className="text-[11px] text-steel mt-3">
                If a request was not you, this is your fifteen-minute window.
              </p>
            </Tile>

            {/* the tape */}
            <Tile className="md:col-span-2">
              <h3 className="font-[family-name:var(--font-display)] text-lg font-bold tracking-tight">
                The tape forgets nothing
              </h3>
              <p className="text-[12px] text-bone-dim mt-2 leading-relaxed">
                Every event prints with a transaction hash. If it is on the tape, it happened — there is no
                other memory.
              </p>
              <p className="datum text-[10px] text-steel mt-auto pt-5 break-all">
                0xbd93f8…a1 · 0x77c04e…9c · 0x02d1af…4e
              </p>
            </Tile>

            {/* accent: build */}
            <div className="md:col-span-3 plate p-7 sm:p-9 flex flex-col items-center justify-center text-center">
              <Mark size={30} />
              <h3 className="font-[family-name:var(--font-display)] text-2xl font-extrabold tracking-tight mt-3">
                Build a vault
              </h3>
              <p className="text-[12px] mt-2 max-w-[34ch] leading-relaxed opacity-80">
                Reserve, bait, and canary — one transaction, and the trap is armed.
              </p>
              <Link href={isConnected ? "/create" : "/panel"} className="btn mt-5 !px-7">
                {isConnected ? "Start building" : "Launch app"}
              </Link>
            </div>

            {/* stats */}
            <Tile className="md:col-span-3 items-center justify-center text-center">
              <p className="eyebrow">armed, still usable</p>
              <div className="flex items-center justify-center gap-5 sm:gap-8 mt-6">
                <Gauge value="1 tx" label="deploys it" />
                <Gauge value="15 min" label="to pay out" big />
                <Gauge value="1 sig" label="locks it" />
              </div>
            </Tile>

            {/* kill switch */}
            <Tile className="md:col-span-2">
              <h3 className="font-[family-name:var(--font-display)] text-lg font-bold tracking-tight">
                Kill switch included
              </h3>
              <p className="text-[12px] text-bone-dim mt-2 leading-relaxed">
                The lock cancels any withdrawal still in flight — even one requested seconds before.
              </p>
              <p className="datum text-[11px] text-oxide-hi mt-auto pt-5">
                withdrawal killed mid-flight ✕
              </p>
            </Tile>

            {/* built on */}
            <Tile className="md:col-span-2 items-center justify-center text-center">
              <span className="eyebrow">built on</span>
              <div className="mt-4 space-y-2.5">
                <p className="datum text-[12px] text-bone-dim tracking-[0.2em]">· MONAD ·</p>
                <p className="datum text-[12px] text-bone-dim tracking-[0.2em]">· FOUNDRY ·</p>
                <p className="datum text-[12px] text-bone-dim tracking-[0.2em]">· VIEM ·</p>
              </div>
            </Tile>

            {/* live */}
            <div className="md:col-span-2 bg-enamel-lo border border-brass/25 p-6 flex flex-col items-center justify-center text-center">
              <Mark size={34} />
              <p className="font-[family-name:var(--font-display)] text-lg font-bold tracking-tight mt-3">
                Live on {monad.name}
              </p>
              <div className="flex items-center gap-2 mt-3">
                <span className="lamp lamp-armed" />
                <span className="eyebrow !text-sap">armed · chain {monad.id}</span>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ---- the security boundary ---- */}
      <section className="mx-auto w-full max-w-6xl px-5 sm:px-8 py-16 lg:py-20">
        <Reveal>
          <h2
            className="font-[family-name:var(--font-display)] font-extrabold tracking-tighter leading-[1.02] text-balance max-w-[24ch]"
            style={{ fontSize: "clamp(1.75rem, 3.4vw, 2.6rem)" }}
          >
            What it guarantees, and what it does not.
          </h2>
          <p className="text-[13px] text-bone-dim mt-4 max-w-[56ch] leading-relaxed">
            Both columns are provable, and both are in the test suite. A security tool that only lists its
            wins is one you can&apos;t trust with the losses.
          </p>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="panel p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="lamp lamp-armed" />
                <span className="eyebrow !text-sap">Nchedo guarantees</span>
              </div>
              <ul className="space-y-3">
                <Boundary good>A leaked owner key cannot drain the vault instantly — every withdrawal matures in public.</Boundary>
                <Boundary good>A claimed bait locks the vault and cancels any pending withdrawal, in the thief&apos;s own transaction.</Boundary>
                <Boundary good>Only the recovery key can move a locked vault. The owner key can never unlock it.</Boundary>
              </ul>
            </div>
            <div className="panel p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="lamp lamp-off" />
                <span className="eyebrow !text-oxide-hi">Nchedo does not</span>
              </div>
              <ul className="space-y-3">
                <Boundary>Stop an attacker who reads the code, ignores the bait, and waits out the delay. It gives you a public window; using it is your job.</Boundary>
                <Boundary>Contain a sweeper that only takes the canary&apos;s gas and never claims. That is an alert, not containment.</Boundary>
                <Boundary>Protect an EOA. No contract can freeze a wallet — Nchedo protects money you put in the vault.</Boundary>
              </ul>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ---- the honest part ---- */}
      <section className="mx-auto w-full max-w-6xl px-5 sm:px-8 pb-16 lg:pb-20">
        <Reveal>
          <div className="plate px-6 py-10 sm:px-12 sm:py-12 text-center">
            <p
              className="font-[family-name:var(--font-display)] font-extrabold tracking-tighter leading-[1.02] text-balance"
              style={{ fontSize: "clamp(1.5rem, 3vw, 2.25rem)" }}
            >
              The delay applies to everyone. Including you.
            </p>
            <p className="text-[13px] mt-4 max-w-[52ch] mx-auto leading-relaxed opacity-80">
              A vault that pays its owner instantly is a vault that pays a thief instantly. Fifteen minutes is
              the price of a key you are allowed to lose.
            </p>
          </div>
        </Reveal>
      </section>

      {/* ---- final cta ---- */}
      <section className="border-t border-brass/25 bg-enamel-lo/40">
        <div className="mx-auto max-w-6xl px-5 sm:px-8 py-16 lg:py-20 text-center">
          <Reveal>
            <div className="flex justify-center">
              <Mark size={40} />
            </div>
            <h2
              className="font-[family-name:var(--font-display)] font-extrabold tracking-tighter leading-[1.02] text-balance mt-6"
              style={{ fontSize: "clamp(1.75rem, 3.4vw, 2.6rem)" }}
            >
              Treat the leak as a when, not an if.
            </h2>
            <p className="text-[14px] text-bone-dim mt-4 max-w-[46ch] mx-auto leading-relaxed">
              Build the vault before it happens: reserve, bait, and canary in one transaction on Monad
              testnet.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
              {primary}
              <Link href="/panel" className="btn !px-8 !py-3">
                Open the panel
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---- footer ---- */}
      <footer className="border-t border-brass/25 bg-enamel-lo/60">
        <div className="mx-auto max-w-6xl px-5 sm:px-8 py-12 grid grid-cols-1 sm:grid-cols-[1.4fr_1fr_1fr] gap-10">
          <div>
            <div className="flex items-center gap-2.5">
              <Mark size={22} />
              <span className="font-[family-name:var(--font-display)] text-base font-extrabold tracking-tight">
                Nchedo
              </span>
            </div>
            <p className="text-[12px] text-steel mt-3 max-w-[38ch] leading-relaxed">
              <span className="text-bone-dim">Nchedo</span> (Igbo: <span className="italic">Nchèdọ</span>,
              roughly &ldquo;N-cheh-doh&rdquo;) means <span className="text-bone-dim">protection</span>. It
              does not stop every leak — it delays loss, exposes the theft, and contains a claimed bait.
            </p>
          </div>
          <div>
            <p className="eyebrow mb-3">App</p>
            <ul className="space-y-2 text-[12px]">
              <li>
                <Link href="/panel" className="text-bone-dim hover:text-brass-hi transition-colors">
                  Panel
                </Link>
              </li>
              <li>
                <Link href="/create" className="text-bone-dim hover:text-brass-hi transition-colors">
                  New vault
                </Link>
              </li>
              <li>
                <Link href="/docs" className="text-bone-dim hover:text-brass-hi transition-colors">
                  Docs
                </Link>
              </li>
              <li>
                <a
                  href={REPO_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="text-bone-dim hover:text-brass-hi transition-colors"
                >
                  GitHub ↗
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className="eyebrow mb-3">Chain</p>
            <ul className="space-y-2 text-[12px]">
              <li className="text-bone-dim">
                {monad.name} · chain {monad.id}
              </li>
              <li>
                <a
                  href={addressUrl(FACTORY_ADDRESS)}
                  target="_blank"
                  rel="noreferrer"
                  className="datum text-[11px] text-bone-dim hover:text-brass-hi transition-colors"
                >
                  factory {short(FACTORY_ADDRESS)} ↗
                </a>
              </li>
              <li>
                <a
                  href={EXPLORER}
                  target="_blank"
                  rel="noreferrer"
                  className="text-bone-dim hover:text-brass-hi transition-colors"
                >
                  Explorer ↗
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-brass/15">
          <div className="mx-auto max-w-6xl px-5 sm:px-8 py-4">
            <span className="eyebrow !text-steel/50">
              nothing on this site is cached — the panel reads the chain
            </span>
          </div>
        </div>
      </footer>
    </main>
  );
}

/* ---------- pieces ------------------------------------------------------ */

/** Fade on first view — opacity only, so nothing ever sits below its true
 *  position. Reduced motion and already-on-screen elements skip it entirely. */
function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }
    if (el.getBoundingClientRect().top < window.innerHeight) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px 0px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        opacity: shown ? 1 : 0,
        transition: `opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

function Tile({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={`panel p-6 flex flex-col min-h-[180px] ${className}`}>{children}</div>;
}

function Boundary({ good, children }: { good?: boolean; children: React.ReactNode }) {
  return (
    <li className="flex gap-3 text-[13px] text-bone-dim leading-relaxed">
      <span className={`shrink-0 datum ${good ? "text-sap" : "text-oxide-hi"}`} aria-hidden>
        {good ? "✓" : "✕"}
      </span>
      <span>{children}</span>
    </li>
  );
}

function QueueRow({ amount, to, note, dead }: { amount: string; to: string; note: string; dead?: boolean }) {
  return (
    <div
      className={`flex items-baseline gap-3 bg-enamel-lo border border-steel/25 px-3 py-2 datum text-[11px] ${
        dead ? "opacity-45" : ""
      }`}
    >
      <span className={dead ? "line-through text-steel" : "text-bone"}>{amount} MON</span>
      <span className="text-steel">→ {to}</span>
      <span className={`ml-auto text-[10px] ${dead ? "text-oxide-hi" : "text-steel"}`}>{note}</span>
    </div>
  );
}

function Gauge({ value, label, big }: { value: string; label: string; big?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2.5">
      <div
        className={`rounded-full border flex items-center justify-center ${
          big ? "w-28 h-28 border-brass bg-brass/10" : "w-20 h-20 border-brass/50"
        }`}
      >
        <span className={`datum ${big ? "text-[15px] text-brass-hi" : "text-[12px] text-bone"}`}>{value}</span>
      </div>
      <span className="eyebrow">{label}</span>
    </div>
  );
}

function Fact({ children }: { children: React.ReactNode }) {
  return <span className="datum text-[10px] text-steel md:whitespace-nowrap">{children}</span>;
}

function TapeRow({
  time,
  text,
  amount,
  alarm,
  safe,
  bold,
}: {
  time: string;
  text: string;
  amount?: string;
  alarm?: boolean;
  safe?: boolean;
  bold?: boolean;
}) {
  return (
    <div
      className={`flex items-baseline gap-3 h-7 datum text-[11px] ${
        alarm ? "text-oxide-hi" : safe ? "text-sap" : "text-bone-dim"
      }`}
    >
      <span className="text-steel shrink-0 tabular-nums">{time}</span>
      <span className={`truncate ${bold ? "font-semibold tracking-wide" : ""}`}>{text}</span>
      {amount && <span className="ml-auto shrink-0">{amount}</span>}
    </div>
  );
}

/** Same row, but it prints on a timer — the hero replays the leak once. */
function TapeLine(props: Parameters<typeof TapeRow>[0] & { at: string }) {
  const { at, ...row } = props;
  return (
    <div className="print-late" style={{ animationDelay: at }}>
      <TapeRow {...row} />
    </div>
  );
}

function Step({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  const [body, artifact] = Array.isArray(children) ? children : [children, null];
  return (
    <Reveal>
      <div className="grid grid-cols-[auto_1fr] md:grid-cols-[64px_1fr_1fr] gap-x-6 gap-y-5 items-start">
        <span className="datum text-[13px] text-brass-hi pt-1">{n}</span>
        <div>
          <h3 className="font-[family-name:var(--font-display)] text-xl font-bold tracking-tight">{title}</h3>
          <div className="text-[14px] text-bone-dim mt-3 max-w-[52ch] leading-relaxed [&>p]:m-0">{body}</div>
        </div>
        <div className="col-start-2 md:col-start-3 self-center">{artifact}</div>
      </div>
    </Reveal>
  );
}

function KeyRow({
  name,
  lives,
  delay,
  children,
}: {
  name: string;
  lives: string;
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <Reveal delay={delay}>
      <div className="grid grid-cols-1 md:grid-cols-[170px_1fr_auto] gap-x-8 gap-y-2 items-baseline py-6">
        <span className="plate justify-self-start px-2.5 py-1 text-[10px] font-semibold tracking-[0.16em] uppercase">
          {name}
        </span>
        <p className="text-[13px] text-bone-dim leading-relaxed max-w-[54ch]">{children}</p>
        <span className="datum text-[11px] text-steel md:text-right">{lives}</span>
      </div>
    </Reveal>
  );
}

/** One transaction, three contracts, wired. Drawn in the panel's own hardware. */
function Schematic() {
  return (
    <svg
      viewBox="0 0 320 150"
      className="w-full h-auto"
      role="img"
      aria-label="Schematic: the canary key claims the bait, and the bait locks the vault"
    >
      {/* vault */}
      <rect x="8" y="10" width="132" height="44" fill="none" stroke="#b08d3f" strokeOpacity="0.6" />
      <text x="20" y="29" fill="#dedccf" fontSize="11" fontFamily="var(--font-data)">
        VAULT
      </text>
      <text x="20" y="44" fill="#6e7a73" fontSize="8.5" fontFamily="var(--font-data)">
        5.000 MON · slow
      </text>
      {/* bait */}
      <rect x="8" y="96" width="132" height="44" fill="none" stroke="#b08d3f" strokeOpacity="0.6" />
      <text x="20" y="115" fill="#dedccf" fontSize="11" fontFamily="var(--font-data)">
        BAIT
      </text>
      <text x="20" y="130" fill="#6e7a73" fontSize="8.5" fontFamily="var(--font-data)">
        0.100 MON · instant
      </text>
      {/* canary */}
      <rect x="196" y="96" width="116" height="44" fill="none" stroke="#b08d3f" strokeOpacity="0.6" />
      <text x="208" y="115" fill="#dedccf" fontSize="11" fontFamily="var(--font-data)">
        CANARY
      </text>
      <text x="208" y="130" fill="#6e7a73" fontSize="8.5" fontFamily="var(--font-data)">
        gas · in .env
      </text>
      {/* canary -> bait */}
      <line x1="196" y1="118" x2="146" y2="118" stroke="#6e7a73" strokeWidth="1" />
      <polygon points="146,118 152,115 152,121" fill="#6e7a73" />
      <text x="150" y="110" fill="#6e7a73" fontSize="8.5" fontFamily="var(--font-data)">
        claim()
      </text>
      {/* bait -> vault */}
      <line x1="74" y1="96" x2="74" y2="60" stroke="#e8674c" strokeWidth="1" />
      <polygon points="74,60 71,66 77,66" fill="#e8674c" />
      <text x="82" y="80" fill="#e8674c" fontSize="8.5" fontFamily="var(--font-data)">
        lock()
      </text>
    </svg>
  );
}
