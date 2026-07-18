"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAccount, useConnect, useSwitchChain } from "wagmi";
import { Mark } from "@/components/Mark";
import { Header } from "@/components/Header";
import { VaultPanel } from "@/components/VaultPanel";
import { Timeline } from "@/components/Timeline";
import { AttackerConsole, canaryNote } from "@/components/AttackerConsole";
import { useVault } from "@/hooks/useVault";
import { useTimeline } from "@/hooks/useTimeline";
import { short, mon, FACTORY_ADDRESS } from "@/lib/format";
import { monad, addressUrl } from "@/lib/chain";

export default function PanelPage() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors } = useConnect();
  const { switchChain } = useSwitchChain();

  const v = useVault(address);
  const rows = useTimeline(v.vault, v.bait);

  const [flash, setFlash] = useState(false);
  const wasLocked = useRef<boolean | null>(null);

  useEffect(() => {
    if (v.state === undefined) return;
    const locked = v.state === "locked";
    if (wasLocked.current === false && locked) {
      setFlash(true);
      setTimeout(() => setFlash(false), 900);
    }
    wasLocked.current = locked;
  }, [v.state]);

  const wrongChain = isConnected && chainId !== monad.id;
  const note = canaryNote(v.canaryBalance);

  const configured = FACTORY_ADDRESS !== "0x0000000000000000000000000000000000000000";

  return (
    <main className={`h-dvh flex flex-col overflow-hidden ${flash ? "alarm-wash" : ""}`}>
      <Header />

      {/* ---- body ---- */}
      {!configured ? (
        <Center>
          <p className="datum text-[12px] text-oxide-hi">NEXT_PUBLIC_FACTORY_ADDRESS is not set.</p>
          <p className="text-[12px] text-steel mt-2">
            Deploy the factory, then put its address in <span className="datum">web/.env.local</span>.
          </p>
        </Center>
      ) : !isConnected ? (
        <Center>
          <p className="text-[13px] text-bone-dim mb-4">Connect a wallet to see your vault.</p>
          <button className="btn btn-brass" onClick={() => connect({ connector: connectors[0] })}>
            Connect wallet
          </button>
        </Center>
      ) : wrongChain ? (
        <Center>
          <p className="text-[13px] text-bone-dim mb-4">Wrong network.</p>
          <button className="btn btn-brass" onClick={() => switchChain({ chainId: monad.id })}>
            Switch to {monad.name}
          </button>
        </Center>
      ) : !v.ready ? (
        <Center>
          <p className="eyebrow">Reading chain…</p>
        </Center>
      ) : !v.vault ? (
        <Center>
          <Mark size={44} />
          <h1
            className="font-[family-name:var(--font-display)] font-extrabold tracking-tighter leading-[0.95] mt-6 max-w-[18ch]"
            style={{ fontSize: "clamp(1.75rem, 4.5vw, 2.75rem)" }}
          >
            No vault yet.
          </h1>
          <p className="text-[15px] text-bone-dim mt-5 max-w-[48ch] leading-relaxed">
            Nothing here reads from a vault because you do not have one. Build one — the reserve, the bait, and
            a canary generated in your browser — in a single transaction.
          </p>
          <Link href="/create" className="btn btn-brass mt-8 !px-8 !py-3">
            Build a vault
          </Link>
        </Center>
      ) : (
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] gap-px bg-brass/15">
          {/* left column */}
          <div className="min-h-0 flex flex-col gap-px bg-brass/15 overflow-y-auto lg:overflow-hidden">
            <div className="flex-1 min-h-0 bg-enamel">
              <VaultPanel
                vault={v.vault}
                state={v.state}
                balance={v.balance}
                pendingTo={v.pendingTo}
                pendingAmount={v.pendingAmount}
                maturesAt={v.maturesAt}
                chainNow={v.chainNow}
                delay={v.delay}
                recovery={v.recovery}
              />
            </div>
          </div>

          {/* right column */}
          <div className="min-h-0 flex flex-col gap-px bg-brass/15 overflow-y-auto lg:overflow-hidden">
            <div className="flex-1 min-h-0 bg-enamel">
              <Timeline rows={rows} />
            </div>

            {note && (
              <div className="bg-enamel px-5 py-3 border-l-2 border-oxide">
                <p className="text-[11px] text-oxide-hi leading-relaxed">{note}</p>
              </div>
            )}

            <div className="bg-enamel shrink-0">
              <AttackerConsole
                bait={v.bait}
                canary={v.canary}
                reward={v.reward}
                claimed={v.baitClaimed}
                claimedBy={v.baitClaimedBy}
                onFired={v.refetch}
              />
            </div>
          </div>
        </div>
      )}

      {/* ---- footer ---- */}
      {v.vault && (
        <footer className="shrink-0 flex items-center gap-5 px-5 h-9 border-t border-brass/25 bg-enamel-lo/60 overflow-x-auto">
          <Fact label="canary">
            <a href={addressUrl(v.canary ?? "")} target="_blank" rel="noreferrer" className="hover:text-brass-hi">
              {short(v.canary)}
            </a>
          </Fact>
          <Fact label="gas on canary">{mon(v.canaryBalance, 3)}</Fact>
          <Fact label="bait">{v.baitClaimed ? "taken" : `${mon(v.reward, 2)} MON`}</Fact>
          <Fact label="recovery">{short(v.recovery)}</Fact>
          <div className="ml-auto shrink-0">
            <span className="eyebrow !text-steel/50">
              nothing on this page is cached — every number is a chain read
            </span>
          </div>
        </footer>
      )}
    </main>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 text-center overflow-y-auto py-10">
      {children}
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-2 shrink-0">
      <span className="eyebrow !text-steel/60">{label}</span>
      <span className="datum text-[10px] text-bone-dim">{children}</span>
    </div>
  );
}
