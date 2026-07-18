"use client";

import { useState } from "react";
import Link from "next/link";
import { parseEther, isAddress } from "viem";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { vaultAbi } from "@/lib/abi";
import { mon, short, clock, delayLabel } from "@/lib/format";
import { addressUrl } from "@/lib/chain";
import { useCountdown } from "@/hooks/useVault";

type Props = {
  vault: `0x${string}`;
  state: "active" | "locked" | undefined;
  balance?: bigint;
  pendingTo?: `0x${string}`;
  pendingAmount?: bigint;
  maturesAt: number;
  chainNow: number;
  delay?: number;
  recovery?: `0x${string}`;
};

export function VaultPanel(p: Props) {
  const { address } = useAccount();
  const [to, setTo] = useState("");
  const [amt, setAmt] = useState("");

  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });

  const remaining = useCountdown(p.maturesAt, p.chainNow);
  const locked = p.state === "locked";
  const hasPending = Boolean(p.pendingAmount && p.pendingAmount > 0n);
  const mature = hasPending && remaining <= 0;
  const isRecoveryKey = Boolean(address && p.recovery && address.toLowerCase() === p.recovery.toLowerCase());

  const total = p.delay ?? 900;
  const drained = hasPending ? Math.min(1, Math.max(0, 1 - remaining / total)) : 0;

  const busy = isPending || receipt.isLoading;
  const call = (functionName: "requestWithdrawal" | "executeWithdrawal" | "cancelWithdrawal" | "recoverTo", args?: readonly unknown[]) => {
    reset();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    writeContract({ address: p.vault, abi: vaultAbi, functionName, args: args as any });
  };

  return (
    <div className="panel flex flex-col h-full min-h-0">
      <div className="flex items-baseline justify-between px-5 py-3 border-b border-brass/20">
        <div className="eyebrow">Vault</div>
        <a
          href={addressUrl(p.vault)}
          target="_blank"
          rel="noreferrer"
          className="datum text-[10px] text-steel hover:text-brass-hi"
        >
          {short(p.vault, 5)} ↗
        </a>
      </div>

      <div className={`px-5 py-6 relative ${locked ? "scored" : ""}`}>
        <div className="eyebrow mb-1.5">Held</div>
        <div
          className={`font-[family-name:var(--font-display)] font-extrabold tracking-tighter leading-none ${
            locked ? "text-oxide-hi" : "text-bone"
          }`}
          style={{ fontSize: "clamp(2.25rem, 5vw, 3.25rem)" }}
        >
          {mon(p.balance, 3)}
          <span className="text-steel text-[0.4em] font-[family-name:var(--font-ui)] font-semibold ml-2 tracking-normal">
            MON
          </span>
        </div>
        <div className="eyebrow mt-2 !text-steel/70">
          matures {p.delay ? delayLabel(p.delay) : "—"} after every request · always, for everyone, including you
        </div>
      </div>

      {/* countdown */}
      <div className="px-5 pb-5">
        {hasPending ? (
          <div className={`border p-4 ${locked ? "border-oxide/40" : "border-brass/35"}`}>
            <div className="flex items-baseline justify-between mb-3">
              <div className="eyebrow">Leaving the vault</div>
              <div className="datum text-[11px] text-bone-dim">
                {mon(p.pendingAmount, 3)} MON → {short(p.pendingTo)}
              </div>
            </div>
            <div
              className="font-[family-name:var(--font-display)] font-extrabold tabular-nums leading-none mb-3"
              style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)" }}
            >
              {clock(remaining)}
            </div>
            <div className="h-1.5 bg-enamel-lo overflow-hidden">
              <div
                className={`h-full transition-[width] duration-200 ease-linear ${
                  mature ? "bg-oxide-hi" : "bg-brass"
                }`}
                style={{ width: `${drained * 100}%` }}
              />
            </div>
            <p className="text-[11px] text-steel mt-2.5 leading-relaxed">
              {mature
                ? "Matured. Whoever holds the owner key can take this now."
                : "Announced on-chain the moment it was requested. If this was not you, this is your window."}
            </p>
          </div>
        ) : (
          <div className="border border-steel/25 p-4">
            <div className="eyebrow mb-1">Leaving the vault</div>
            <p className="text-[11px] text-steel leading-relaxed">
              Nothing in flight. Any request lands here first, in public, before it lands anywhere else.
            </p>
          </div>
        )}
      </div>

      {/* controls */}
      <div className="mt-auto border-t border-brass/20 p-5 space-y-3">
        {locked ? (
          <div className="space-y-3">
            <p className="text-[11px] text-oxide-hi leading-relaxed">
              Locked. The owner key can do nothing here now — not request, not execute, not unlock. Only the
              recovery key can move this money, and the recovery key was never in the repo.
            </p>
            {isRecoveryKey ? (
              <div className="flex gap-2">
                <input
                  className="field"
                  placeholder="Sweep to… 0x"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
                <button
                  className="btn btn-oxide shrink-0"
                  disabled={!isAddress(to) || busy}
                  onClick={() => call("recoverTo", [to as `0x${string}`])}
                >
                  Sweep
                </button>
              </div>
            ) : (
              <Link href={`/recovery?vault=${p.vault}`} className="btn btn-oxide w-full text-center">
                Open recovery console
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <input className="field" placeholder="To… 0x" value={to} onChange={(e) => setTo(e.target.value)} />
              <input
                className="field !w-24"
                placeholder="MON"
                value={amt}
                onChange={(e) => setAmt(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <button
                className="btn flex-1"
                disabled={!isAddress(to) || !amt || Number(amt) <= 0 || hasPending || busy}
                onClick={() => call("requestWithdrawal", [to as `0x${string}`, parseEther(amt)])}
              >
                Request
              </button>
              <button
                className="btn btn-brass flex-1"
                disabled={!mature || busy}
                onClick={() => call("executeWithdrawal")}
              >
                Pay out
              </button>
              <button className="btn" disabled={!hasPending || busy} onClick={() => call("cancelWithdrawal")}>
                Cancel
              </button>
            </div>
          </>
        )}

        {error && <div className="datum text-[10px] text-oxide-hi break-words">{error.message.split("\n")[0]}</div>}
      </div>
    </div>
  );
}
