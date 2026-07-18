"use client";

import { useEffect, useRef } from "react";
import type { Row } from "@/hooks/useTimeline";
import { mon, stamp } from "@/lib/format";
import { txUrl } from "@/lib/chain";

export function Timeline({ rows }: { rows: Row[] }) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [rows.length]);

  return (
    <div className="panel flex flex-col h-full min-h-0">
      <div className="flex items-baseline justify-between px-4 py-3 border-b border-brass/20">
        <div className="eyebrow">Tape</div>
        <div className="eyebrow !text-steel/70">{rows.length} events · from chain logs</div>
      </div>

      <div className="tape flex-1 overflow-y-auto min-h-0 px-4 py-2">
        {rows.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-[11px] text-steel text-center max-w-[24ch] leading-relaxed">
              Nothing has happened yet. Everything that does will print here with a hash.
            </p>
          </div>
        ) : (
          <div className="space-y-0">
            {rows.map((r) => (
              <a
                key={r.key}
                href={txUrl(r.hash)}
                target="_blank"
                rel="noreferrer"
                className={`tape-row group flex items-baseline gap-3 h-7 datum text-[11px] hover:bg-enamel-hi/60 -mx-2 px-2 ${
                  r.alarm ? "text-oxide-hi" : "text-bone-dim"
                }`}
              >
                <span className="text-steel shrink-0 tabular-nums">{stamp(r.ts)}</span>
                <span className={`truncate ${r.kind === "locked" ? "font-semibold tracking-wide" : ""}`}>
                  {r.text}
                </span>
                {r.amount !== undefined && (
                  <span className="ml-auto shrink-0 text-bone">{mon(r.amount, 3)} MON</span>
                )}
                <span className="shrink-0 text-steel/50 opacity-0 group-hover:opacity-100 transition-opacity">
                  ↗
                </span>
              </a>
            ))}
            <div ref={endRef} />
          </div>
        )}
      </div>
    </div>
  );
}
