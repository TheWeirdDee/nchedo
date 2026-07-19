"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { Mark } from "./Mark";
import { useVault } from "@/hooks/useVault";
import { short } from "@/lib/format";
import { REPO_URL } from "@/lib/chain";

/** Shared chrome across /, /panel and /create. Reads wallet + vault state
 *  itself so every route shows the same lamp, block number and connect control. */
export function Header() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const v = useVault(address);
  const pathname = usePathname();

  const locked = v.state === "locked";

  const handleConnect = () => {
    const conn = connectors[0];
    if (!conn) {
      alert("No wallet connector found. Please install MetaMask and try again.");
      return;
    }
    connect({ connector: conn });
  };

  return (
    <header className="shrink-0 flex items-center gap-4 px-5 h-14 border-b border-brass/25 bg-enamel-lo/60">
      <Link href="/" className="flex items-center gap-2.5">
        <Mark size={24} alarm={locked} />
        <span className="font-[family-name:var(--font-display)] text-lg font-extrabold tracking-tight">
          Nchedo
        </span>
      </Link>

      <div className="hidden md:block text-[11px] text-steel border-l border-steel/25 pl-4 leading-tight">
        A vault whose key you can keep in <span className="datum text-bone-dim">.env</span> on purpose
      </div>

      <nav className="flex items-center gap-1 ml-1">
        {isConnected && (
          <>
            <NavLink href="/panel" active={pathname === "/panel"}>
              Panel
            </NavLink>
            <NavLink href="/create" active={pathname === "/create"}>
              New vault
            </NavLink>
            <NavLink href="/recovery" active={pathname === "/recovery"}>
              Recovery
            </NavLink>
          </>
        )}
        <NavLink href="/docs" active={pathname === "/docs"}>
          Docs
        </NavLink>
      </nav>

      <div className="ml-auto flex items-center gap-4">
        <a
          href={REPO_URL}
          target="_blank"
          rel="noreferrer"
          className="eyebrow !text-steel/60 hover:!text-brass-hi hidden sm:inline"
        >
          GitHub ↗
        </a>
        {v.vault && (
          <div className="flex items-center gap-2">
            <span className={`lamp ${locked ? "lamp-locked" : "lamp-armed"}`} />
            <span className={`eyebrow ${locked ? "!text-oxide-hi" : "!text-sap"}`}>
              {locked ? "Locked" : "Armed"}
            </span>
          </div>
        )}
        {v.blockNumber && (
          <span className="datum text-[10px] text-steel/60 hidden sm:inline">#{v.blockNumber.toString()}</span>
        )}
        {isConnected ? (
          <button className="btn !py-1.5" onClick={() => disconnect()}>
            {short(address)}
          </button>
        ) : (
          <button className="btn btn-brass !py-1.5" onClick={handleConnect}>
            Connect
          </button>
        )}
      </div>
    </header>
  );
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`eyebrow px-2 py-1 ${active ? "!text-brass-hi" : "!text-steel/60 hover:!text-bone-dim"}`}
    >
      {children}
    </Link>
  );
}
