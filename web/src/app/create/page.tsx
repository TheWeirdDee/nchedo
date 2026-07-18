"use client";

import { useRouter } from "next/navigation";
import { useAccount, useConnect, useSwitchChain } from "wagmi";
import { Header } from "@/components/Header";
import { CreateVault } from "@/components/CreateVault";
import { monad } from "@/lib/chain";
import { FACTORY_ADDRESS } from "@/lib/format";

export default function CreatePage() {
  const router = useRouter();
  const { isConnected, chainId } = useAccount();
  const { connect, connectors } = useConnect();
  const { switchChain } = useSwitchChain();

  const wrongChain = isConnected && chainId !== monad.id;
  const configured = FACTORY_ADDRESS !== "0x0000000000000000000000000000000000000000";

  return (
    <main className="h-dvh flex flex-col overflow-hidden">
      <Header />

      {!configured ? (
        <Center>
          <p className="datum text-[12px] text-oxide-hi">NEXT_PUBLIC_FACTORY_ADDRESS is not set.</p>
          <p className="text-[12px] text-steel mt-2">
            Deploy the factory, then put its address in <span className="datum">web/.env.local</span>.
          </p>
        </Center>
      ) : !isConnected ? (
        <Center>
          <p className="text-[13px] text-bone-dim mb-4">Connect a wallet to build a vault.</p>
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
      ) : (
        <div className="flex-1 overflow-y-auto px-5 py-8">
          <CreateVault onDone={() => router.push("/panel")} />
        </div>
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
