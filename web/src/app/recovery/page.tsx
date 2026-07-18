"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/Header";
import { RecoveryConsole } from "@/components/RecoveryConsole";

export default function RecoveryPage() {
  return (
    <main className="min-h-dvh flex flex-col">
      <Header />
      <div className="flex-1 overflow-y-auto px-5 py-10 lg:py-14">
        <Suspense fallback={null}>
          <PrefilledConsole />
        </Suspense>
      </div>
    </main>
  );
}

function PrefilledConsole() {
  const vault = useSearchParams().get("vault") ?? "";
  return <RecoveryConsole initialVault={vault} />;
}
