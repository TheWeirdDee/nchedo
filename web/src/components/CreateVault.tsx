"use client";

import { useMemo, useState } from "react";
import { parseEther, isAddress } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { factoryAbi } from "@/lib/abi";
import { FACTORY_ADDRESS, short, delayLabel as fmtDelay } from "@/lib/format";
import { Mark } from "./Mark";

const DELAYS = [
  { label: "2 min", value: 120, note: "demo" },
  { label: "15 min", value: 900, note: "default" },
  { label: "1 hour", value: 3600, note: "careful" },
];

function CostRow({ label, value }: { label: string; value: string }) {
  const n = Number(value);
  return (
    <div className="flex items-baseline justify-between px-3 py-2">
      <span className="text-[11px] text-bone-dim">{label}</span>
      <span className="datum text-[11px] text-bone">{Number.isFinite(n) ? n.toFixed(3) : "—"} MON</span>
    </div>
  );
}

export function CreateVault({ onDone }: { onDone: () => void }) {
  const [canaryKey] = useState<`0x${string}`>(() => generatePrivateKey());
  const canaryAddress = useMemo(() => privateKeyToAccount(canaryKey).address, [canaryKey]);

  const [recovery, setRecovery] = useState("");
  const [amount, setAmount] = useState("1.0");
  const [baitAmount, setBaitAmount] = useState("0.1");
  const [delay, setDelay] = useState(900);
  const [copied, setCopied] = useState(false);

  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });

  // Enough for a claim even when the public RPC's base fee spikes ~5×.
  const canaryGas = parseEther("0.06");
  const valid =
    isAddress(recovery) && Number(amount) > 0 && Number(baitAmount) > 0 && Number(baitAmount) < Number(amount);

  const totalValid = Number(amount) > 0 && Number(baitAmount) > 0;
  const total = Number(amount) + Number(baitAmount) + 0.06;
  const delayLabel = fmtDelay(delay);

  const envBlock = `VAULT_OWNER_KEY=<your deploy key>\nCANARY_KEY=${canaryKey}`;

  function create() {
    writeContract({
      address: FACTORY_ADDRESS,
      abi: factoryAbi,
      functionName: "createVault",
      args: [recovery as `0x${string}`, canaryAddress, BigInt(delay), parseEther(baitAmount), canaryGas],
      value: parseEther(amount) + parseEther(baitAmount) + canaryGas,
    });
  }

  if (receipt.isSuccess) {
    return (
      <div className="panel max-w-xl mx-auto p-8">
        <div className="eyebrow mb-3">Vault live</div>
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold mb-5">
          Put this in your .env. Not .env.example. The real one.
        </h2>
        <p className="text-sm text-bone-dim mb-4 leading-relaxed">
          The canary only works if it leaks in the same commit as your deploy key. A canary you were careful
          with is a canary that survives the leak that mattered.
        </p>
        <pre className="datum text-[11px] bg-enamel-lo border border-steel/40 p-4 overflow-x-auto whitespace-pre-wrap break-all mb-4">
          {envBlock}
        </pre>
        <div className="flex gap-2">
          <button
            className="btn btn-brass flex-1"
            onClick={() => {
              navigator.clipboard.writeText(envBlock);
              setCopied(true);
              setTimeout(() => setCopied(false), 1600);
            }}
          >
            {copied ? "Copied" : "Copy both lines"}
          </button>
          <button className="btn flex-1" onClick={onDone}>
            Open the panel
          </button>
        </div>
        <p className="eyebrow mt-5 leading-relaxed normal-case tracking-normal">
          This key is shown once. Nchedo never stores it — it was generated in your browser and it lives in
          your file now, nowhere else.
        </p>
      </div>
    );
  }

  return (
    <div className="panel max-w-xl mx-auto p-8">
      <div className="flex items-center gap-3 mb-6">
        <Mark size={30} />
        <div>
          <div className="font-[family-name:var(--font-display)] text-xl font-extrabold tracking-tight">
            Build a vault
          </div>
          <div className="eyebrow">Three keys. Only one of them is allowed to be careless.</div>
        </div>
      </div>

      <div className="space-y-5">
        <div>
          <label className="eyebrow block mb-2">Recovery address — the cold one</label>
          <input
            className="field"
            placeholder="0x… a wallet that never touches this repo"
            value={recovery}
            onChange={(e) => setRecovery(e.target.value)}
          />
          <p className="text-[11px] text-steel mt-1.5">
            The only key that can save a locked vault. Different wallet, different machine, ideally different
            drawer.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="eyebrow block mb-2">Vault — the reserve</label>
            <input className="field" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <p className="text-[11px] text-steel mt-1.5">Slow money.</p>
          </div>
          <div>
            <label className="eyebrow block mb-2">Bait — pays instantly</label>
            <input className="field" value={baitAmount} onChange={(e) => setBaitAmount(e.target.value)} />
            <p className="text-[11px] text-steel mt-1.5">Small enough to lose. Big enough to grab.</p>
          </div>
        </div>

        <div>
          <label className="eyebrow block mb-2">How long the vault makes you wait</label>
          <div className="flex gap-2">
            {DELAYS.map((d) => (
              <button
                key={d.value}
                onClick={() => setDelay(d.value)}
                className={`btn flex-1 ${delay === d.value ? "btn-brass" : ""}`}
              >
                {d.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-steel mt-1.5">
            You are not paying this on every deploy. The hot wallet does the deploying — this is the tank it
            refills from.
          </p>
        </div>

        <div className="plate p-4">
          <div className="eyebrow !text-enamel-lo/60 mb-1">Your canary, generated in this browser</div>
          <div className="datum text-[11px] break-all text-enamel-lo font-semibold">{canaryAddress}</div>
          <p className="text-[11px] text-enamel-lo/70 mt-2 leading-relaxed">
            You get its private key after the vault exists. Nothing legitimate will ever sign with it, which
            is why a single signature from it is proof rather than a guess.
          </p>
        </div>

        {/* What this transaction actually costs — the canary gas is on top of
            the reserve and the bait, which is easy to miss. */}
        <div className="border border-brass/30 divide-y divide-brass/15">
          <div className="eyebrow px-3 py-2 !text-bone-dim bg-enamel-hi/40">You are creating</div>
          <CostRow label="Reserve — slow money" value={amount} />
          <CostRow label="Bait — instant reward" value={baitAmount} />
          <CostRow label="Canary gas — so a thief can spend" value="0.06" />
          <div className="flex items-baseline justify-between px-3 py-2.5">
            <span className="datum text-[11px] text-bone">Total to send</span>
            <span className="datum text-[12px] text-brass-hi font-semibold">
              {totalValid ? `${total.toFixed(3)} MON` : "—"}
            </span>
          </div>
          <div className="flex items-baseline justify-between px-3 py-2 text-[10px]">
            <span className="eyebrow !text-steel normal-case tracking-normal">
              Delay {delayLabel} · recovery {recovery && isAddress(recovery) ? short(recovery) : "not set"}
            </span>
          </div>
        </div>

        {error && (
          <div className="text-[11px] text-oxide-hi datum break-words">{error.message.split("\n")[0]}</div>
        )}

        <button className="btn btn-brass w-full !py-3" disabled={!valid || isPending || receipt.isLoading} onClick={create}>
          {isPending ? "Confirm in wallet" : receipt.isLoading ? "Building…" : "Build vault, bait and canary"}
        </button>
        <p className="text-[11px] text-steel text-center">
          One transaction. Deploys both contracts, wires them, and dusts the canary with 0.06 MON so a thief
          can afford to spend it.
        </p>
      </div>
    </div>
  );
}
