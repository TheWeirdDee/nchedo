"use client";

import { useEffect, useState } from "react";
import { useReadContract, useBalance, useBlockNumber } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { vaultAbi, baitAbi, factoryAbi } from "@/lib/abi";
import { FACTORY_ADDRESS } from "@/lib/format";

export type VaultState = "active" | "locked";

/** Everything on this page is a live chain read. Nothing is remembered. */
export function useVault(owner?: `0x${string}`) {
  const queryClient = useQueryClient();
  const { data: blockNumber } = useBlockNumber({ watch: true });

  const vaultQuery = useReadContract({
    address: FACTORY_ADDRESS,
    abi: factoryAbi,
    functionName: "latestVaultOf",
    args: owner ? [owner] : undefined,
    query: { enabled: Boolean(owner) },
  });

  const vault = vaultQuery.data && vaultQuery.data !== "0x0000000000000000000000000000000000000000"
    ? (vaultQuery.data as `0x${string}`)
    : undefined;

  const deployment = useReadContract({
    address: FACTORY_ADDRESS,
    abi: factoryAbi,
    functionName: "deploymentOf",
    args: vault ? [vault] : undefined,
    query: { enabled: Boolean(vault) },
  });

  const snapshot = useReadContract({
    address: vault,
    abi: vaultAbi,
    functionName: "snapshot",
    query: { enabled: Boolean(vault) },
  });

  const bait = deployment.data?.[1];

  const baitSnapshot = useReadContract({
    address: bait,
    abi: baitAbi,
    functionName: "snapshot",
    query: { enabled: Boolean(bait && bait !== "0x0000000000000000000000000000000000000000") },
  });

  const canary = deployment.data?.[2];

  // A sweeper that only moves native balance never calls claim(). We cannot
  // lock on that. We can notice it.
  const canaryBalance = useBalance({
    address: canary,
    query: { enabled: Boolean(canary && canary !== "0x0000000000000000000000000000000000000000") },
  });

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["readContract"] });
    queryClient.invalidateQueries({ queryKey: ["balance"] });
  }, [blockNumber, queryClient]);

  const state: VaultState | undefined =
    snapshot.data === undefined ? undefined : snapshot.data[0] === 1 ? "locked" : "active";

  return {
    ready: !vaultQuery.isLoading,
    vault,
    bait: bait && bait !== "0x0000000000000000000000000000000000000000" ? bait : undefined,
    canary: canary && canary !== "0x0000000000000000000000000000000000000000" ? canary : undefined,
    recovery: deployment.data?.[3],
    delay: deployment.data?.[4] ? Number(deployment.data[4]) : undefined,
    state,
    balance: snapshot.data?.[1],
    pendingTo: snapshot.data?.[2],
    pendingAmount: snapshot.data?.[3],
    maturesAt: snapshot.data?.[4] ? Number(snapshot.data[4]) : 0,
    chainNow: snapshot.data?.[5] ? Number(snapshot.data[5]) : 0,
    baitClaimed: baitSnapshot.data?.[2],
    baitClaimedBy: baitSnapshot.data?.[3],
    reward: baitSnapshot.data?.[5],
    canaryBalance: canaryBalance.data?.value,
    blockNumber,
    refetch: () => {
      vaultQuery.refetch();
      deployment.refetch();
      snapshot.refetch();
      baitSnapshot.refetch();
      canaryBalance.refetch();
    },
  };
}

/** Chain time drifts from wall clock. Anchor to the chain, tick locally. */
export function useCountdown(maturesAt: number, chainNow: number) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!maturesAt || !chainNow) {
      setRemaining(0);
      return;
    }
    const offset = Date.now() / 1000 - chainNow;
    const tick = () => setRemaining(Math.max(0, maturesAt - (Date.now() / 1000 - offset)));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [maturesAt, chainNow]);

  return remaining;
}
