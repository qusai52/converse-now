import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Mic, MicOff, Square, Trash2, SendHorizonal } from "lucide-react";
import { useConverso } from "@/hooks/useConverso";
import { StatusOrb } from "@/components/StatusOrb";
import { Transcript } from "@/components/Transcript";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Converso AI — Talk naturally. Interrupt anytime." },
      {
        name: "description",
        content:
          "Converso AI is a real-time browser voice assistant with true barge-in: interrupt mid-sentence and it stops instantly, cancels the request and answers your new question.",
      },
      { property: "og:title", content: "Converso AI — Talk naturally. Interrupt anytime." },
      {
        property: "og:description",
        content:
          "A real-time voice assistant with genuine interruption: audio stops, requests cancel, and your new question is answered right away.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const {
    status,
    turns,
    interim,
    error,
    active,
    level,
    startSession,
    stopSession,
    interruptNow,
    clearConversation,
    sendText,
  } = useConverso();
  const [typed, setTyped] = useState("");

  const busy = status === "SPEAKING" || status === "THINKING";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-10 px-5 py-12">
      <header className="text-center">
        <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
          Converso<span className="text-primary"> AI</span>
        </h1>
        <p className="mt-2 text-sm tracking-[0.18em] text-muted-foreground uppercase">
          Talk naturally. Interrupt anytime.
        </p>
      </header>

      <section className="flex flex-col items-center gap-8">
        <StatusOrb status={status} level={level} />

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => (active ? stopSession() : void startSession())}
            className={`inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium transition-all ${
              active
                ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                : "bg-primary text-primary-foreground hover:opacity-90"
            }`}
          >
            {active ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            {active ? "End session" : "Start talking"}
          </button>

          <button
            onClick={interruptNow}
            disabled={!busy}
            className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary/60 disabled:opacity-35"
          >
            <Square className="h-3.5 w-3.5" />
            Interrupt
          </button>

          <button
            onClick={clearConversation}
            className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary/60"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Reset
          </button>
        </div>

        {error && (
          <p className="rounded-xl bg-destructive/15 px-4 py-2 text-sm text-destructive">{error}</p>
        )}
      </section>

      <Transcript turns={turns} interim={interim} />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const text = typed.trim();
          if (!text) return;
          setTyped("");
          void sendText(text);
        }}
        className="flex items-center gap-2"
      >
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder="Or type a message…"
          className="flex-1 rounded-full border border-border bg-card/60 px-5 py-3 text-sm outline-none placeholder:text-muted-foreground focus:border-ring"
        />
        <button
          type="submit"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90"
          aria-label="Send message"
        >
          <SendHorizonal className="h-4 w-4" />
        </button>
      </form>

      <p className="pb-6 text-center text-xs text-muted-foreground">
        Speech recognition runs in your browser; replies and voice are generated server-side.
        Interrupting stops playback, cancels the live request and discards its remaining output.
      </p>
    </main>
  );
}
