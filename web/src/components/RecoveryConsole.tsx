"use client";

import { useEffect, useState } from "react";
import { isAddress } from "viem";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useBlockNumber,
} from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { vaultAbi } from "@/lib/abi";
import { mon, short } from "@/lib/format";
import { addressUrl } from "@/lib/chain";

const ZERO = "0x0000000000000000000000000000000000000000";

/**
 * The recovery key's console. It is deliberately separate from the panel: the
 * recovery wallet does not own the vault, so the owner-keyed panel cannot find
 * it. Here you name the vault by address, and the chain says whether the
 * connected wallet is allowed to act on it.
 */
export function RecoveryConsole({ initialVault = "" }: { initialVault?: string }) {
  const { address } = useAccount();
  const { data: blockNumber } = useBlockNumber({ watch: true });
  const queryClient = useQueryClient();

  const [vaultInput, setVaultInput] = useState(initialVault);
  const [safeTo, setSafeTo] = useState("");

  const vault = isAddress(vaultInput) ? (vaultInput as `0x${string}`) : undefined;

  // Read recovery + state straight off the vault (no factory dependency needed).
  const recovery = useReadContract({
    address: vault,
    abi: vaultAbi,
    functionName: "recovery",
    query: { enabled: Boolean(vault) },
  });

  const snapshot = useReadContract({
    address: vault,
    abi: vaultAbi,
    functionName: "snapshot",
    query: { enabled: Boolean(vault) },
  });

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["readContract"] });
  }, [blockNumber, queryClient]);

  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });
  const busy = isPending || receipt.isLoading;

  const recoveryAddr = recovery.data as `0x${string}` | undefined;
  const state = snapshot.data?.[0];
  const balance = snapshot.data?.[1];
  const pendingAmount = snapshot.data?.[3];
  const locked = state === 1;
  const hasPending = Boolean(pendingAmount && pendingAmount > 0n);
  const isRecoveryKey = Boolean(
    address && recoveryAddr && recoveryAddr !== ZERO && address.toLowerCase() === recoveryAddr.toLowerCase(),
  );
  const found = Boolean(vault && recovery.isSuccess && recoveryAddr && recoveryAddr !== ZERO);

  const call = (functionName: "recoverTo" | "lockByRecovery" | "unlock", args?: readonly unknown[]) => {
    if (!vault) return;
    reset();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    writeContract({ address: vault, abi: vaultAbi, functionName, args: args as any });
  };

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="panel p-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="eyebrow !text-brass-hi">Recovery console</span>
        </div>
        <p className="text-[13px] text-bone-dim leading-relaxed">
          The recovery key is the only authority that survives a leak. Name the vault, connect the recovery
          wallet, and move the reserve somewhere the leaked owner key can never reach.
        </p>

        <label className="eyebrow block mt-6 mb-2">Vault address</label>
        <input
          className="field"
          placeholder="0x… the vault to recover"
          value={vaultInput}
          onChange={(e) => setVaultInput(e.target.value.trim())}
          spellCheck={false}
        />

        {vault && recovery.isLoading && (
          <p className="eyebrow mt-3 !text-steel/70">Reading chain…</p>
        )}

        {vault && recovery.isSuccess && !found && (
          <p className="datum text-[11px] text-oxide-hi mt-3">
            No Nchedo vault at this address, or it has no recovery key set.
          </p>
        )}

        {found && (
          <>
            <div className="mt-5 border-t border-brass/20 pt-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Stat label="state">
                <span className={locked ? "text-oxide-hi" : "text-sap"}>{locked ? "LOCKED" : "ACTIVE"}</span>
              </Stat>
              <Stat label="reserve">{mon(balance, 3)} MON</Stat>
              <Stat label="in flight">{hasPending ? `${mon(pendingAmount, 3)} MON` : "none"}</Stat>
              <Stat label="recovery">
                <a
                  href={addressUrl(recoveryAddr!)}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-brass-hi"
                >
                  {short(recoveryAddr, 4)} ↗
                </a>
              </Stat>
            </div>

            {!address ? (
              <p className="datum text-[11px] text-steel mt-5">Connect the recovery wallet to act.</p>
            ) : !isRecoveryKey ? (
              <p className="datum text-[11px] text-oxide-hi mt-5 leading-relaxed">
                The connected wallet ({short(address, 4)}) is not this vault&apos;s recovery key. Only{" "}
                {short(recoveryAddr, 4)} can move this money.
              </p>
            ) : (
              <div className="mt-6 space-y-5">
                {/* primary: sweep */}
                <div>
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="eyebrow !text-bone-dim">Sweep the reserve</span>
                    <span className="datum text-[10px] text-steel">recoverTo · locks + moves everything</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      className="field"
                      placeholder="0x… a cold address the repo never saw"
                      value={safeTo}
                      onChange={(e) => setSafeTo(e.target.value.trim())}
                      spellCheck={false}
                    />
                    <button
                      className="btn btn-brass shrink-0"
                      disabled={!isAddress(safeTo) || busy || balance === 0n}
                      onClick={() => call("recoverTo", [safeTo as `0x${string}`])}
                    >
                      {busy ? "…" : "Sweep"}
                    </button>
                  </div>
                  <p className="text-[11px] text-bone-dim mt-2 leading-relaxed">
                    The safe move. Empties the vault to an address you choose and leaves the old vault locked
                    forever. The leaked owner key is left holding nothing.
                  </p>
                </div>

                {/* secondary: lock on suspicion */}
                {!locked && (
                  <div className="border-t border-brass/15 pt-4">
                    <div className="flex items-baseline justify-between mb-2">
                      <span className="eyebrow !text-steel/70">Lock on suspicion</span>
                      <span className="datum text-[10px] text-steel">lockByRecovery</span>
                    </div>
                    <button
                      className="btn"
                      disabled={busy}
                      onClick={() => call("lockByRecovery")}
                    >
                      Freeze without sweeping
                    </button>
                    <p className="text-[11px] text-steel mt-2 leading-relaxed">
                      Stops the owner key immediately if you suspect a leak but aren&apos;t ready to move funds
                      yet. Cancels any pending withdrawal.
                    </p>
                  </div>
                )}

                {/* discouraged: unlock */}
                {locked && (
                  <div className="border-t border-oxide/20 pt-4">
                    <div className="flex items-baseline justify-between mb-2">
                      <span className="eyebrow !text-oxide-hi">Unlock — false alarm only</span>
                      <span className="datum text-[10px] text-steel">unlock</span>
                    </div>
                    <button className="btn" disabled={busy} onClick={() => call("unlock")}>
                      Restore the owner key
                    </button>
                    <p className="text-[11px] text-oxide-hi mt-2 leading-relaxed">
                      Only if the lock was a mistake. This hands authority back to the owner key — if that key
                      actually leaked, the attacker can drain the vault the moment the delay passes. Sweep
                      instead.
                    </p>
                  </div>
                )}
              </div>
            )}

            {error && (
              <p className="datum text-[10px] text-oxide-hi mt-4 break-words">{error.message.split("\n")[0]}</p>
            )}
            {receipt.isSuccess && (
              <p className="datum text-[10px] text-sap mt-4">Done. The chain has it.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="eyebrow !text-steel/70 mb-1">{label}</div>
      <div className="datum text-[12px] text-bone">{children}</div>
    </div>
  );
}
