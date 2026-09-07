import type { Status } from "@/hooks/useConverso";

const META: Record<Status, { label: string; dot: string; ring: string; text: string; hint: string }> = {
  IDLE: {
    label: "IDLE",
    dot: "bg-status-idle",
    ring: "shadow-[0_0_60px_-12px_var(--status-idle)]",
    text: "text-status-idle",
    hint: "Tap the mic to start talking",
  },
  LISTENING: {
    label: "LISTENING",
    dot: "bg-status-listening",
    ring: "shadow-[0_0_80px_-8px_var(--status-listening)]",
    text: "text-status-listening",
    hint: "Go ahead, I'm listening",
  },
  TRANSCRIBING: {
    label: "TRANSCRIBING",
    dot: "bg-status-listening",
    ring: "shadow-[0_0_80px_-8px_var(--status-listening)]",
    text: "text-status-listening",
    hint: "Catching your words…",
  },
  THINKING: {
    label: "THINKING",
    dot: "bg-status-thinking",
    ring: "shadow-[0_0_80px_-8px_var(--status-thinking)]",
    text: "text-status-thinking",
    hint: "Working on an answer",
  },
  SPEAKING: {
    label: "SPEAKING",
    dot: "bg-status-speaking",
    ring: "shadow-[0_0_90px_-8px_var(--status-speaking)]",
    text: "text-status-speaking",
    hint: "Just start talking to interrupt",
  },
  INTERRUPTED: {
    label: "INTERRUPTED",
    dot: "bg-status-interrupted",
    ring: "shadow-[0_0_80px_-8px_var(--status-interrupted)]",
    text: "text-status-interrupted",
    hint: "Stopped — over to you",
  },
  ERROR: {
    label: "ERROR",
    dot: "bg-status-error",
    ring: "shadow-[0_0_80px_-8px_var(--status-error)]",
    text: "text-status-error",
    hint: "Something went wrong",
  },
};

export function StatusOrb({ status, level }: { status: Status; level: number }) {
  const meta = META[status];
  const animated = status !== "IDLE" && status !== "ERROR";
  const bars = 9;

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative flex h-44 w-44 items-center justify-center">
        <div
          className={`absolute inset-0 rounded-full ${meta.dot} opacity-20 ${animated ? "animate-halo" : ""}`}
        />
        <div
          className={`absolute inset-6 rounded-full border border-border/60 bg-card/60 backdrop-blur-xl ${meta.ring}`}
        />
        <div className="relative flex h-16 items-end gap-1.5">
          {Array.from({ length: bars }).map((_, i) => {
            const center = 1 - Math.abs(i - (bars - 1) / 2) / bars;
            const base = status === "SPEAKING" ? 0.85 : status === "LISTENING" ? 0.3 + level : 0.2;
            return (
              <span
                key={i}
                className={`w-1.5 origin-bottom rounded-full ${meta.dot}`}
                style={{
                  height: `${Math.max(8, Math.min(56, 56 * base * (0.45 + center)))}px`,
                  animation: animated
                    ? `bar-bounce ${0.7 + (i % 4) * 0.16}s ease-in-out ${i * 0.06}s infinite`
                    : undefined,
                  opacity: animated ? 1 : 0.4,
                }}
              />
            );
          })}
        </div>
      </div>

      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-2.5">
          <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} />
          <span
            className={`font-display text-2xl tracking-[0.22em] uppercase sm:text-3xl ${meta.text}`}
          >
            {meta.label}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{meta.hint}</p>
      </div>
    </div>
  );
}
