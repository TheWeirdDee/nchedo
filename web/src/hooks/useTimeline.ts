"use client";

import { useEffect, useRef, useState } from "react";
import { usePublicClient, useBlockNumber } from "wagmi";
import { parseAbi } from "viem";

export type Row = {
  key: string;
  ts: number;
  block: bigint;
  kind: "created" | "deposit" | "requested" | "executed" | "cancelled" | "locked" | "unlocked" | "recovered" | "claimed";
  text: string;
  amount?: bigint;
  hash: `0x${string}`;
  alarm?: boolean;
};

const eventAbi = parseAbi([
  "event Deposited(address indexed from, uint256 amount, uint256 balance)",
  "event WithdrawalRequested(address indexed to, uint256 amount, uint64 maturesAt)",
  "event WithdrawalExecuted(address indexed to, uint256 amount)",
  "event WithdrawalCancelled(address indexed to, uint256 amount, string reason)",
  "event VaultLocked(address indexed by, uint64 at)",
  "event VaultUnlocked(address indexed by, uint64 at)",
  "event Recovered(address indexed to, uint256 amount)",
  "event BaitClaimed(address indexed by, uint256 amount, uint64 at)",
]);

const KIND: Record<string, Row["kind"]> = {
  Deposited: "deposit",
  WithdrawalRequested: "requested",
  WithdrawalExecuted: "executed",
  WithdrawalCancelled: "cancelled",
  VaultLocked: "locked",
  VaultUnlocked: "unlocked",
  Recovered: "recovered",
  BaitClaimed: "claimed",
};

// The public Monad RPC rejects wide eth_getLogs ranges with HTTP 413, so every
// request stays inside MAX_RANGE. The tape fills incrementally: one bounded
// backfill when the vault loads, then only the blocks minted since the last
// scan — never a re-pull of the whole history on every block.
const MAX_RANGE = 100n;
const BACKFILL = 3_000n;

/**
 * The tape. Every row is a log the chain actually emitted — no local history,
 * no optimistic writes. If it is on the tape, it happened, and the hash proves it.
 */
export function useTimeline(vault?: `0x${string}`, bait?: `0x${string}`) {
  const client = usePublicClient();
  const { data: blockNumber } = useBlockNumber({ watch: true });
  const [rows, setRows] = useState<Row[]>([]);

  // gen invalidates in-flight scans when the vault changes; cursor is the last
  // block already scanned, so each tick only asks for what is new.
  const gen = useRef(0);
  const cursor = useRef<bigint | null>(null);
  const seen = useRef(new Set<string>());
  const times = useRef(new Map<bigint, number>());
  const busy = useRef(false);

  useEffect(() => {
    gen.current++;
    cursor.current = null;
    seen.current = new Set();
    times.current = new Map();
    setRows([]);
  }, [client, vault, bait]);

  useEffect(() => {
    if (!client || !vault || !blockNumber || busy.current) return;
    const myGen = gen.current;
    busy.current = true;

    (async () => {
      try {
        const head = blockNumber;
        const start =
          cursor.current !== null ? cursor.current + 1n : head > BACKFILL ? head - BACKFILL : 0n;
        if (start > head) return;

        const address = bait ? [vault, bait] : [vault];

        const fresh = [];
        let scanned = cursor.current;
        for (let from = start; from <= head; from += MAX_RANGE) {
          const to = from + MAX_RANGE - 1n < head ? from + MAX_RANGE - 1n : head;
          try {
            fresh.push(...(await client.getLogs({ address, events: eventAbi, fromBlock: from, toBlock: to })));
          } catch {
            break; // leave the cursor here; the next block retries this range
          }
          if (gen.current !== myGen) return;
          scanned = to;
        }
        if (gen.current !== myGen) return;
        cursor.current = scanned;

        const wanted = fresh.filter((l) => !seen.current.has(`${l.transactionHash}-${l.logIndex}`));
        if (wanted.length === 0) return;

        const blocks = [...new Set(wanted.map((l) => l.blockNumber!))].filter((b) => !times.current.has(b));
        await Promise.all(
          blocks.map(async (b) => {
            try {
              const blk = await client.getBlock({ blockNumber: b });
              times.current.set(b, Number(blk.timestamp));
            } catch {
              times.current.set(b, 0);
            }
          }),
        );
        if (gen.current !== myGen) return;

        const built: Row[] = [];
        for (const l of wanted) {
          const kind = KIND[l.eventName];
          if (!kind) continue;
          seen.current.add(`${l.transactionHash}-${l.logIndex}`);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const args = (l.args ?? {}) as any;
          const base = {
            key: `${l.transactionHash}-${l.logIndex}`,
            ts: times.current.get(l.blockNumber!) ?? 0,
            block: l.blockNumber!,
            hash: l.transactionHash!,
            kind,
          };
          switch (kind) {
            case "deposit":
              built.push({ ...base, text: "deposit", amount: args.amount as bigint });
              break;
            case "requested":
              built.push({ ...base, text: "withdrawal requested", amount: args.amount as bigint });
              break;
            case "executed":
              built.push({ ...base, text: "withdrawal paid out", amount: args.amount as bigint });
              break;
            case "cancelled":
              built.push({
                ...base,
                text: args.reason === "vault locked" ? "withdrawal killed mid-flight" : "withdrawal cancelled",
                amount: args.amount as bigint,
                alarm: args.reason === "vault locked",
              });
              break;
            case "locked":
              built.push({ ...base, text: "VAULT LOCKED", alarm: true });
              break;
            case "unlocked":
              built.push({ ...base, text: "vault unlocked by recovery key" });
              break;
            case "recovered":
              built.push({ ...base, text: "swept to safety", amount: args.amount as bigint });
              break;
            case "claimed":
              built.push({ ...base, text: "bait taken", amount: args.amount as bigint, alarm: true });
              break;
          }
        }

        if (built.length) {
          setRows((prev) =>
            [...prev, ...built].sort((a, b) =>
              a.block === b.block ? a.key.localeCompare(b.key) : Number(a.block - b.block),
            ),
          );
        }
      } finally {
        busy.current = false;
      }
    })();
  }, [client, vault, bait, blockNumber]);

  return rows;
}
