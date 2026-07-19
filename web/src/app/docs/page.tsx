"use client";

import Link from "next/link";
import { Header } from "@/components/Header";
import { Mark } from "@/components/Mark";
import { monad, addressUrl, REPO_URL } from "@/lib/chain";
import { FACTORY_ADDRESS, short } from "@/lib/format";

const DEMO_VAULT = "0xB87Da78f5FCC94BeEF0042997D4B7689032F9dE0";
const DEMO_BAIT = "0x6734c260d14DF4823FCA97c4624155959d6cC2DB";

export default function DocsPage() {
  return (
    <main className="min-h-dvh flex flex-col">
      <Header />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-5 sm:px-8 py-10 lg:py-14">
          {/* ---- header ---- */}
          <div className="flex items-center gap-3">
            <Mark size={28} />
            <div>
              <div className="eyebrow">Docs</div>
              <h1 className="font-[family-name:var(--font-display)] text-2xl font-extrabold tracking-tight">
                How the vault, the bait, and the canary fit together
              </h1>
            </div>
          </div>
          <p className="text-[13px] text-bone-dim mt-4 max-w-[62ch] leading-relaxed">
            This page is the reference version of the pitch on the{" "}
            <Link href="/" className="text-brass-hi hover:text-bone">
              landing page
            </Link>
            . Full source, the Foundry test suite, and the deploy scripts are in the repo.
          </p>
          <div className="flex flex-wrap gap-2 mt-5">
            <Link href="/create" className="btn btn-brass">
              Build a vault
            </Link>
            <Link href="/panel" className="btn">
              Open the panel
            </Link>
            <a href={REPO_URL} target="_blank" rel="noreferrer" className="btn">
              View source ↗
            </a>
          </div>

          {/* ---- mechanism ---- */}
          <Section title="The mechanism">
            <p>
              A factory transaction deploys two contracts and wires them together: a vault that holds the real
              reserve, and a bait that holds a small instant reward. A separate canary key — generated in your
              browser, never stored anywhere — is the only key that can claim the bait.
            </p>
            <pre className="datum text-[11px] bg-enamel-lo border border-steel/40 p-4 overflow-x-auto whitespace-pre-wrap mt-4 mb-0">
{`  Owner key (hot, in .env)        Canary key (bait, same .env)
           │                                  │
           │ requestWithdrawal()              │ claim() — pays instantly
           ▼                                  │
     NchedoVault ◄──────── lock() ──────  NchedoBait
     pays after a public delay,      the lock fires inside the
     always, for everyone            thief's own transaction`}
            </pre>
            <p className="mt-4">
              <code className="datum text-bone-dim">NchedoBait.claim()</code> calls{" "}
              <code className="datum text-bone-dim">NchedoVault.lock()</code> before it pays out. If either half
              fails, the whole transaction reverts — a successful claim cannot pay without also locking. Any
              withdrawal in flight is deleted in the same transaction.
            </p>
          </Section>

          {/* ---- three keys ---- */}
          <Section title="Three keys, one allowed to be careless">
            <div className="border-y border-brass/20 divide-y divide-brass/20 not-prose">
              <KeyRow name="owner key" lives=".env">
                Hot and scriptable. Requests withdrawals, which mature after the delay you pick. It cannot skip
                the delay, and it cannot act at all once the vault is locked.
              </KeyRow>
              <KeyRow name="canary key" lives=".env · same file, on purpose">
                Spends exactly once, ever. Whoever signs with it gets the bait instantly and locks the vault in
                the same transaction — the entire detector is that one signature.
              </KeyRow>
              <KeyRow name="recovery key" lives="never in the repo">
                Cold, kept off-repo. The only key that can sweep a locked vault (<code className="datum">recoverTo</code>),
                freeze one pre-emptively (<code className="datum">lockByRecovery</code>), or reverse a false alarm
                (<code className="datum">unlock</code>).
              </KeyRow>
            </div>
          </Section>

          {/* ---- threat model ---- */}
          <Section title="Threat model">
            <div className="overflow-x-auto not-prose">
              <table className="w-full text-[12px] border-collapse">
                <thead>
                  <tr className="border-b border-brass/25">
                    <th className="eyebrow !text-steel text-left font-semibold px-3 py-2">Scenario</th>
                    <th className="eyebrow !text-steel text-left font-semibold px-3 py-2">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brass/10">
                  {THREATS.map(([scenario, result], i) => (
                    <tr key={i}>
                      <td className="text-bone-dim px-3 py-2.5 align-top leading-relaxed">{scenario}</td>
                      <td className="text-bone-dim px-3 py-2.5 align-top leading-relaxed">{result}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-steel mt-3 mb-0">
              Every row is a passing test in{" "}
              <code className="datum">contracts/test/Nchedo.t.sol</code>.
            </p>
          </Section>

          {/* ---- try it ---- */}
          <Section title="Try it yourself">
            <p>
              You do not need your own deployment, and you do not need to touch a local <code className="datum">.env</code>{" "}
              to test the app — the canary key is generated in your browser at <code className="datum">/create</code>{" "}
              and shown once on screen. Paste it straight into the attacker console on the panel to spring your
              own trap in the same session.
            </p>
            <ol className="list-decimal pl-5 space-y-1.5 mt-3">
              <li>Connect a wallet on {monad.name} and get testnet MON from the faucet.</li>
              <li>
                <Link href="/create" className="text-brass-hi hover:text-bone">
                  Build a vault
                </Link>{" "}
                — pick a recovery address you also control, then send the one-shot transaction.
              </li>
              <li>Copy the canary key it hands you and paste it into “Take it” on the panel.</li>
              <li>
                Open{" "}
                <Link href="/recovery" className="text-brass-hi hover:text-bone">
                  the recovery console
                </Link>{" "}
                with the recovery wallet and sweep the reserve.
              </li>
            </ol>
            <p className="mt-3">
              To run the contracts and tests locally instead, see <code className="datum">README.md</code> in the
              repo — <code className="datum">forge test -vv</code> covers both the claim path and the attacks
              Nchedo does not stop.
            </p>
          </Section>

          {/* ---- deployed ---- */}
          <Section title="Deployed">
            <div className="border-y border-brass/20 divide-y divide-brass/15 not-prose">
              <AddrRow label="Network">{monad.name} · chain {monad.id}</AddrRow>
              <AddrRow label="Factory" href={addressUrl(FACTORY_ADDRESS)}>
                {short(FACTORY_ADDRESS, 6)}
              </AddrRow>
              <AddrRow label="Demo vault" href={addressUrl(DEMO_VAULT)}>
                {short(DEMO_VAULT, 6)}
              </AddrRow>
              <AddrRow label="Demo bait" href={addressUrl(DEMO_BAIT)}>
                {short(DEMO_BAIT, 6)}
              </AddrRow>
            </div>
          </Section>

          <div className="border-t border-brass/15 mt-14 pt-6 pb-4">
            <p className="eyebrow !text-steel/50">
              Full write-up, brand notes, and the video script are in the repo — {""}
              <a href={REPO_URL} target="_blank" rel="noreferrer" className="hover:!text-brass-hi">
                github.com/TheWeirdDee/nchedo ↗
              </a>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

const THREATS: [string, string][] = [
  ["Owner key requests an immediate withdrawal", "Delayed; announced on-chain, matures after the delay"],
  ["Canary key claims the bait", "Vault locks automatically, in the same transaction"],
  ["A withdrawal is pending when the bait is claimed", "Deleted in that same transaction"],
  ["Owner key acts on a locked vault", "Reverts — no request, no execute, no unlock"],
  ["Attacker reads the code, ignores the bait, waits out the delay", "Not automatically stopped — a public window to respond"],
  ["Sweeper takes the canary's gas dust and never claims", "Visible as a balance alert; not containment"],
  ["Recovery on a locked (or live) vault", "recoverTo sweeps everything to a safe address"],
  ["Recovery key compromised", "Outside the protection boundary"],
  ["Funds in an EOA, not the vault", "Not protected"],
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="font-[family-name:var(--font-display)] text-lg font-bold tracking-tight">{title}</h2>
      <div className="text-[13px] text-bone-dim mt-3 leading-relaxed space-y-3 [&_ol]:space-y-1.5">{children}</div>
    </section>
  );
}

function KeyRow({ name, lives, children }: { name: string; lives: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr_auto] gap-x-6 gap-y-1.5 items-baseline py-4">
      <span className="plate justify-self-start px-2 py-0.5 text-[9px] font-semibold tracking-[0.16em] uppercase">
        {name}
      </span>
      <p className="text-[12px] text-bone-dim leading-relaxed m-0">{children}</p>
      <span className="datum text-[10px] text-steel sm:text-right">{lives}</span>
    </div>
  );
}

function AddrRow({ label, href, children }: { label: string; href?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <span className="eyebrow !text-steel/60">{label}</span>
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" className="datum text-[11px] text-bone-dim hover:text-brass-hi">
          {children} ↗
        </a>
      ) : (
        <span className="datum text-[11px] text-bone-dim">{children}</span>
      )}
    </div>
  );
}
