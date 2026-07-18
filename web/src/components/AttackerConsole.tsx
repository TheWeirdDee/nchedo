"use client";

import { useState } from "react";
import { createWalletClient, http, formatEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { usePublicClient, useSendTransaction } from "wagmi";
import { baitAbi } from "@/lib/abi";
import { monad, txUrl } from "@/lib/chain";
import { mon, short } from "@/lib/format";

/**
 * This panel is a weapon pointed at the vault above it.
 *
 * In real use you never come here — the canary key sits in your .env and you
 * hope it stays there. This exists because the only honest way to show a trap
 * works is to let someone spring it, with a key that really spends and a
 * transaction that really lands.
 */
export function AttackerConsole({
  bait,
  canary,
  reward,
  claimed,
  claimedBy,
  onFired,
}: {
  bait?: `0x${string}`;
  canary?: `0x${string}`;
  reward?: bigint;
  claimed?: boolean;
  claimedBy?: `0x${string}`;
  onFired: () => void;
}) {
  const client = usePublicClient();
  const { sendTransactionAsync } = useSendTransaction();
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [hash, setHash] = useState<`0x${string}` | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [shortfall, setShortfall] = useState<bigint | null>(null);

  const looksLikeKey = /^0x[0-9a-fA-F]{64}$/.test(key.trim());
  const wrongKey =
    looksLikeKey && canary
      ? privateKeyToAccount(key.trim() as `0x${string}`).address.toLowerCase() !== canary.toLowerCase()
      : false;

  async function take() {
    if (!bait || !client) return;
    setBusy(true);
    setErr(null);
    try {
      const account = privateKeyToAccount(key.trim() as `0x${string}`);
      const wallet = createWalletClient({ account, chain: monad, transport: http(monad.rpcUrls.default.http[0]) });

      const balance = await client.getBalance({ address: account.address });
      if (balance === 0n) throw new Error("This address has no MON. It cannot pay for gas, so it cannot spend.");

      // Simulate first: a failure here surfaces the decoded revert (NotCanary,
      // AlreadyClaimed, …) before anything is signed or sent.
      await client.simulateContract({
        address: bait,
        abi: baitAbi,
        functionName: "claim",
        account,
      });

      // Affordability with real numbers, not a guess. Fees come from the actual
      // base fee (+30% headroom), not viem's default 2× — the default doubles
      // the balance the canary needs for no reason.
      const [gasLimit, block] = await Promise.all([
        client.estimateContractGas({ address: bait, abi: baitAbi, functionName: "claim", account }),
        client.getBlock(),
      ]);
      const maxPriorityFeePerGas = 2_000_000_000n; // 2 gwei
      const maxFeePerGas = ((block.baseFeePerGas ?? 100_000_000_000n) * 13n) / 10n + maxPriorityFeePerGas;
      const cost = gasLimit * maxFeePerGas;
      if (balance < cost) {
        setShortfall((cost * 13n) / 10n - balance);
        throw new Error(
          `Gas needs ${mon(cost, 4)} MON right now and the canary holds ${mon(balance, 4)}. ` +
            "Fees on the public RPC spike sometimes — retry in a moment, or feed the canary below.",
        );
      }
      setShortfall(null);

      const tx = await wallet.writeContract({
        address: bait,
        abi: baitAbi,
        functionName: "claim",
        gas: gasLimit,
        maxFeePerGas,
        maxPriorityFeePerGas,
      });
      setHash(tx);
      await client.waitForTransactionReceipt({ hash: tx });
      onFired();
    } catch (e) {
      console.error("[nchedo] claim failed:", e);
      setErr(explain(e));
    } finally {
      setBusy(false);
    }
  }

  /** Owner-side demo convenience: when a fee spike outprices the dust, top the
   *  canary up from the connected wallet so the trap stays springable. */
  async function feed() {
    if (!canary || !client || shortfall === null) return;
    setBusy(true);
    try {
      const topUp = await sendTransactionAsync({ to: canary, value: shortfall });
      await client.waitForTransactionReceipt({ hash: topUp });
      setShortfall(null);
      setErr(null);
      onFired();
    } catch (e) {
      console.error("[nchedo] canary top-up failed:", e);
      setErr(explain(e));
    } finally {
      setBusy(false);
    }
  }

  if (claimed) {
    return (
      <div className="panel border-oxide/50 p-5 scored relative">
        <div className="eyebrow !text-oxide-hi mb-2">Sprung</div>
        <p className="text-[13px] leading-relaxed text-bone">
          {short(claimedBy, 5)} took the bait and locked the vault in the same transaction. They kept the
          money. That was always the price of the alarm — the reserve is what it bought.
        </p>
        {hash && (
          <a
            href={txUrl(hash)}
            target="_blank"
            rel="noreferrer"
            className="datum text-[10px] text-brass-hi hover:text-bone mt-3 inline-block"
          >
            {short(hash, 8)} ↗
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="panel p-5">
      <div className="flex items-baseline justify-between mb-3">
        <div className="eyebrow !text-oxide-hi">If you have the key, the money is yours</div>
        <div className="datum text-[11px] text-brass-hi">{mon(reward, 3)} MON · instant</div>
      </div>

      <div className="border-l-2 border-oxide bg-oxide/10 px-3 py-2 mb-3">
        <p className="text-[11px] text-oxide-hi leading-relaxed">
          <span className="font-semibold">Attacker console — demo only.</span> Paste a Nchedo{" "}
          <span className="text-bone">canary</span> key, which is sacrificial and meant to be public. Never
          paste a real wallet key into any website, including this one.
        </p>
      </div>

      <p className="text-[12px] text-bone-dim leading-relaxed mb-3">
        The canary key is in a .env somewhere. Paste it and take the {mon(reward, 2)} MON — no delay, no
        approval, no catch you can see from here. The vault above waits {""}
        <span className="text-bone">fifteen minutes</span> to pay. This waits none.
      </p>

      <div className="flex gap-2">
        <input
          className="field"
          placeholder="0x… stolen canary key"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          spellCheck={false}
        />
        <button
          className="btn btn-oxide shrink-0"
          disabled={!looksLikeKey || wrongKey || busy || !bait || !canary}
          onClick={take}
        >
          {busy ? "Taking…" : "Take it"}
        </button>
      </div>

      {wrongKey && <p className="datum text-[10px] text-steel mt-2">Not this vault&apos;s canary.</p>}
      {err && <p className="datum text-[10px] text-oxide-hi mt-2 break-words">{err}</p>}
      {shortfall !== null && canary && (
        <button className="btn mt-2" disabled={busy} onClick={feed}>
          {busy ? "Feeding…" : `Feed the canary +${mon(shortfall, 3)} MON`}
        </button>
      )}
      {hash && !err && (
        <a
          href={txUrl(hash)}
          target="_blank"
          rel="noreferrer"
          className="datum text-[10px] text-brass-hi mt-2 inline-block"
        >
          {short(hash, 8)} ↗
        </a>
      )}

      <p className="text-[11px] text-steel mt-3 leading-relaxed">
        Nothing legitimate ever signs with this key. That is the whole detector — no scanning, no scoring, no
        model. One signature, and it can only mean one thing.
      </p>
    </div>
  );
}

/** Turn a viem error into something a person can act on. Never truncate the
 *  reason — the first line of a viem message is the part without it. */
function explain(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes("NotCanary")) return "The bait rejected this key — it is not this vault's canary.";
  if (msg.includes("AlreadyClaimed")) return "Too late. The bait is already gone.";
  const short = (e as { shortMessage?: string }).shortMessage;
  const details = /Details: (.+)/.exec(msg)?.[1];
  const base = short ?? msg.split("\n").slice(0, 2).join(" · ");
  return details && !base.includes(details) ? `${base} — ${details}` : base;
}

export function canaryNote(balance?: bigint, funded = 0.02) {
  if (balance === undefined) return null;
  const has = Number(formatEther(balance));
  if (has >= funded - 0.005) return null;
  return "Canary balance dropped. Something moved it and did not call claim() — a sweeper that only takes native balance. This is an alert, not containment. Use the recovery key.";
}
