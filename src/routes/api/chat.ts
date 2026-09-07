import { createFileRoute } from "@tanstack/react-router";

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

const SYSTEM_PROMPT =
  "You are Converso, a friendly real-time voice assistant. Answer in a natural, spoken style. " +
  "Keep answers concise (2-5 sentences) unless the user explicitly asks for a detailed explanation. " +
  "Never use markdown, bullet points, emoji or special formatting — your text is read aloud.";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) {
          return new Response(JSON.stringify({ error: "Missing AI credentials" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        let body: { messages?: ChatMessage[] };
        try {
          body = (await request.json()) as { messages?: ChatMessage[] };
        } catch {
          return new Response(JSON.stringify({ error: "Invalid request body" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const messages = (body.messages ?? [])
          .filter((m) => typeof m?.content === "string" && m.content.trim().length > 0)
          .slice(-20);

        if (messages.length === 0) {
          return new Response(JSON.stringify({ error: "No messages provided" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        try {
          const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3.7-flash",
              stream: true,
              messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
            }),
            signal: request.signal,
          });

          if (!upstream.ok || !upstream.body) {
            const detail = await upstream.text().catch(() => "");
            return new Response(
              JSON.stringify({
                error:
                  upstream.status === 429
                    ? "Rate limit reached, please wait a moment."
                    : upstream.status === 402
                      ? "AI credits exhausted for this workspace."
                      : `AI request failed (${upstream.status}). ${detail.slice(0, 200)}`,
              }),
              { status: upstream.status, headers: { "Content-Type": "application/json" } },
            );
          }

          return new Response(upstream.body, {
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
            },
          });
        } catch (err) {
          if (request.signal.aborted) return new Response(null, { status: 499 });
          throw err;
        }
      },
    },
  },
});
