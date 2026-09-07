import { useEffect, useRef } from "react";
import type { Turn } from "@/hooks/useConverso";

export function Transcript({ turns, interim }: { turns: Turn[]; interim: string }) {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, interim]);

  return (
    <div className="glass-panel flex h-[26rem] flex-col rounded-3xl">
      <div className="flex items-center justify-between border-b border-border/60 px-5 py-3.5">
        <h2 className="font-display text-xs tracking-[0.24em] text-muted-foreground uppercase">
          Conversation
        </h2>
        <span className="text-xs text-muted-foreground">{turns.length} messages</span>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {turns.length === 0 && !interim && (
          <p className="py-16 text-center text-sm text-muted-foreground">
            Your conversation will appear here.
          </p>
        )}

        {turns.map((turn) => (
          <div
            key={turn.id}
            className={`animate-fade-up flex ${turn.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                turn.role === "user"
                  ? "bg-primary/15 text-foreground"
                  : turn.interrupted
                    ? "bg-muted/60 text-muted-foreground"
                    : "bg-secondary/70 text-foreground"
              }`}
            >
              <div className="mb-1 flex items-center gap-2">
                <span className="font-display text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
                  {turn.role === "user" ? "You" : "Converso"}
                </span>
                {turn.interrupted && (
                  <span className="rounded-full bg-status-interrupted/20 px-2 py-0.5 text-[10px] font-medium tracking-wide text-status-interrupted uppercase">
                    Interrupted
                  </span>
                )}
              </div>
              <p className="whitespace-pre-wrap">
                {turn.text || (turn.streaming ? "…" : "")}
                {turn.interrupted && turn.text ? " …" : ""}
              </p>
            </div>
          </div>
        ))}

        {interim && (
          <div className="flex justify-end">
            <div className="max-w-[85%] rounded-2xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground italic">
              {interim}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}
